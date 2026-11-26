import type { Metadata } from "next";
import { Suspense } from "react";
import { AgendamentoForm } from "@/components/forms/agendamento-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { paraInputDataHora } from "@/lib/datas";
import { carregarOpcoesAgendamento } from "@/lib/opcoes-agendamento";
import { ouNotFound } from "@/lib/paginas";
import { exigirPagina } from "@/lib/sessao";
import * as agendamentos from "@/lib/services/agendamentos";

export const metadata: Metadata = { title: "Editar agendamento" };

export default function EditarAgendamentoPage({ params }: PageProps<"/agendamentos/[id]/editar">) {
  return (
    <>
      <Cabecalho titulo="Editar agendamento" />
      <Suspense fallback={<Carregando />}>
        <Edicao params={params} />
      </Suspense>
    </>
  );
}

async function Edicao({ params }: Pick<PageProps<"/agendamentos/[id]/editar">, "params">) {
  await exigirPagina("agendamentos", "escrever");
  const { id } = await params;
  const [a, opcoes] = await Promise.all([ouNotFound(agendamentos.buscar(id)), carregarOpcoesAgendamento()]);
  return (
    <AgendamentoForm
      {...opcoes}
      agendamento={{
        id: a.id,
        clienteId: a.clienteId,
        barbeiroId: a.barbeiroId,
        servicoId: a.servicoId,
        inicio: paraInputDataHora(a.inicio),
        status: a.status,
        observacao: a.observacao,
      }}
    />
  );
}
