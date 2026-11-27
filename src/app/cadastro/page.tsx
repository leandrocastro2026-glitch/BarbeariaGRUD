import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { googleAtivo } from "@/auth";
import { BotaoGoogle, Divisor } from "@/components/autenticacao-extra";
import { FormCadastro } from "@/components/form-cadastro";
import { Cartao, Carregando } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-12">
      <Cartao className="border-t-[3px] border-t-verm p-8">
        <h1 className="font-serif text-4xl">Criar conta</h1>
        <p className="mt-1 mb-6 text-sm text-sub italic">Para marcar seus horários pelo site.</p>
        <Suspense fallback={<Carregando />}>
          <Conteudo />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Conteudo() {
  if (await usuarioAtual()) redirect("/");
  const primeiraConta = (await prisma.usuario.count()) === 0;
  return (
    <>
      <FormCadastro primeiraConta={primeiraConta} />
      {googleAtivo && (
        <>
          <Divisor />
          <BotaoGoogle />
        </>
      )}
      <p className="mt-6 text-center text-sm text-sub">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-azul underline-offset-2 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
