"use client";

import { useActionState } from "react";
import { completarCadastro, type EstadoCompletar } from "@/app/acoes-cliente";
import { estiloBotao, estiloInput, estiloRotulo } from "./ui";

export function FormCompletarCadastro({ nome }: { nome: string }) {
  const [estado, acao, enviando] = useActionState<EstadoCompletar, FormData>(completarCadastro, {});
  const c = estado.campos ?? {};
  return (
    <form action={acao} className="space-y-5" noValidate>
      {estado.erro && (
        <p role="alert" className="border-l-4 border-verm bg-white px-4 py-3 text-sm text-verm">
          {estado.erro}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="nome" className={estiloRotulo}>
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoComplete="name"
          defaultValue={estado.valores?.nome ?? nome}
          aria-invalid={c.nome ? true : undefined}
          aria-describedby={c.nome ? "nome-erro" : undefined}
          className={estiloInput}
        />
        {c.nome && (
          <p id="nome-erro" className="text-xs text-verm">
            {c.nome}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="telefone" className={estiloRotulo}>
          Telefone / WhatsApp
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          required
          autoComplete="tel"
          autoFocus
          placeholder="(11) 91234-5678"
          defaultValue={estado.valores?.telefone}
          aria-invalid={c.telefone ? true : undefined}
          aria-describedby={c.telefone ? "telefone-erro" : undefined}
          className={estiloInput}
        />
        {c.telefone && (
          <p id="telefone-erro" className="text-xs text-verm">
            {c.telefone}
          </p>
        )}
      </div>
      <button type="submit" disabled={enviando} className={`${estiloBotao.primario} w-full`}>
        {enviando ? "Salvando…" : "Continuar"}
      </button>
    </form>
  );
}
