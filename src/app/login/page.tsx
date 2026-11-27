import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { googleAtivo } from "@/auth";
import { BotaoGoogle, Divisor } from "@/components/autenticacao-extra";
import { FormLogin } from "@/components/form-login";
import { Cartao, Carregando } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Entrar" };

/** Avisos que chegam pela URL (?aviso= nosso, ?error= do Auth.js). Só textos fixos: nada da URL é exibido. */
const AVISOS: Record<string, { texto: string; tipo: "ok" | "info" | "erro" }> = {
  verificado: { tipo: "ok", texto: "E-mail confirmado! Agora é só entrar." },
  inativa: { tipo: "erro", texto: "Esta conta está desativada. Fale com a barbearia." },
  google_sem_email: { tipo: "erro", texto: "Não foi possível usar essa conta Google: o e-mail dela não está verificado." },
  OAuthAccountNotLinked: { tipo: "erro", texto: "Não foi possível vincular essa conta Google." },
  AccessDenied: { tipo: "erro", texto: "Acesso negado." },
  Configuration: { tipo: "erro", texto: "Login com Google indisponível no momento. Tente entrar com e-mail e senha." },
};

const COR = { ok: "border-verde bg-destaque", info: "border-azul bg-destaque", erro: "border-verm bg-white text-verm" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-12">
      <Cartao className="border-t-[3px] border-t-verm p-8">
        <h1 className="font-serif text-4xl">Entrar</h1>
        <p className="mt-1 mb-6 text-sm text-sub italic">Marque seu horário ou acesse a agenda da equipe.</p>
        <Suspense fallback={<Carregando />}>
          <Conteudo searchParams={searchParams} />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  if (await usuarioAtual()) redirect("/");
  const { de, aviso, error } = await searchParams;
  const chave = typeof aviso === "string" ? aviso : typeof error === "string" ? error : "";
  const msg = Object.hasOwn(AVISOS, chave) ? AVISOS[chave] : chave ? AVISOS.Configuration : undefined;
  const destino = typeof de === "string" ? de : "/";
  const semUsuarios = (await prisma.usuario.count()) === 0;
  return (
    <>
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className={`mb-5 border-l-4 px-4 py-3 text-sm ${COR[msg.tipo]}`}>
          {msg.texto}
        </p>
      )}
      {semUsuarios && (
        <p className="mb-5 border-l-4 border-azul bg-destaque px-4 py-3 text-sm">
          Nenhum usuário cadastrado ainda. <Link href="/cadastro" className="font-semibold text-azul underline">Crie a primeira conta</Link>
          {" "}— ela será a do administrador.
        </p>
      )}
      <FormLogin de={destino} />
      {googleAtivo && (
        <>
          <Divisor />
          <BotaoGoogle de={destino} />
        </>
      )}
      <p className="mt-6 text-center text-sm text-sub">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-azul underline-offset-2 hover:underline">
          Criar conta
        </Link>
      </p>
    </>
  );
}
