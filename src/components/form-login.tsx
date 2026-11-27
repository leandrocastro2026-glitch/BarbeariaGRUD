"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "@/app/acoes-auth";
import { estiloBotao, estiloInput, estiloRotulo } from "./ui";

export function FormLogin({ de }: { de: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="de" value={de} />
      {estado.erro && (
        <p role="alert" className="border-l-4 border-verm bg-white px-4 py-3 text-sm text-verm">
          {estado.erro}
        </p>
      )}
      {estado.aviso && (
        <p role="status" className="border-l-4 border-azul bg-destaque px-4 py-3 text-sm">
          {estado.aviso}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="email" className={estiloRotulo}>
          E-mail ou usuário
        </label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          defaultValue={estado.email}
          className={estiloInput}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="senha" className={estiloRotulo}>
          Senha
        </label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className={estiloInput} />
      </div>
      <button type="submit" disabled={enviando} className={`${estiloBotao.primario} w-full`}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
