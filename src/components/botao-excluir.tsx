"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { estiloBotao } from "./ui";

export function BotaoExcluir({ url, descricao }: { url: string; descricao: string }) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    if (!window.confirm(`Excluir ${descricao}? Essa ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    setErro(null);
    try {
      const resp = await fetch(url, { method: "DELETE" });
      if (!resp.ok) {
        const corpo = (await resp.json().catch(() => ({}))) as { erro?: string };
        setErro(corpo.erro ?? "Não foi possível excluir.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={excluir} disabled={excluindo} className={estiloBotao.perigo}>
        {excluindo ? "Excluindo…" : "Excluir"}
      </button>
      {erro && (
        <span role="alert" className="mt-1 max-w-56 text-right text-xs text-verm">
          {erro}
        </span>
      )}
    </span>
  );
}
