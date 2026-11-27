export const PERFIS = ["ADMIN", "RECEPCAO", "CLIENTE"] as const;
export type Perfil = (typeof PERFIS)[number];

export const PERFIL_ROTULO: Record<Perfil, string> = { ADMIN: "Administrador", RECEPCAO: "Recepção", CLIENTE: "Cliente" };

export type Recurso =
  | "agendamentos"
  | "clientes"
  | "barbeiros"
  | "servicos"
  | "usuarios"
  | "dashboard"
  | "faturamento"
  /** Horário de funcionamento da agenda online. */
  | "horarios"
  /** Área do cliente: marcar e ver os próprios horários. */
  | "portal";
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
    horarios: TUDO,
    portal: [],
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
    horarios: [],
    portal: [],
  },
  // Cliente que se cadastrou pelo site: nada da gestão, só a própria área.
  CLIENTE: {
    agendamentos: [],
    clientes: [],
    barbeiros: [],
    servicos: [],
    usuarios: [],
    dashboard: [],
    faturamento: [],
    horarios: [],
    portal: TUDO,
  },
};

export function pode(perfil: Perfil, recurso: Recurso, acao: Acao): boolean {
  return MATRIZ[perfil]?.[recurso]?.includes(acao) ?? false;
}
