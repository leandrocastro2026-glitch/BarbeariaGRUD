import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { agendar } from "@/app/acoes-cliente";
import { Cabecalho, Cartao, Carregando, Vazio, estiloBotao, estiloInput, estiloRotulo } from "@/components/ui";
import { formatarDataLonga, formatarHora } from "@/lib/datas";
import { formatarPreco } from "@/lib/dinheiro";
import { ValidationError } from "@/lib/erros";
import { FUNCIONAMENTO, NOMES_DIAS } from "@/lib/horario-funcionamento";
import * as portal from "@/lib/services/portal-cliente";
import { exigirPaginaCliente } from "@/lib/sessao";

export const metadata: Metadata = { title: "Agendar" };

const ERROS: Record<string, string> = {
  ocupado: "Esse horário acabou de ser ocupado. Escolha outro abaixo.",
  limite: `Você já tem ${FUNCIONAMENTO.maxAgendamentosFuturos} horários marcados. Cancele um em "Meus horários" para marcar outro.`,
  invalido: "Não foi possível marcar com esses dados. Escolha de novo.",
};

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

function resumoFuncionamento() {
  const dias = FUNCIONAMENTO.dias.map((d) => NOMES_DIAS[d]);
  const faixa = dias.length > 2 ? `${dias[0]} a ${dias.at(-1)}` : dias.join(" e ");
  return `Atendemos de ${faixa}, das ${FUNCIONAMENTO.abre} às ${FUNCIONAMENTO.fecha}.`;
}

export default function AgendarPage({ searchParams }: PageProps<"/agendar">) {
  return (
    <>
      <Cabecalho titulo="Agendar horário" subtitulo={resumoFuncionamento()} />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/agendar">, "searchParams">) {
  await exigirPaginaCliente();
  const busca = await searchParams;
  const escolha = { servicoId: texto(busca.servicoId), barbeiroId: texto(busca.barbeiroId), data: texto(busca.data) };
  const erro = ERROS[texto(busca.erro)];

  const { servicos, barbeiros } = await portal.opcoes();
  if (!servicos.length || !barbeiros.length) {
    return <Vazio>A agenda online ainda não está disponível. Fale com a barbearia para marcar.</Vazio>;
  }
  const limites = portal.limitesDeData();

  let horarios: Date[] | null = null;
  if (escolha.servicoId && escolha.barbeiroId && escolha.data) {
    try {
      horarios = await portal.horariosLivres(escolha);
    } catch (e) {
      if (!(e instanceof ValidationError)) throw e;
    }
  }

  return (
    <div className="space-y-6">
      {erro && (
        <p role="alert" className="border-l-4 border-verm bg-white px-4 py-3 text-sm text-verm">
          {erro}
        </p>
      )}

      <Cartao className="p-5">
        <form className="grid gap-4 sm:grid-cols-[2fr_2fr_1.3fr_auto] sm:items-end" aria-label="Escolher serviço, barbeiro e dia">
          <label className="space-y-1.5 text-sm">
            <span className={estiloRotulo}>Serviço</span>
            <select name="servicoId" required defaultValue={escolha.servicoId} className={estiloInput}>
              <option value="">Escolha…</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} · {s.duracaoMin} min · {formatarPreco(s.precoCentavos)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className={estiloRotulo}>Barbeiro</span>
            <select name="barbeiroId" required defaultValue={escolha.barbeiroId} className={estiloInput}>
              <option value="">Escolha…</option>
              {barbeiros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className={estiloRotulo}>Dia</span>
            <input type="date" name="data" required min={limites.min} max={limites.max} defaultValue={escolha.data} className={estiloInput} />
          </label>
          <button type="submit" className={estiloBotao.secundario}>
            Ver horários
          </button>
        </form>
      </Cartao>

      {horarios && (
        <section aria-labelledby="titulo-horarios" className="space-y-3">
          <h2 id="titulo-horarios" className="font-serif text-2xl first-letter:uppercase">
            {formatarDataLonga(new Date(`${escolha.data}T12:00:00-03:00`))}
          </h2>
          {horarios.length === 0 ? (
            <Vazio>Nenhum horário livre nesse dia com esse barbeiro. Tente outro dia ou outro barbeiro.</Vazio>
          ) : (
            <>
              <p className="text-sm text-sub">Toque no horário para marcar.</p>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {horarios.map((h) => (
                  <li key={h.getTime()}>
                    <form action={agendar}>
                      <input type="hidden" name="servicoId" value={escolha.servicoId} />
                      <input type="hidden" name="barbeiroId" value={escolha.barbeiroId} />
                      <input type="hidden" name="data" value={escolha.data} />
                      <input type="hidden" name="inicio" value={h.toISOString()} />
                      <button type="submit" className={`${estiloBotao.primario} w-full`} aria-label={`Marcar às ${formatarHora(h)}`}>
                        {formatarHora(h)}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <p className="text-sm">
        <Link href="/meus-agendamentos" className={estiloBotao.link}>
          Ver meus horários
        </Link>
      </p>
    </div>
  );
}
