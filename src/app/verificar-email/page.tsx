import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { confirmar } from "@/app/acoes-auth";
import { Cartao, Carregando, estiloBotao } from "@/components/ui";

export const metadata: Metadata = { title: "Confirmar e-mail", referrer: "no-referrer" };

export default function VerificarEmailPage({ searchParams }: PageProps<"/verificar-email">) {
  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-12">
      <Cartao className="border-t-[3px] border-t-verm p-8">
        <h1 className="font-serif text-4xl">Confirmar e-mail</h1>
        <Suspense fallback={<Carregando />}>
          <Conteudo searchParams={searchParams} />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/verificar-email">, "searchParams">) {
  const { token, invalido } = await searchParams;
  if (invalido || typeof token !== "string" || !token) {
    return (
      <div className="mt-6 space-y-4 text-sm">
        <p role="alert" className="border-l-4 border-verm bg-white px-4 py-3 text-verm">
          Este link é inválido ou já venceu (vale por 24 horas e só pode ser usado uma vez).
        </p>
        <p className="text-sub">Para receber um link novo, tente entrar com seu e-mail e senha.</p>
        <Link href="/login" className={`${estiloBotao.primario} w-full`}>
          Ir para o login
        </Link>
      </div>
    );
  }
  // O token vai num formulário: a conta só é confirmada quando a pessoa clica no botão.
  return (
    <form action={confirmar} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm">Clique abaixo para confirmar que este e-mail é seu.</p>
      <button type="submit" className={`${estiloBotao.primario} w-full`}>
        Confirmar e-mail
      </button>
    </form>
  );
}
