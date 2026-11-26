#!/usr/bin/env bash
# Hook "Stop" do Claude Code: quando o código mudou desde a última verificação aprovada,
# roda os testes (npm test) e a auditoria de segurança (npm run test:seguranca).
# Se algo falhar, bloqueia o fim da resposta e devolve um relatório categorizado
# (área afetada, gravidade, o que a falha causa e como corrigir) para o Claude corrigir.
# Depois de 3 bloqueios seguidos, libera e avisa o usuário (evita loop infinito).
set -u
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

MARCA=.claude/.verificado-em
TENTATIVAS=.claude/.verificacao-tentativas
VIGIADOS=(src tests scripts prisma/schema.prisma prisma/migrations next.config.ts package.json)

escapar() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(s)))'; }

# Área do sistema coberta por cada arquivo de teste e o que uma falha ali significa.
area_do_teste() {
  case "$1" in
    *sobreposicao*)       echo "Agenda · regra de horários|Dois clientes podem acabar marcados no mesmo horário com o mesmo barbeiro, ou horários livres podem ser recusados." ;;
    *validacao*)          echo "Validação de dados|Dados inválidos (telefone, e-mail, preço, data) podem ser salvos, ou dados corretos recusados; mensagens de erro podem sair erradas." ;;
    *servicos.test*)      echo "Regras de negócio (agendamentos, exclusões)|Conflitos de horário, barbeiro inativo recebendo agendamento ou exclusão de cadastros em uso podem passar sem bloqueio." ;;
    *usuarios*)           echo "Usuários e senhas|Pode ser possível ficar sem nenhum admin, um admin se trancar para fora, senhas serem salvas incorretamente ou sessões não caírem após troca de senha." ;;
    *dashboard*)          echo "Dashboard|Os números de receita, clientes novos/recorrentes, cancelamentos ou clientes sumidos podem estar errados." ;;
    *permissoes*)         echo "Permissões por perfil|A recepção pode ganhar acesso a algo restrito (ou o admin perder acesso) — risco de segurança." ;;
    *limite-login*)       echo "Proteção contra força bruta|O bloqueio após senhas erradas pode não funcionar, permitindo adivinhar senhas." ;;
    *senha.test*)         echo "Criptografia de senha|Senhas podem ser guardadas de forma insegura ou o login pode falhar para senhas corretas." ;;
    *rotas-protegidas*)   echo "Proteção das rotas da API|Alguma rota da API pode estar aceitando requisições sem verificar login/permissão — risco de invasão." ;;
    *)                    echo "Outros|Veja o detalhe do teste abaixo." ;;
  esac
}

cat >/dev/null # consome o JSON de entrada do hook

existentes=(); for v in "${VIGIADOS[@]}"; do [ -e "$v" ] && existentes+=("$v"); done
if [ -f "$MARCA" ] && [ -z "$(find "${existentes[@]}" -type f -newer "$MARCA" -not -path '*/node_modules/*' 2>/dev/null | head -1)" ]; then
  exit 0 # nada mudou desde a última verificação aprovada
fi

saida_testes=$(npm test --silent 2>&1); st_testes=$?
saida_seg=$(npm run test:seguranca --silent 2>&1); st_seg=$?

if [ $st_testes -eq 0 ] && [ $st_seg -eq 0 ]; then
  touch "$MARCA"; rm -f "$TENTATIVAS"
  resumo_testes=$(printf '%s\n' "$saida_testes" | grep -E "Tests +[0-9]" | tail -1 | sed 's/^ *//')
  resumo_seg=$(printf '%s\n' "$saida_seg" | grep -E "^\[seguranca\]" | tail -1)
  msg="Verificação automática: ${resumo_testes:-testes ok} · ${resumo_seg:-auditoria ok}"
  printf '{"systemMessage":%s}\n' "$(printf '%s' "$msg" | escapar)"
  exit 0
fi

n=$(( $(cat "$TENTATIVAS" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$TENTATIVAS"
relato=""

if [ $st_testes -ne 0 ]; then
  relato+="######## TESTES AUTOMÁTICOS (npm test) FALHARAM ########
$(printf '%s\n' "$saida_testes" | grep -E "Tests +[0-9]" | tail -1 | sed 's/^ */Resultado: /')
"
  arquivos=$(printf '%s\n' "$saida_testes" | grep -oE "FAIL +tests/[^ >]+" | awk '{print $2}' | sort -u)
  i=0
  for arq in $arquivos; do
    i=$((i + 1))
    IFS='|' read -r area efeito <<<"$(area_do_teste "$arq")"
    casos=$(printf '%s\n' "$saida_testes" | grep -F "FAIL" | grep -F "$arq >" | sed -E "s|.*$arq > ||" | sort -u | sed 's/^/     - /')
    # Detalhe específico deste arquivo: linhas após "FAIL <arquivo> >" até o próximo separador do Vitest.
    detalhe=$(printf '%s\n' "$saida_testes" | awk -v f="$arq >" '
      index($0, "FAIL") && index($0, f) { p = 1; c = 0; next }
      p && /⎯/ { p = 0 }
      p && NF && c < 10 { sub(/^ +/, ""); print "     " $0; c++ }')
    relato+="
$i. Área: $area   (arquivo: $arq)
   O que isso causa: $efeito
   Casos que falharam:
$casos
   Detalhe:
$detalhe
"
  done
  [ -z "$arquivos" ] && relato+="$(printf '%s\n' "$saida_testes" | tail -25)
"
fi

if [ $st_seg -ne 0 ]; then
  if printf '%s\n' "$saida_seg" | grep -q "^Resumo por categoria"; then
    relato+="
######## AUDITORIA DE SEGURANÇA (npm run test:seguranca) FALHOU ########
$(printf '%s\n' "$saida_seg" | sed -n '/^Resumo por categoria/,$p' | head -150)
"
  else
    relato+="
######## AUDITORIA DE SEGURANÇA NÃO CONSEGUIU RODAR ########
$(printf '%s\n' "$saida_seg" | tail -20)
"
  fi
fi

if [ "$n" -ge 3 ]; then
  rm -f "$TENTATIVAS"
  printf '{"systemMessage":%s}\n' "$(printf 'ATENÇÃO: a verificação automática continua falhando após 3 tentativas de correção. Rode npm test e npm run test:seguranca para ver os detalhes.\n%s' "$relato" | escapar)"
  exit 0
fi

printf '{"decision":"block","reason":%s}\n' "$(printf 'A verificação automática falhou (tentativa %s de 3). Corrija antes de encerrar.\n%s' "$n" "$relato" | escapar)"
exit 0
