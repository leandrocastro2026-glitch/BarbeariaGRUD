import { sair } from "@/app/acoes-auth";
import { pode, PERFIL_ROTULO, type Recurso } from "@/lib/permissoes";
import { usuarioAtual } from "@/lib/sessao";
import { Navegacao, type ItemNav } from "./navegacao";

const LINKS: (ItemNav & { recurso: Recurso })[] = [
  { href: "/", rotulo: "Hoje", recurso: "agendamentos" },
  { href: "/agendamentos", rotulo: "Agendamentos", recurso: "agendamentos" },
  { href: "/clientes", rotulo: "Clientes", recurso: "clientes" },
  { href: "/barbeiros", rotulo: "Barbeiros", recurso: "barbeiros" },
  { href: "/servicos", rotulo: "Serviços", recurso: "servicos" },
  { href: "/dashboard", rotulo: "Dashboard", recurso: "dashboard" },
  { href: "/usuarios", rotulo: "Usuários", recurso: "usuarios" },
];

/** Menu e usuário logado. Na tela de login (sem sessão) não renderiza nada. */
export async function CabecalhoUsuario() {
  const u = await usuarioAtual();
  if (!u) return null;
  const itens = LINKS.filter((l) => pode(u.perfil, l.recurso, "ler")).map(({ href, rotulo }) => ({ href, rotulo }));
  return (
    <>
      <Navegacao itens={itens} />
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <span className="block text-sm font-medium">{u.nome}</span>
          <span className="block text-[10px] font-semibold tracking-[0.14em] text-sub uppercase">{PERFIL_ROTULO[u.perfil]}</span>
        </div>
        <form action={sair}>
          <button
            type="submit"
            className="border-[1.5px] border-linha px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors hover:border-tinta"
          >
            Sair
          </button>
        </form>
      </div>
    </>
  );
}
