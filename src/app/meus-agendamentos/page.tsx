import type { Metadata } from "next";
import { Suspense } from "react";
import { cancelar } from "@/app/acoes-cliente";
import { Cabecalho, Cartao, Carregando, LinkBotao, Selo, Vazio, estiloBotao } from "@/components/ui";
import { formatarDataLonga, formatarHora } from "@/lib/datas";
import { formatarPreco } from "@/lib/dinheiro";
import * as portal from "@/lib/services/portal-cliente";
import { exigirPaginaCliente } from "@/lib/sessao";
import { STATUS_ROTULO, type Status } from "@/lib/validacao";

export const metadata: Metadata = { title: "Meus horários" };

const AVISOS: Record<string, { texto: string; erro?: boolean }> = {
  marcado: { texto: "Horário marcado! Até lá." },
  cancelado: { texto: "Horário cancelado." },
  nao_cancelado: { texto: "Não foi possível cancelar: o horário já passou ou já foi cancelado.", erro: true },
};

const COR_STATUS: Record<Status, "azul" | "verde" | "cinza"> = { AGENDADO: "azul", CONCLUIDO: "verde", CANCELADO: "cinza" };

export default function MeusAgendamentosPage({ searchParams }: PageProps<"/meus-agendamentos">) {
  return (
    <>
      <Cabecalho titulo="Meus horários" acao={<LinkBotao href="/agendar">Marcar horário</LinkBotao>} />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Item = Awaited<ReturnType<typeof portal.meusAgendamentos>>[number];

function Linha({ a, podeCancelar }: { a: Item; podeCancelar: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
      <div className="min-w-48">
        <p className="font-medium first-letter:uppercase">{formatarDataLonga(a.inicio)}</p>
        <p className="text-sm text-sub">
          {formatarHora(a.inicio)} às {formatarHora(a.fim)}
        </p>
      </div>
      <div className="flex-1 text-sm">
        <p>
          {a.servico.nome} · {formatarPreco(a.servico.precoCentavos)}
        </p>
        <p className="text-sub">com {a.barbeiro.nome}</p>
      </div>
      <Selo cor={COR_STATUS[a.status as Status] ?? "cinza"}>{STATUS_ROTULO[a.status as Status] ?? a.status}</Selo>
      {podeCancelar && (
        <form action={cancelar}>
          <input type="hidden" name="id" value={a.id} />
          <button type="submit" className={estiloBotao.perigo}>
            Cancelar horário
          </button>
        </form>
      )}
    </li>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/meus-agendamentos">, "searchParams">) {
  const c = await exigirPaginaCliente();
  const { aviso } = await searchParams;
  const msg = typeof aviso === "string" && Object.hasOwn(AVISOS, aviso) ? AVISOS[aviso] : undefined;
  const itens = await portal.meusAgendamentos(c.clienteId);
  const agora = new Date();
  const proximos = itens.filter((a) => a.status === "AGENDADO" && a.inicio > agora).reverse();
  const historico = itens.filter((a) => !proximos.includes(a));

  return (
    <div className="space-y-8">
      {msg && (
        <p
          role={msg.erro ? "alert" : "status"}
          className={`border-l-4 px-4 py-3 text-sm ${msg.erro ? "border-verm bg-white text-verm" : "border-verde bg-destaque"}`}
        >
          {msg.texto}
        </p>
      )}

      <section aria-labelledby="proximos" className="space-y-3">
        <h2 id="proximos" className="font-serif text-2xl">
          Próximos
        </h2>
        {proximos.length === 0 ? (
          <Vazio>Você não tem horários marcados.</Vazio>
        ) : (
          <Cartao>
            <ul className="divide-y divide-dashed divide-linha">
              {proximos.map((a) => (
                <Linha key={a.id} a={a} podeCancelar />
              ))}
            </ul>
          </Cartao>
        )}
      </section>

      {historico.length > 0 && (
        <section aria-labelledby="historico" className="space-y-3">
          <h2 id="historico" className="font-serif text-2xl">
            Histórico
          </h2>
          <Cartao>
            <ul className="divide-y divide-dashed divide-linha">
              {historico.map((a) => (
                <Linha key={a.id} a={a} podeCancelar={false} />
              ))}
            </ul>
          </Cartao>
        </section>
      )}
    </div>
  );
}
