"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUS, STATUS_ROTULO, type Status } from "@/lib/validacao";

const COR: Record<Status, string> = {
  AGENDADO: "border-azul text-azul",
  CONCLUIDO: "border-verde text-verde",
  CANCELADO: "border-linha text-sub line-through",
};

export function SeletorStatus({ id, status }: { id: number; status: Status }) {
  const router = useRouter();
  const [atual, setAtual] = useState(status);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alterar(novo: Status) {
    const anterior = atual;
    setAtual(novo);
    setSalvando(true);
    setErro(null);
    try {
      const resp = await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novo }),
      });
      if (!resp.ok) {
        const corpo = (await resp.json().catch(() => ({}))) as { erro?: string; campos?: Record<string, string[]> };
        setAtual(anterior);
        setErro(corpo.campos?.inicio?.[0] ?? corpo.erro ?? "Não foi possível alterar.");
        return;
      }
      router.refresh();
    } catch {
      setAtual(anterior);
      setErro("Falha de conexão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <select
        aria-label="Status"
        value={atual}
        disabled={salvando}
        onChange={(e) => alterar(e.target.value as Status)}
        className={`border-[1.5px] bg-white px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.08em] uppercase ${COR[atual]}`}
      >
        {STATUS.map((s) => (
          <option key={s} value={s}>
            {STATUS_ROTULO[s]}
          </option>
        ))}
      </select>
      {erro && (
        <span role="alert" className="mt-1 max-w-56 text-xs text-verm">
          {erro}
        </span>
      )}
    </span>
  );
}
