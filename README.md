# Barbearia

CRUD de barbearia: clientes, barbeiros, serviços e agendamentos.
Next.js 16 (App Router, Cache Components) + Prisma 6 + SQLite + Zod + Tailwind.

## Rodando

```bash
npm install
cp .env.example .env
# no .env, preencha AUTH_SECRET (o comando para gerar está no .env.example)
npx prisma migrate dev   # cria prisma/dev.db
npm run db:seed          # dados de exemplo (opcional)
npm run usuario:criar    # cria o primeiro administrador (senha digitada no terminal)
npm run dev              # http://localhost:3000 → /login
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes (Vitest), usando um banco separado `prisma/test.db` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Nova migração após alterar `prisma/schema.prisma` |
| `npm run db:seed` | Popula o banco (só roda se estiver vazio) |
| `npm run usuario:criar` | Cria um usuário pelo terminal (o primeiro é sempre administrador) |
| `npm run test:seguranca` | Auditoria de segurança (37 ataques) contra o servidor rodando em `localhost:3000` (outra URL: `PENTEST_URL=...`) |

## Regras de negócio

- **Sem sobreposição por barbeiro.** Barbeiros diferentes podem atender no mesmo horário. Horários colados (10:00–10:30 e 10:30–11:00) são permitidos. Agendamentos **cancelados** não ocupam horário, e reativá-los verifica conflito de novo.
- O **fim** do agendamento é `início + duração do serviço`, gravado no registro. Mudar a duração de um serviço não altera agendamentos já feitos.
- **Barbeiro inativo** não recebe novos agendamentos, mas mantém o histórico. Ao desativar, a tela avisa quantos agendamentos futuros ele ainda tem.
- **Não é possível excluir** cliente, barbeiro ou serviço que tenha agendamentos.
- Preços são guardados em centavos. Datas são guardadas em UTC e exibidas e digitadas no horário de Brasília (`src/lib/datas.ts`).

## Login e permissões

O login usa e-mail e senha, com Auth.js v5 (beta, versão fixada) e sessão JWT de 12 horas.

| | Administrador | Recepção |
|---|---|---|
| Agenda e agendamentos | ver e editar | ver e editar |
| Clientes | ver e editar | não (só escolhe um cliente já cadastrado ao agendar) |
| Barbeiros e serviços | ver e editar | só ver |
| Faturamento, Dashboard e Usuários | sim | não |

- As permissões ficam todas em `src/lib/permissoes.ts`. Toda página e rota de API checa permissão com `exigirPagina` / `exigirUsuario` (`src/lib/sessao.ts`), que **conferem no banco** se o usuário está ativo. Desativar alguém corta o acesso na hora. O `src/proxy.ts` só redireciona quem não está logado.
- Senhas guardadas com scrypt. Depois de 5 erros em 15 minutos, o login daquele e-mail fica bloqueado; o contador fica em memória e zera quando o servidor reinicia.
- Um admin não pode se desativar, se rebaixar nem se excluir, e o sistema sempre mantém pelo menos um admin ativo.

## Dashboard (só administrador)

Períodos de 7, 30 ou 90 dias, comparados ao período anterior de mesmo tamanho: receita, clientes novos e recorrentes, taxa de cancelamento, serviços mais vendidos e clientes sumidos (sem visita há mais de 30 dias e sem horário marcado).
A receita usa o **preço atual** do serviço, porque o preço não é gravado no agendamento.

## Estrutura

```
prisma/schema.prisma        modelos Cliente, Barbeiro, Servico, Agendamento
src/lib/validacao.ts        schemas Zod (API e formulários)
src/lib/services/*.ts       regras de negócio e acesso a dados
src/lib/api.ts              converte erros em HTTP 400/404/409
src/app/api/**/route.ts     API REST
src/app/**/page.tsx         telas
src/components/             formulário, tabela, botões
tests/                      Vitest
```

## API

| Método | Rota | |
|---|---|---|
| GET, POST | `/api/{clientes,barbeiros,servicos,agendamentos}` | listar / criar |
| GET, PUT, DELETE | `/api/{entidade}/{id}` | buscar / atualizar / excluir |
| PATCH | `/api/agendamentos/{id}` | `{ "status": "AGENDADO" \| "CONCLUIDO" \| "CANCELADO" }` |
| GET | `/api/agendamentos?barbeiroId=1&data=2026-12-01` | filtros |
| GET | `/api/barbeiros?ativos=true` | só barbeiros ativos |
| GET | `/api/barbeiros/{id}/agendamentos-futuros` | `{ total }` |

Erros respondem `{ "erro": "...", "campos": { "campo": ["mensagem"] } }`.

## Auditoria de segurança automática

`npm run test:seguranca` ataca o servidor rodando como um invasor faria:
- acesso sem login e com token forjado;
- recepção tentando ações de admin;
- vazamento de dados (telefone, hash de senha);
- XSS, SQL injection, CSRF e redirecionamento aberto;
- descoberta de e-mails cadastrados, força bruta e sessões após troca de senha;
- headers de segurança e arquivos expostos.

Ela cria usuários e dados temporários com prefixo `pentest-` e senha aleatória, e apaga tudo no final. Com o servidor fora do ar, a auditoria é pulada.

**Como ler o resultado:** primeiro aparece um resumo por categoria, baseado no OWASP Top 10: controle de acesso, autenticação, injeção, CSRF, configuração etc. Depois vem cada falha, **da mais grave para a menos grave**, com:
- **gravidade** (crítica, alta, média ou baixa);
- **o que foi testado**, ou seja, o ataque tentado;
- **o que isso causa**, isto é, o que um invasor conseguiria fazer de verdade;
- **como corrigir**, apontando o arquivo onde olhar;
- **evidência**, a resposta que o servidor deu.

As explicações ficam em `scripts/seguranca/catalogo.ts`. Para ver como fica uma falha sem quebrar nada, rode `npx tsx scripts/seguranca/pentest.ts --simular-falha=recepcao-api,header-nosniff`.

Quando um teste de `npm test` falha, o hook também diz **qual área do sistema** quebrou (agenda, permissões, dashboard, senhas…), o que isso afeta, os casos que falharam e o detalhe de cada um.

**Roda sozinha a cada mudança feita pelo Claude Code:** o hook `Stop` em `.claude/settings.json` chama `scripts/hooks/verificar-mudancas.sh`. Ao fim de cada resposta em que `src/`, `tests/`, `scripts/`, o schema, as migrações, `next.config.ts` ou `package.json` mudaram, ele roda `npm test` e `npm run test:seguranca`. Se algo falhar, o Claude precisa corrigir antes de encerrar a resposta. Depois de 3 tentativas sem sucesso, ele libera e avisa. Para ver ou desligar o hook, use `/hooks` no Claude Code.

## Testar em produção com HTTPS (local)

Simula o site publicado: build de produção atrás de um proxy HTTPS, como Nginx, Caddy ou Vercel fariam.

```bash
# 1. certificado local (uma vez; fica em .certs/, fora do git)
mkdir -p .certs && openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -keyout .certs/localhost-key.pem -out .certs/localhost.pem -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" -addext "basicConstraints=critical,CA:TRUE"

