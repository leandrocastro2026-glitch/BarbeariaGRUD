import type { Metadata } from "next";
import { Suspense } from "react";
import { BarbeiroForm } from "@/components/forms/barbeiro-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Novo barbeiro" };

export default function NovoBarbeiroPage() {
  return (
    <>
      <Cabecalho titulo="Novo barbeiro" />
      <Suspense fallback={<Carregando />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  await exigirPagina("barbeiros", "escrever");
  return <BarbeiroForm />;
}
