import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SeletorStatus } from "@/components/seletor-status";
import { Cabecalho, Cartao, Carregando, LinkBotao, Vazio } from "@/components/ui";
import { formatarDataLonga, formatarHora, paraInputData } from "@/lib/datas";
import { formatarPreco } from "@/lib/dinheiro";
import { prisma } from "@/lib/prisma";
import * as agendamentos from "@/lib/services/agendamentos";
import { pode } from "@/lib/permissoes";
import { exigirPagina } from "@/lib/sessao";
import type { Status } from "@/lib/validacao";

export default function HojePage() {
  return (
    <Suspense
      fallback={
        <>
          <Cabecalho titulo="Agenda de hoje" />
          <Carregando />
        </>
      }
    >
      <Painel />
    </Suspense>
  );
}

async function Painel() {
  await connection();
  const eu = await exigirPagina("agendamentos");
  const agora = new Date();
  const hoje = paraInputData(agora);
  const [itens, barbeirosAtivos] = await Promise.all([
    agendamentos.listar({ data: hoje }),
    prisma.barbeiro.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  // Colunas: todos os barbeiros ativos + inativos que ainda tenham horário hoje.
  const colunas = new Map<number, { nome: string; inativo: boolean; itens: typeof itens }>();
  for (const b of barbeirosAtivos) colunas.set(b.id, { nome: b.nome, inativo: false, itens: [] });
  for (const a of itens) {
    if (!colunas.has(a.barbeiro.id)) colunas.set(a.barbeiro.id, { nome: a.barbeiro.nome, inativo: true, itens: [] });
    colunas.get(a.barbeiro.id)!.itens.push(a);
  }

  const concluidos = itens.filter((a) => a.status === "CONCLUIDO");
  const kpis = [
    { rotulo: "Atendimentos", valor: String(itens.filter((a) => a.status !== "CANCELADO").length), cor: "border-t-azul" },
    { rotulo: "Concluídos", valor: String(concluidos.length), cor: "border-t-azul" },
    ...(pode(eu.perfil, "faturamento", "ler")
      ? [
          {
            rotulo: "Faturado",
            valor: formatarPreco(concluidos.reduce((soma, a) => soma + a.servico.precoCentavos, 0)),
            cor: "border-t-verm",
          },
        ]
      : []),
  ];
  const pendentesAtrasados = itens.filter((a) => a.status === "AGENDADO" && a.fim < agora).length;

  return (
    <>
      <Cabecalho
        titulo="Agenda de hoje"
        subtitulo={formatarDataLonga(agora)}
        acao={<LinkBotao href={`/agendamentos/novo?data=${hoje}`}>Novo agendamento</LinkBotao>}
      />

      <dl className={`mb-8 grid gap-3 sm:gap-4 ${kpis.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {kpis.map((k) => (
          <Cartao key={k.rotulo} className={`border-t-[3px] px-4 py-3 sm:px-5 sm:py-4 ${k.cor}`}>
            <dt className="text-[10px] font-semibold tracking-[0.14em] text-sub uppercase sm:text-[11px]">{k.rotulo}</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums sm:text-[32px]">{k.valor}</dd>
          </Cartao>
        ))}
      </dl>

      {pendentesAtrasados > 0 && (
        <p className="mb-6 border-l-4 border-azul bg-destaque px-4 py-3 text-sm">
          {pendentesAtrasados === 1
            ? "1 atendimento já terminou e ainda está como “Agendado”."
            : `${pendentesAtrasados} atendimentos já terminaram e ainda estão como “Agendado”.`}{" "}
          Atualize o status abaixo.
        </p>
      )}

      {colunas.size === 0 ? (
        <Vazio>
          Nenhum barbeiro ativo.{" "}
          <Link href="/barbeiros/novo" className="text-azul not-italic underline">
            Cadastre um barbeiro
          </Link>
          .
        </Vazio>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...colunas].map(([id, col]) => (
            <Cartao key={id}>
              <div className="flex items-center justify-between border-b border-dashed border-linha px-4 py-3">
                <h2 className="font-serif text-xl">
                  {col.nome}
                  {col.inativo && <span className="ml-2 font-sans text-xs text-sub">(inativo)</span>}
                </h2>
                {!col.inativo && (
                  <Link
                    href={`/agendamentos/novo?barbeiroId=${id}&data=${hoje}`}
                    className="text-xs font-semibold tracking-[0.12em] text-verm uppercase hover:underline"
                    aria-label={`Agendar com ${col.nome}`}
                  >
                    + Agendar
                  </Link>
                )}
              </div>
              {col.itens.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-sub italic">Agenda livre</p>
              ) : (
                <ul className="divide-y divide-dashed divide-linha">
                  {col.itens.map((a) => {
                    const emAndamento = a.status === "AGENDADO" && a.inicio <= agora && agora < a.fim;
                    const cancelado = a.status === "CANCELADO";
                    return (
                      <li
                        key={a.id}
                        className={`flex items-center gap-3 px-4 py-3 ${emAndamento ? "bg-destaque" : ""}`}
                        aria-current={emAndamento ? "time" : undefined}
                      >
                        <span className={`w-14 shrink-0 font-serif text-xl text-azul tabular-nums ${cancelado ? "opacity-50" : ""}`}>
                          {formatarHora(a.inicio)}
                        </span>
                        <div className={`min-w-0 flex-1 ${cancelado ? "opacity-60" : ""}`}>
                          <Link href={`/agendamentos/${a.id}/editar`} className="block truncate text-sm font-medium hover:underline">
                            {a.cliente.nome}
                          </Link>
                          <span className="text-xs text-sub">
                            {a.servico.nome} · até {formatarHora(a.fim)}
                            {emAndamento && <strong className="ml-1 font-semibold text-verm">· agora</strong>}
                          </span>
                        </div>
                        <SeletorStatus key={`${a.id}-${a.status}`} id={a.id} status={a.status as Status} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Cartao>
          ))}
        </div>
      )}
    </>
  );
}
