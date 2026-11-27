import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormCompletarCadastro } from "@/components/form-completar-cadastro";
import { Cartao, Carregando } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Completar cadastro" };

export default function CompletarCadastroPage() {
  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-12">
      <Cartao className="border-t-[3px] border-t-verm p-8">
        <h1 className="font-serif text-4xl">Quase lá</h1>
        <p className="mt-1 mb-6 text-sm text-sub italic">
          Só falta um telefone para a barbearia falar com você sobre os horários.
        </p>
        <Suspense fallback={<Carregando />}>
          <Conteudo />
        </Suspense>
      </Cartao>
    </div>
  );
}

async function Conteudo() {
  const u = await exigirPagina("portal");
  const conta = await prisma.usuario.findUnique({ where: { id: u.id }, select: { clienteId: true } });
  if (conta?.clienteId) redirect("/agendar");
  return <FormCompletarCadastro nome={u.nome} />;
}
