"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cadastrar, type EstadoCadastro } from "@/app/acoes-auth";
import { estiloBotao, estiloInput, estiloRotulo } from "./ui";

function Campo({
  id,
  rotulo,
  erro,
  ...props
}: { id: string; rotulo: string; erro?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={estiloRotulo}>
        {rotulo}
      </label>
      <input
        id={id}
        name={id}
        required
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={estiloInput}
        {...props}
      />
      {erro && (
        <p id={`${id}-erro`} className="text-xs text-verm">
          {erro}
        </p>
      )}
    </div>
  );
}

export function FormCadastro({ primeiraConta }: { primeiraConta: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoCadastro, FormData>(cadastrar, {});

  if (estado.ok) {
    return (
      <div role="status" className="space-y-4 text-sm">
        <p className="border-l-4 border-verde bg-destaque px-4 py-3">
          Pronto! Se <strong>{estado.valores?.email}</strong> puder ser cadastrado, enviamos um link de confirmação
          para ele. Abra o e-mail (confira também o spam) e clique em <strong>Confirmar e-mail</strong>.
        </p>
        <p className="text-sub">
          {primeiraConta
            ? "Esta é a primeira conta do sistema: depois de confirmar o e-mail, você entra como administrador."
            : "Depois de confirmar, é só entrar e marcar seu horário."}
        </p>
        <Link href="/login" className={`${estiloBotao.primario} w-full`}>
          Voltar para o login
        </Link>
      </div>
    );
  }

  const c = estado.campos ?? {};
  return (
    <form action={acao} className="space-y-5" noValidate>
      {estado.erro && (
        <p role="alert" className="border-l-4 border-verm bg-white px-4 py-3 text-sm text-verm">
          {estado.erro}
        </p>
      )}
      <Campo id="nome" rotulo="Nome" autoComplete="name" defaultValue={estado.valores?.nome} erro={c.nome} autoFocus />
      <Campo
        id="email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={estado.valores?.email}
        erro={c.email}
      />
      <Campo id="senha" rotulo="Senha (mínimo 8 caracteres)" type="password" autoComplete="new-password" minLength={8} erro={c.senha} />
      <Campo id="confirmacao" rotulo="Repita a senha" type="password" autoComplete="new-password" erro={c.confirmacao} />
      <button type="submit" disabled={enviando} className={`${estiloBotao.primario} w-full`}>
        {enviando ? "Criando…" : "Criar conta"}
      </button>
    </form>
  );
}
