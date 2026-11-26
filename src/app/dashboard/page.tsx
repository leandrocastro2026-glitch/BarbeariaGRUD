import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecalho, Cartao, Carregando, Tabela, Vazio, estiloLinha } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { formatarPreco } from "@/lib/dinheiro";
import { PERIODOS, resumoDashboard, type Periodo } from "@/lib/services/dashboard";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Dashboard" };

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense
      fallback={
        <>
          <Cabecalho titulo="Dashboard" />
          <Carregando />
        </>
      }
    >
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}

async function Painel({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  await exigirPagina("dashboard");
  const { dias: bruto } = await searchParams;
  const dias = (PERIODOS.find((p) => String(p) === bruto) ?? 30) as Periodo;
  const r = await resumoDashboard({ dias });

  return (
    <>
      <Cabecalho titulo="Dashboard" subtitulo={`Últimos ${dias} dias, comparados aos ${dias} anteriores`} />

      <nav aria-label="Período" className="mb-6 flex">
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={`/dashboard?dias=${p}`}
            aria-current={p === dias ? "page" : undefined}
            className={`-ml-[1.5px] border-[1.5px] border-tinta px-4 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase first:ml-0 ${
              p === dias ? "bg-tinta text-cartao" : "bg-cartao hover:bg-destaque"
            }`}
          >
            {p} dias
          </Link>
        ))}
      </nav>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Receita r={r} />
        <Clientes r={r} />
        <Cancelamentos r={r} />
      </div>

      <section aria-labelledby="titulo-servicos" className="mb-8">
        <h2 id="titulo-servicos" className="mb-3 font-serif text-2xl">
          Serviços mais vendidos
        </h2>
        <Ranking r={r} />
      </section>

      <section aria-labelledby="titulo-sumidos">
        <h2 id="titulo-sumidos" className="font-serif text-2xl">
          Clientes sumidos
        </h2>
        <p className="mb-3 text-sm text-sub">Última visita há mais de 30 dias e nenhum horário marcado.</p>
        <Sumidos r={r} />
      </section>
    </>
  );
}

type R = Awaited<ReturnType<typeof resumoDashboard>>;

function Bloco({ rotulo, children, cor }: { rotulo: string; children: React.ReactNode; cor: string }) {
  return (
    <Cartao className={`border-t-[3px] px-5 py-4 ${cor}`}>
      <h3 className="text-[11px] font-semibold tracking-[0.14em] text-sub uppercase">{rotulo}</h3>
      {children}
    </Cartao>
  );
}

function Receita({ r }: { r: R }) {
  const atendimentos = r.servicos.reduce((s, x) => s + x.quantidade, 0);
  return (
    <Bloco rotulo="Receita" cor="border-t-verm">
      <p className="mt-1 font-serif text-[32px]">{formatarPreco(r.receitaCentavos)}</p>
      <p className="text-xs text-sub">
        {atendimentos} atendimento{atendimentos === 1 ? "" : "s"} concluído{atendimentos === 1 ? "" : "s"}
        {atendimentos > 0 && ` · ticket médio ${formatarPreco(Math.round(r.receitaCentavos / atendimentos))}`}
      </p>
    </Bloco>
  );
}