# 2. app em produção na porta 3100, avisando o endereço público
npm run build
AUTH_URL=https://localhost:3443 npx next start -p 3100

# 3. em outro terminal: proxy HTTPS → https://localhost:3443
npm run start:https

# 4. auditoria de segurança pelo HTTPS
PENTEST_URL=https://localhost:3443 NODE_EXTRA_CA_CERTS=.certs/localhost.pem npm run test:seguranca
```

O navegador vai avisar que o certificado não é confiável, porque ele é autoassinado. Aceite o aviso só para esse teste local.

**Ao publicar de verdade:**
- **`AUTH_URL`:** defina com o endereço público (ex.: `https://barbearia.com.br`). Sem ele, depois do login o Auth.js manda o usuário para a porta interna do servidor.
- **Headers do proxy:** o proxy precisa repassar `X-Forwarded-Proto` e `X-Forwarded-Host`. A checagem anti-CSRF (`src/proxy.ts`) usa esses headers para saber o endereço público; sem eles, **todo salvamento é recusado com 403**.
- **Cookie `Secure`:** com HTTPS, o cookie de login ganha `Secure` e o prefixo `__Secure-` automaticamente. O proxy local também envia HSTS, que obriga o navegador a usar sempre HTTPS naquele endereço.

## Publicar no Railway

