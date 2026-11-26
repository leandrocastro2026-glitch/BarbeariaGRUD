import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho, Carregando, LinkBotao, Tabela, Vazio, estiloBotao } from "@/components/ui";
import { formatarPreco } from "@/lib/dinheiro";
import { pode } from "@/lib/permissoes";
import * as servicos from "@/lib/services/servicos";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Serviços" };

export default function ServicosPage() {
  return (
    <>
      <Suspense
        fallback={
          <>
            <Cabecalho titulo="Serviços" />
            <Carregando />
          </>
        }
      >
        <Lista />
      </Suspense>
    </>
  );
}

async function Lista() {
  const eu = await exigirPagina("servicos");
  const podeEditar = pode(eu.perfil, "servicos", "escrever");
  const itens = await servicos.listar();
  const cabecalho = (
    <Cabecalho titulo="Serviços" acao={podeEditar && <LinkBotao href="/servicos/novo">Novo serviço</LinkBotao>} />
  );
  if (itens.length === 0)
    return (
      <>
        {cabecalho}
        <Vazio>Nenhum serviço cadastrado ainda.</Vazio>
      </>
    );
  return (
    <>
      {cabecalho}
      <Tabela cabecalhos={["Serviço", "Preço", "Duração", "Agendamentos", ""]}>
        {itens.map((s) => (
          <tr key={s.id} className="hover:bg-destaque/60">
            <td className="px-4 py-3 font-medium">{s.nome}</td>
            <td className="px-4 py-3 text-sub tabular-nums">{formatarPreco(s.precoCentavos)}</td>
            <td className="px-4 py-3 text-sub tabular-nums">{s.duracaoMin} min</td>
            <td className="px-4 py-3 text-sub tabular-nums">{s._count.agendamentos}</td>
            <td className="px-4 py-3">
              {podeEditar && (
                <div className="flex items-start justify-end gap-1">
                  <Link href={`/servicos/${s.id}/editar`} className={estiloBotao.link}>
                    Editar
                  </Link>
                  <BotaoExcluir url={`/api/servicos/${s.id}`} descricao={`o serviço ${s.nome}`} />
                </div>
              )}
            </td>
          </tr>
        ))}
      </Tabela>
    </>
  );
}
