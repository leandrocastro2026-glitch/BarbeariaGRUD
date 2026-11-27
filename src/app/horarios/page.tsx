import type { Metadata } from "next";
import { Suspense } from "react";
import { FormHorarios } from "@/components/form-horarios";
import { Cabecalho, Carregando } from "@/components/ui";
import * as funcionamento from "@/lib/services/funcionamento";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Horários" };

export default function HorariosPage() {
  return (
    <>
      <Cabecalho
        titulo="Horários"
        subtitulo="Quando os clientes podem marcar pelo site. A equipe continua podendo agendar em qualquer horário."
      />
      <Suspense fallback={<Carregando />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  await exigirPagina("horarios", "escrever");
  return <FormHorarios atual={await funcionamento.obter()} />;
}