function Clientes({ r }: { r: R }) {
  const { atendidos, novos, recorrentes } = r.clientes;
  const partes = [
    { nome: "Novos", valor: novos, cor: "bg-serie-1" },
    { nome: "Recorrentes", valor: recorrentes, cor: "bg-serie-2" },
  ];
  return (
    <Bloco rotulo="Clientes atendidos" cor="border-t-azul">
      <p className="mt-1 font-serif text-[32px]">{atendidos}</p>
      {atendidos > 0 ? (
        <>
          {/* Barra segmentada fina: um todo dividido em partes; nomes e valores na legenda. */}
          <div
            role="img"
            aria-label={`${novos} novos e ${recorrentes} recorrentes`}
            className="mt-2 flex h-2 gap-[2px] overflow-hidden rounded-full"
          >
            {partes
              .filter((p) => p.valor > 0)
              .map((p) => (
                <div
                  key={p.nome}
                  className={`${p.cor} h-full`}
                  style={{ flexGrow: p.valor }}
                  title={`${p.nome}: ${p.valor} (${pct(p.valor / atendidos)})`}
                />
              ))}
          </div>
          <ul className="mt-2 flex gap-4 text-xs">
            {partes.map((p) => (
              <li key={p.nome} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2.5 rounded-full ${p.cor}`} />
                {p.nome} <strong className="font-semibold">{p.valor}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-sub">Nenhum atendimento concluído no período.</p>
      )}
    </Bloco>
  );
}

function Cancelamentos({ r }: { r: R }) {
  const { taxa, taxaAnterior, cancelados, total } = r.cancelamentos;
  const delta = Math.round((taxa - taxaAnterior) * 100);
  // Para cancelamentos, subir é ruim: a direção vem com seta + palavra, não só cor.
  const variacao =
    delta === 0
      ? { texto: "Igual ao período anterior", cor: "text-sub", seta: "→" }
      : delta > 0
        ? { texto: `${delta} p.p. a mais que antes (${pct(taxaAnterior)})`, cor: "text-verm", seta: "▲" }
        : { texto: `${-delta} p.p. a menos que antes (${pct(taxaAnterior)})`, cor: "text-verde", seta: "▼" };
  return (
    <Bloco rotulo="Taxa de cancelamento" cor="border-t-azul">
      <p className="mt-1 font-serif text-[32px]">{pct(taxa)}</p>
      <p className="text-xs text-sub">
        {cancelados} de {total} agendamento{total === 1 ? "" : "s"}
      </p>
      <p className={`mt-1 text-xs font-medium ${variacao.cor}`}>
        <span aria-hidden="true">{variacao.seta} </span>
        {variacao.texto}
      </p>
    </Bloco>
  );
}

function Ranking({ r }: { r: R }) {
  if (r.servicos.length === 0) return <Vazio>Nenhum atendimento concluído neste período.</Vazio>;
  const max = Math.max(...r.servicos.map((s) => s.quantidade));
  return (
    <Cartao className="px-5 py-4">
      <p className="mb-3 text-xs text-sub">Atendimentos concluídos por serviço</p>
      <ol className="space-y-3">
        {r.servicos.map((s) => (
          <li key={s.servicoId} className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate font-medium" title={s.nome}>
              {s.nome}
            </span>
            {/* Barra: cresce a partir da base (quadrada) com ponta arredondada de 4px. */}
            <span className="h-3.5" title={`${s.nome}: ${s.quantidade} · ${formatarPreco(s.receitaCentavos)}`}>
              <span
                className="block h-full rounded-r-[4px] bg-serie-1"
                style={{ width: `${Math.max((s.quantidade / max) * 100, 2)}%` }}
              />
            </span>
            <span className="text-right whitespace-nowrap tabular-nums">
              <strong className="font-semibold">{s.quantidade}</strong>
              <span className="text-sub"> · {formatarPreco(s.receitaCentavos)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Cartao>
  );
}

function Sumidos({ r }: { r: R }) {
  if (r.sumidos.length === 0) return <Vazio>Nenhum cliente sumido. A clientela está em dia.</Vazio>;
  return (
    <Tabela cabecalhos={["Cliente", "Telefone", "Última visita", "Sem vir há", ""]}>
      {r.sumidos.map((c) => (
        <tr key={c.id} className={estiloLinha}>
          <td className="px-4 py-3 font-medium">{c.nome}</td>
          <td className="px-4 py-3">{c.telefone}</td>
          <td className="px-4 py-3 tabular-nums">{formatarDataHora(c.ultimaVisita)}</td>
          <td className="px-4 py-3 tabular-nums">{c.diasSemVir} dias</td>
          <td className="px-4 py-3 text-right">
            <Link
              href={`/agendamentos/novo?clienteId=${c.id}`}
              className="text-xs font-semibold tracking-[0.12em] text-verm uppercase hover:underline"
            >
              Agendar
            </Link>
          </td>
        </tr>
      ))}
    </Tabela>
  );
}
