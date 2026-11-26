import type { Metadata } from "next";
import { Suspense } from "react";
import { ClienteForm } from "@/components/forms/cliente-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { ouNotFound } from "@/lib/paginas";
import { exigirPagina } from "@/lib/sessao";
import * as clientes from "@/lib/services/clientes";

export const metadata: Metadata = { title: "Editar cliente" };

export default function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  return (
    <>
      <Cabecalho titulo="Editar cliente" />
      <Suspense fallback={<Carregando />}>
        <Edicao params={params} />
      </Suspense>
    </>
  );
}

async function Edicao({ params }: Pick<PageProps<"/clientes/[id]/editar">, "params">) {
  await exigirPagina("clientes", "escrever");
  const { id } = await params;
  const cliente = await ouNotFound(clientes.buscar(id));
  return <ClienteForm cliente={cliente} />;
}
