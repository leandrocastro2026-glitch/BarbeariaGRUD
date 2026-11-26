"use client";

import type { Barbeiro } from "@prisma/client";
import { useState } from "react";
import { Campo, Entrada, Formulario } from "../formulario";

export function BarbeiroForm({ barbeiro }: { barbeiro?: Barbeiro }) {
  const [aviso, setAviso] = useState<string | null>(null);

  async function aoMudarAtivo(ativo: boolean) {
    setAviso(null);
    if (ativo || !barbeiro?.ativo) return;
    try {
      const resp = await fetch(`/api/barbeiros/${barbeiro.id}/agendamentos-futuros`);
      const { total } = (await resp.json()) as { total: number };
      if (total > 0) {
        setAviso(
          `${barbeiro.nome} tem ${total} agendamento(s) futuro(s). Eles não serão cancelados automaticamente; ` +
            "reatribua ou cancele-os em Agendamentos.",
        );
      }
    } catch {
      // Aviso é só informativo; falhar aqui não impede salvar.
    }
  }

  return (
    <Formulario
      url={barbeiro ? `/api/barbeiros/${barbeiro.id}` : "/api/barbeiros"}
      metodo={barbeiro ? "PUT" : "POST"}
      destino="/barbeiros"
      rotuloEnviar={barbeiro ? "Salvar alterações" : "Cadastrar barbeiro"}
    >
      <Campo nome="nome" rotulo="Nome">
        <Entrada name="nome" defaultValue={barbeiro?.nome} required autoFocus />
      </Campo>
      <Campo nome="telefone" rotulo="Telefone">
        <Entrada name="telefone" type="tel" defaultValue={barbeiro?.telefone} placeholder="(11) 98888-7777" required />
      </Campo>
      <Campo nome="especialidade" rotulo="Especialidade" dica="Opcional. Ex.: degradê, barba, coloração.">
        <Entrada name="especialidade" defaultValue={barbeiro?.especialidade ?? ""} />
      </Campo>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={barbeiro?.ativo ?? true}
          onChange={(e) => aoMudarAtivo(e.target.checked)}
          className="size-4 accent-verm"
        />
        Ativo (pode receber agendamentos)
      </label>
      {aviso && (
        <p role="status" className="border-l-4 border-azul bg-destaque px-4 py-3 text-sm">
          {aviso}
        </p>
      )}
    </Formulario>
  );
}
