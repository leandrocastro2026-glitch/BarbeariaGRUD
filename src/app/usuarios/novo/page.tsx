import type { Metadata } from "next";
import { Suspense } from "react";
import { UsuarioForm } from "@/components/forms/usuario-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Novo usuário" };

export default function NovoUsuarioPage() {
  return (
    <>
      <Cabecalho titulo="Novo usuário" />
      <Suspense fallback={<Carregando />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  await exigirPagina("usuarios", "escrever");
  return <UsuarioForm />;
}
