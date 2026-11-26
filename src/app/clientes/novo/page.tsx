import type { Metadata } from "next";
import { Suspense } from "react";
import { ClienteForm } from "@/components/forms/cliente-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Novo cliente" };

export default function NovoClientePage() {
  return (
    <>
      <Cabecalho titulo="Novo cliente" />
      <Suspense fallback={<Carregando />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  await exigirPagina("clientes", "escrever");
  return <ClienteForm />;
}
