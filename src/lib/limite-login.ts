/**
 * Limite de tentativas de login por e-mail, em memória.
 * Reinicia junto com o servidor — suficiente para uma instalação única/local.
 */
export function criarLimiteLogin({
  maxFalhas = 5,
  janelaMs = 15 * 60_000,
  relogio = Date.now,
}: { maxFalhas?: number; janelaMs?: number; relogio?: () => number } = {}) {
  const falhas = new Map<string, number[]>();
  const chave = (email: string) => email.trim().toLowerCase();

  const recentes = (email: string) => {
    const limiteInferior = relogio() - janelaMs;
    const lista = (falhas.get(chave(email)) ?? []).filter((t) => t > limiteInferior);
    if (lista.length) falhas.set(chave(email), lista);
    else falhas.delete(chave(email));
    return lista;
  };

  return {
    bloqueado: (email: string) => recentes(email).length >= maxFalhas,
    registrarFalha: (email: string) => {
      falhas.set(chave(email), [...recentes(email), relogio()]);
    },
    registrarSucesso: (email: string) => {
      falhas.delete(chave(email));
    },
  };
}

export const limiteLogin = criarLimiteLogin();
