export const PERFIS = ["ADMIN", "RECEPCAO"] as const;
export type Perfil = (typeof PERFIS)[number];

export const PERFIL_ROTULO: Record<Perfil, string> = { ADMIN: "Administrador", RECEPCAO: "Recepção" };

export type Recurso =
  | "agendamentos"
  | "clientes"
  | "barbeiros"
  | "servicos"
  | "usuarios"
  | "dashboard"
  | "faturamento";
export type Acao = "ler" | "escrever";

const TUDO: Acao[] = ["ler", "escrever"];

/** Única fonte de verdade sobre quem pode o quê. API, páginas e menus consultam esta matriz. */
const MATRIZ: Record<Perfil, Record<Recurso, Acao[]>> = {
  ADMIN: {
    agendamentos: TUDO,
    clientes: TUDO,
    barbeiros: TUDO,
    servicos: TUDO,
    usuarios: TUDO,
    dashboard: TUDO,
    faturamento: TUDO,
  },
  RECEPCAO: {
    agendamentos: TUDO,
    // Sem acesso à tela/API de clientes; ao agendar, ainda escolhe entre os clientes já cadastrados.
    clientes: [],
    barbeiros: ["ler"],
    servicos: ["ler"],
    usuarios: [],
    dashboard: [],
    faturamento: [],
  },
};

export function pode(perfil: Perfil, recurso: Recurso, acao: Acao): boolean {
  return MATRIZ[perfil]?.[recurso]?.includes(acao) ?? false;
}