O repositório já tem tudo pronto. O `railway.json` define o build e o start, e o comando `npm run start:producao` aplica as migrações, cria o admin inicial (se pedido) e sobe o servidor.

1. **Criar o serviço:** em [railway.com](https://railway.com), clique em **New Project → Deploy from GitHub repo** e escolha este repositório.
2. **Criar o Volume** (é o que guarda o banco): no serviço, **Settings → Volumes → Add Volume**, com mount path **`/data`**.
3. **Variáveis** (aba **Variables**):

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | `file:/data/barbearia.db` |
   | `AUTH_SECRET` | gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `DADOS_CHAVE` | **obrigatória.** Cifra nomes, telefones e e-mails no banco. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` e **guarde uma cópia fora do Railway**: sem ela os dados não podem ser lidos |
   | `AUTH_URL` | o endereço público, ex.: `https://barbeariagrud-production.up.railway.app` |
   | `ADMIN_INICIAL_EMAIL` | *(opcional)* e-mail do primeiro administrador |
   | `ADMIN_INICIAL_SENHA` | *(opcional)* senha forte, com pelo menos 8 caracteres |
   | `RESEND_API_KEY` **ou** `BREVO_API_KEY` | chave do provedor que envia o e-mail de confirmação |
   | `EMAIL_REMETENTE` | remetente, ex.: `Barbearia <nao-responda@seudominio.com>` |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | *(opcional)* liga o botão "Continuar com Google" |

4. **Gerar o domínio:** em **Settings → Networking → Generate Domain**, copie o endereço para o `AUTH_URL`. O Railway refaz o deploy sozinho a cada mudança de variável.
5. **Primeiro acesso:** com o banco vazio, clique em **Criar conta** na tela de login (ou entre com Google): a primeira conta vira administradora. Faça isso logo depois do deploy, antes de divulgar o link. Se preferir o admin inicial por variável, entre com ele e depois **apague `ADMIN_INICIAL_SENHA`**.

## Cadastro, confirmação de e-mail e Google

- **Com ou sem confirmação:** sem provedor de e-mail configurado (`RESEND_API_KEY`/`BREVO_API_KEY`), o cadastro **não pede confirmação**: a pessoa cria a conta e já entra (bom para site de demonstração). Nesse modo, a conta **não herda** o histórico de um cliente que a barbearia já tinha com o mesmo e-mail, já que ninguém provou ser dono dele. Ao configurar um provedor, a confirmação passa a ser exigida automaticamente.
- **Criar conta** (`/cadastro`): nome, e-mail e senha. O servidor manda um link de confirmação (vale 24 h, uso único, só o hash fica no banco). Sem confirmar, o login mostra "Falta confirmar seu e-mail" e reenvia o link (no máximo 1 por minuto).
- **Quem ganha acesso:** a **primeira** conta do sistema vira **administrador**. As seguintes são de **clientes**: entram assim que confirmam o e-mail, mas só veem a área do cliente. Contas da equipe (Recepção/Admin) continuam sendo criadas por um admin em **Usuários → Novo**.
- **E-mail:** o Railway bloqueia SMTP no plano Hobby, então o envio é por API HTTPS. Com **Resend**, só dá para enviar a qualquer pessoa depois de verificar um domínio seu; sem domínio, ele só envia para o e-mail da própria conta Resend. O **Brevo** permite verificar só um endereço remetente. Sem chave configurada, o link aparece no log do servidor (`[email] nenhum provedor configurado`).
- **Google:** em [Google Cloud Console → Credenciais](https://console.cloud.google.com/apis/credentials), crie um *ID do cliente OAuth* do tipo **Aplicativo da Web** com o URI de redirecionamento `https://SEU-DOMINIO/api/auth/callback/google`. Coloque o ID e a chave secreta em `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`. Se o e-mail do Google já tiver conta, ela é vinculada; se a conta existia mas nunca foi confirmada, a senha antiga é descartada, porque quem provou ser dono do e-mail foi o Google.

O HTTPS e os headers `X-Forwarded-*` já vêm do Railway. Cada `git push` na `main` gera um deploy novo, e o banco no Volume é mantido.

> **Importante:** use **uma única réplica**. O SQLite fica num disco só, e o limite de tentativas de login fica na memória do servidor.

## Criptografia dos dados pessoais

Quem copiar o arquivo do banco (um backup vazado, acesso indevido ao volume) não lê os dados pessoais: eles são gravados cifrados com **AES-256-GCM**.

| Onde | Campos cifrados |
|---|---|
| Clientes | nome, telefone, e-mail |
| Usuários | nome, e-mail |
| Barbeiros | telefone |
| Agendamentos | observação |

- **Já protegidos de outro jeito:** senhas (hash scrypt), links de confirmação (só o SHA-256 fica no banco) e sessão (cookie JWE cifrado pelo Auth.js, `HttpOnly` e `Secure`).
- **Em trânsito:** HTTPS do Railway e HSTS, que faz o navegador nunca mais abrir o site sem criptografia.
- **Logs:** e-mails aparecem mascarados (`an***@exemplo.com`).
- **Ficam em texto puro** (não são dados pessoais e aparecem para os clientes): nome dos barbeiros, serviços, preços, horários e status.
- **Como funciona:** `src/lib/prisma.ts` cifra ao gravar e decifra ao ler, então o resto do código usa texto normal. O login acha a conta por um índice HMAC do e-mail (`emailHash`), sem guardar o e-mail em texto puro. Como o banco não consegue filtrar nem ordenar por campo cifrado, as listas são ordenadas depois de decifrar.
- **Bancos antigos:** a cada start, `scripts/cifrar-dados.ts` cifra o que ainda estiver em texto puro e roda `VACUUM`, para não sobrar resto no arquivo. Ele **barra o deploy** se a `DADOS_CHAVE` estiver faltando ou não abrir os dados já cifrados. Nesse caso, o Railway mantém a versão anterior no ar.
- **Nunca troque a `DADOS_CHAVE`** depois de usar: os dados cifrados com a chave antiga deixam de abrir.

## Área do cliente (agenda online)

Quem se cadastra pelo site tem o perfil **Cliente** e vê só três telas:

- **Completar cadastro** (`/completar-cadastro`): pede o telefone no primeiro acesso. Se a barbearia já tinha um cliente com o mesmo e-mail, a conta é ligada a ele, e o histórico aparece.
- **Agendar** (`/agendar`): escolhe serviço, barbeiro e dia, e aparecem só os horários livres. Um toque marca o horário.
- **Meus horários** (`/meus-agendamentos`): próximos horários (com **Cancelar horário**) e histórico.

Regras, todas em `src/lib/horario-funcionamento.ts`:

| Regra | Padrão |
|---|---|
| Dias de atendimento | segunda a sábado |
| Horário | 09:00 às 19:00 (o serviço precisa terminar até o fechamento) |
| Intervalo entre horários | 30 minutos |
| Antecedência mínima | 30 minutos |
| Até quantos dias à frente | 30 |
| Horários futuros por cliente | no máximo 3 |

Segurança: o cliente não acessa nenhuma tela nem API da equipe (recebe 403, ou é levado para "Meus horários"). Ele só marca e cancela em nome de si mesmo, porque o id do cliente vem da sessão e nunca do formulário. A mensagem de horário ocupado também não revela quem ocupa o horário. A equipe vê os agendamentos feitos pelo site na agenda normal.

## Problema conhecido no `npm run dev`

O loader do Tailwind no Turbopack às vezes **não recompila o CSS** quando você usa uma classe nova: a classe simplesmente não tem efeito. Para resolver, pare o servidor, apague a pasta `.next/dev` (é só cache) e rode `npm run dev` de novo. O `npm run build` não tem esse problema.

> **Antes de publicar na internet:** use HTTPS e um `AUTH_SECRET` próprio. Se houver mais de uma instância do servidor, troque o limite de tentativas de login, que fica em memória, por um armazenamento compartilhado (por exemplo, Redis).
