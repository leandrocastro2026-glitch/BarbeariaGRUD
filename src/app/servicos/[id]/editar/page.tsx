import type { Metadata } from "next";
import { Suspense } from "react";
import { ServicoForm } from "@/components/forms/servico-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { ouNotFound } from "@/lib/paginas";
import { exigirPagina } from "@/lib/sessao";
import * as servicos from "@/lib/services/servicos";

export const metadata: Metadata = { title: "Editar serviço" };

export default function EditarServicoPage({ params }: PageProps<"/servicos/[id]/editar">) {
  return (
    <>
      <Cabecalho titulo="Editar serviço" />
      <Suspense fallback={<Carregando />}>
        <Edicao params={params} />
      </Suspense>
    </>
  );
}

async function Edicao({ params }: Pick<PageProps<"/servicos/[id]/editar">, "params">) {
  await exigirPagina("servicos", "escrever");
  const { id } = await params;
  const servico = await ouNotFound(servicos.buscar(id));
  return <ServicoForm servico={servico} />;
}
