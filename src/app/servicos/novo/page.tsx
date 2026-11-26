import type { Metadata } from "next";
import { Suspense } from "react";
import { ServicoForm } from "@/components/forms/servico-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Novo serviço" };

export default function NovoServicoPage() {
  return (
    <>
      <Cabecalho titulo="Novo serviço" />
      <Suspense fallback={<Carregando />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  await exigirPagina("servicos", "escrever");
  return <ServicoForm />;
}
