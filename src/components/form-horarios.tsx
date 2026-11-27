"use client";

import { useActionState } from "react";
import { salvarHorarios, type EstadoHorarios } from "@/app/acoes-horarios";
import type { Funcionamento } from "@/lib/horario-funcionamento";
import { Cartao, estiloBotao, estiloInput, estiloRotulo } from "./ui";

const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
/** Exibe começando pela segunda-feira. */
const ORDEM = [1, 2, 3, 4, 5, 6, 0];

function Numero({ nome, rotulo, ajuda, valor, min, max }: { nome: string; rotulo: string; ajuda: string; valor: number; min: number; max: number }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className={estiloRotulo}>{rotulo}</span>
      <input type="number" name={nome} required min={min} max={max} defaultValue={valor} className={`${estiloInput} max-w-32`} />
      <span className="block text-xs text-sub">{ajuda}</span>
    </label>
  );
}

export function FormHorarios({ atual }: { atual: Funcionamento }) {
  const [estado, acao, salvando] = useActionState<EstadoHorarios, FormData>(salvarHorarios, {});
  // Depois de enviar, o formulário mostra o que foi enviado (mesmo com erro). A `key` recria os
  // campos com esses valores, já que o React limpa o formulário ao fim da ação.
  const f = estado.valores ?? atual;
  return (
    <form key={JSON.stringify(f)} action={acao} className="space-y-6">
      {estado.ok && (
        <p role="status" className="border-l-4 border-verde bg-destaque px-4 py-3 text-sm">
          Horários salvos. A agenda online já está usando os novos horários.
        </p>
      )}
      {estado.erros?.length ? (
        <div role="alert" className="border-l-4 border-verm bg-white px-4 py-3 text-sm text-verm">
          {estado.erros.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      <Cartao className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-tinta text-[11px] tracking-[0.14em] text-sub uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Dia</th>
              <th scope="col" className="px-4 py-3 font-semibold">Aberto</th>
              <th scope="col" className="px-4 py-3 font-semibold">Abre</th>
              <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-linha">
            {ORDEM.map((d) => {
              const dia = f.dias[d];
              return (
                <tr key={d}>
                  <th scope="row" className="px-4 py-3 font-medium">{NOMES[d]}</th>
                  <td className="px-4 py-3">
                    <input type="checkbox" name={`aberto_${d}`} defaultChecked={dia.aberto} aria-label={`${NOMES[d]} aberto`} className="size-4 accent-verm" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="time" name={`abre_${d}`} defaultValue={dia.abre} aria-label={`${NOMES[d]}: abre`} className={estiloInput} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="time" name={`fecha_${d}`} defaultValue={dia.fecha} aria-label={`${NOMES[d]}: fecha`} className={estiloInput} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Cartao>

      <Cartao className="grid gap-5 p-5 sm:grid-cols-2">
        <Numero nome="intervaloMin" rotulo="Intervalo entre horários (min)" ajuda="Ex.: 30 → 09:00, 09:30, 10:00…" valor={f.intervaloMin} min={5} max={240} />
        <Numero nome="antecedenciaMin" rotulo="Antecedência mínima (min)" ajuda="Quanto tempo antes o cliente ainda pode marcar." valor={f.antecedenciaMin} min={0} max={2880} />
        <Numero nome="diasAFrente" rotulo="Até quantos dias à frente" ajuda="Quão longe na agenda o cliente pode marcar." valor={f.diasAFrente} min={1} max={365} />
        <Numero nome="maxAgendamentosFuturos" rotulo="Máximo de horários por cliente" ajuda="Horários futuros que cada cliente pode ter ao mesmo tempo." valor={f.maxAgendamentosFuturos} min={1} max={50} />
      </Cartao>

      <button type="submit" disabled={salvando} className={estiloBotao.primario}>
        {salvando ? "Salvando…" : "Salvar horários"}
      </button>
    </form>
  );
}
