import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho, Carregando, LinkBotao, Selo, Tabela, Vazio, estiloBotao } from "@/components/ui";
import { pode } from "@/lib/permissoes";
import * as barbeiros from "@/lib/services/barbeiros";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Barbeiros" };

export default function BarbeirosPage() {
  return (
    <>
      <Suspense
        fallback={
          <>
            <Cabecalho titulo="Barbeiros" />
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
  const eu = await exigirPagina("barbeiros");
  const podeEditar = pode(eu.perfil, "barbeiros", "escrever");
  const itens = await barbeiros.listar();
  const cabecalho = (
    <Cabecalho titulo="Barbeiros" acao={podeEditar && <LinkBotao href="/barbeiros/novo">Novo barbeiro</LinkBotao>} />
  );
  if (itens.length === 0)
    return (
      <>
        {cabecalho}
        <Vazio>Nenhum barbeiro cadastrado ainda.</Vazio>
      </>
    );
  return (
    <>
      {cabecalho}
      <Tabela cabecalhos={["Nome", "Telefone", "Especialidade", "Situação", "Agendamentos", ""]}>
        {itens.map((b) => (
          <tr key={b.id} className={`hover:bg-destaque/60 ${b.ativo ? "" : "text-sub"}`}>
            <td className="px-4 py-3 font-medium">{b.nome}</td>
            <td className="px-4 py-3">{b.telefone}</td>
            <td className="px-4 py-3">{b.especialidade ?? "—"}</td>
            <td className="px-4 py-3">{b.ativo ? <Selo cor="verde">Ativo</Selo> : <Selo cor="cinza">Inativo</Selo>}</td>
            <td className="px-4 py-3 tabular-nums">
              <Link href={`/agendamentos?barbeiroId=${b.id}`} className="underline-offset-2 hover:underline">
                {b._count.agendamentos}
              </Link>
            </td>
            <td className="px-4 py-3">
              {podeEditar && (
                <div className="flex items-start justify-end gap-1">
                  <Link href={`/barbeiros/${b.id}/editar`} className={estiloBotao.link}>
                    Editar
                  </Link>
                  <BotaoExcluir url={`/api/barbeiros/${b.id}`} descricao={`o barbeiro ${b.nome}`} />
                </div>
              )}
            </td>
          </tr>
        ))}
      </Tabela>
    </>
  );
}
