import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormLogin } from "@/components/form-login";
import { Cartao, Carregando } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-12">
      <Cartao className="border-t-[3px] border-t-verm p-8">
        <h1 className="font-serif text-4xl">Entrar</h1>
        <p className="mt-1 mb-6 text-sm text-sub italic">Acesso da equipe da barbearia.</p>
        <Suspense fallback={<Carregando />}>
          <Conteudo searchParams={searchParams} />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  if (await usuarioAtual()) redirect("/");
  const { de } = await searchParams;
  const semUsuarios = (await prisma.usuario.count()) === 0;
  return (
    <>
      {semUsuarios && (
        <p className="mb-5 border-l-4 border-azul bg-destaque px-4 py-3 text-sm">
          Nenhum usuário cadastrado ainda. No terminal do projeto, rode{" "}
          <code className="font-mono text-xs">npm run usuario:criar</code> para criar o administrador.
        </p>
      )}
      <FormLogin de={typeof de === "string" ? de : "/"} />
    </>
  );
}
