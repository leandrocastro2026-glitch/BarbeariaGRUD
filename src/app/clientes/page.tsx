import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho, Carregando, LinkBotao, Tabela, Vazio, estiloBotao } from "@/components/ui";
import * as clientes from "@/lib/services/clientes";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <>
      <Cabecalho titulo="Clientes" acao={<LinkBotao href="/clientes/novo">Novo cliente</LinkBotao>} />
      <Suspense fallback={<Carregando />}>
        <Lista />
      </Suspense>
    </>
  );
}

async function Lista() {
  await connection();
  await exigirPagina("clientes");
  const itens = await clientes.listar();
  if (itens.length === 0) return <Vazio>Nenhum cliente cadastrado ainda.</Vazio>;
  return (
    <Tabela cabecalhos={["Nome", "Telefone", "E-mail", "Agendamentos", ""]}>
      {itens.map((c) => (
        <tr key={c.id} className="hover:bg-destaque/60">
          <td className="px-4 py-3 font-medium">{c.nome}</td>
          <td className="px-4 py-3 text-sub">{c.telefone}</td>
          <td className="px-4 py-3 text-sub">{c.email ?? "—"}</td>
          <td className="px-4 py-3 text-sub tabular-nums">{c._count.agendamentos}</td>
          <td className="px-4 py-3">
            <div className="flex items-start justify-end gap-1">
              <Link href={`/clientes/${c.id}/editar`} className={estiloBotao.link}>
                Editar
              </Link>
              <BotaoExcluir url={`/api/clientes/${c.id}`} descricao={`o cliente ${c.nome}`} />
            </div>
          </td>
        </tr>
      ))}
    </Tabela>
  );
}
