import type { Metadata } from "next";
import { Suspense } from "react";
import { BarbeiroForm } from "@/components/forms/barbeiro-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { ouNotFound } from "@/lib/paginas";
import { exigirPagina } from "@/lib/sessao";
import * as barbeiros from "@/lib/services/barbeiros";

export const metadata: Metadata = { title: "Editar barbeiro" };

export default function EditarBarbeiroPage({ params }: PageProps<"/barbeiros/[id]/editar">) {
  return (
    <>
      <Cabecalho titulo="Editar barbeiro" />
      <Suspense fallback={<Carregando />}>
        <Edicao params={params} />
      </Suspense>
    </>
  );
}

async function Edicao({ params }: Pick<PageProps<"/barbeiros/[id]/editar">, "params">) {
  await exigirPagina("barbeiros", "escrever");
  const { id } = await params;
  const barbeiro = await ouNotFound(barbeiros.buscar(id));
  return <BarbeiroForm barbeiro={barbeiro} />;
}
