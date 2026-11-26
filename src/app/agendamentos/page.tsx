import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoExcluir } from "@/components/botao-excluir";
import { SeletorStatus } from "@/components/seletor-status";
import { Cabecalho, Carregando, Tabela, Vazio, estiloBotao, estiloInput, estiloRotulo } from "@/components/ui";
import { formatarDataHora, formatarHora } from "@/lib/datas";
import { formatarPreco } from "@/lib/dinheiro";
import { ValidationError } from "@/lib/erros";
import { prisma } from "@/lib/prisma";
import * as agendamentos from "@/lib/services/agendamentos";
import type { Status } from "@/lib/validacao";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Agendamentos" };

type Busca = PageProps<"/agendamentos">["searchParams"];

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default function AgendamentosPage({ searchParams }: PageProps<"/agendamentos">) {
  return (
    <>
      <Cabecalho titulo="Agendamentos" />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: Busca }) {
  await exigirPagina("agendamentos");
  const busca = await searchParams;
  const barbeiroId = texto(busca.barbeiroId);
  const data = texto(busca.data);

  const barbeiros = await prisma.barbeiro.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true, ativo: true },
  });

  let itens: agendamentos.AgendamentoCompleto[] = [];
  let erroFiltro: string | null = null;
  try {
    itens = await agendamentos.listar({ barbeiroId, data });
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    erroFiltro = Object.values(e.campos ?? {}).flat()[0] ?? e.message;
  }

  const novoHref = `/agendamentos/novo?${new URLSearchParams({
    ...(barbeiroId && { barbeiroId }),
    ...(data && { data }),
  })}`;

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" aria-label="Filtros">
        <label className="space-y-1.5 text-sm">
          <span className={estiloRotulo}>Barbeiro</span>
          <select name="barbeiroId" defaultValue={barbeiroId} className={estiloInput}>
            <option value="">Todos</option>
            {barbeiros.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
                {b.ativo ? "" : " (inativo)"}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className={estiloRotulo}>Data</span>
          <input type="date" name="data" defaultValue={data} className={estiloInput} />
        </label>
        <button type="submit" className={estiloBotao.secundario}>
          Filtrar
        </button>
        {(barbeiroId || data) && (
          <Link href="/agendamentos" className={estiloBotao.link}>
            Limpar
          </Link>
        )}
        <Link href={novoHref} className={`${estiloBotao.primario} ml-auto`}>
          Novo agendamento
        </Link>
      </form>

      {erroFiltro ? (
        <p role="alert" className="text-sm text-verm">
          {erroFiltro}
        </p>
      ) : itens.length === 0 ? (
        <Vazio>Nenhum agendamento encontrado.</Vazio>
      ) : (
        <Tabela cabecalhos={["Quando", "Cliente", "Barbeiro", "Serviço", "Status", ""]}>
          {itens.map((a) => (
            <tr key={a.id} className={`hover:bg-destaque/60 ${a.status === "CANCELADO" ? "text-sub" : ""}`}>
              <td className="px-4 py-3 whitespace-nowrap tabular-nums text-azul">
                {formatarDataHora(a.inicio)}
                <span className="text-sub"> – {formatarHora(a.fim)}</span>
              </td>
              <td className="px-4 py-3 font-medium">
                {a.cliente.nome}
                {a.observacao && (
                  <span className="block text-xs font-normal text-sub" title={a.observacao}>
                    {a.observacao.length > 40 ? `${a.observacao.slice(0, 40)}…` : a.observacao}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{a.barbeiro.nome}</td>
              <td className="px-4 py-3">
                {a.servico.nome}
                <span className="block text-xs text-sub tabular-nums">{formatarPreco(a.servico.precoCentavos)}</span>
              </td>
              <td className="px-4 py-3">
                <SeletorStatus key={`${a.id}-${a.status}`} id={a.id} status={a.status as Status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-start justify-end gap-1">
                  <Link href={`/agendamentos/${a.id}/editar`} className={estiloBotao.link}>
                    Editar
                  </Link>
                  <BotaoExcluir
                    url={`/api/agendamentos/${a.id}`}
                    descricao={`o agendamento de ${a.cliente.nome} em ${formatarDataHora(a.inicio)}`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </Tabela>
      )}
    </div>
  );
}
