import type { Metadata } from "next";
import { Suspense } from "react";
import { AgendamentoForm } from "@/components/forms/agendamento-form";
import { Cabecalho, Carregando, LinkBotao } from "@/components/ui";
import { carregarOpcoesAgendamento } from "@/lib/opcoes-agendamento";
import { pode, type Recurso } from "@/lib/permissoes";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Novo agendamento" };

export default function NovoAgendamentoPage({ searchParams }: PageProps<"/agendamentos/novo">) {
  return (
    <>
      <Cabecalho titulo="Novo agendamento" />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/agendamentos/novo">, "searchParams">) {
  const eu = await exigirPagina("agendamentos", "escrever");
  const busca = await searchParams;
  const opcoes = await carregarOpcoesAgendamento();

  const faltando = [
    opcoes.clientes.length === 0 && { href: "/clientes/novo", rotulo: "Cadastrar cliente", recurso: "clientes" },
    !opcoes.barbeiros.some((b) => b.ativo) && {
      href: "/barbeiros/novo",
      rotulo: "Cadastrar barbeiro",
      recurso: "barbeiros",
    },
    opcoes.servicos.length === 0 && { href: "/servicos/novo", rotulo: "Cadastrar serviço", recurso: "servicos" },
  ].filter(Boolean) as { href: string; rotulo: string; recurso: Recurso }[];
  const permitidos = faltando.filter((f) => pode(eu.perfil, f.recurso, "escrever"));

  if (faltando.length) {
    return (
      <div className="max-w-xl space-y-4 border-l-4 border-azul bg-destaque p-6 text-sm">
        <p>Para agendar, é preciso ter pelo menos um cliente, um barbeiro ativo e um serviço.</p>
        <div className="flex flex-wrap gap-2">
          {permitidos.map((f) => (
            <LinkBotao key={f.href} href={f.href} variante="secundario">
              {f.rotulo}
            </LinkBotao>
          ))}
        </div>
        {permitidos.length < faltando.length && (
          <p className="text-sub">Peça a um administrador para fazer os cadastros.</p>
        )}
      </div>
    );
  }

  const barbeiroId = Number(busca.barbeiroId) || undefined;
  const clienteId = Number(busca.clienteId) || undefined;
  const data = typeof busca.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(busca.data) ? busca.data : null;

  return <AgendamentoForm {...opcoes} padrao={{ barbeiroId, clienteId, inicio: data ? `${data}T09:00` : undefined }} />;
}
