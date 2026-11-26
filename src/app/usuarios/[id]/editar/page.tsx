import type { Metadata } from "next";
import { Suspense } from "react";
import { UsuarioForm } from "@/components/forms/usuario-form";
import { Cabecalho, Carregando } from "@/components/ui";
import { ouNotFound } from "@/lib/paginas";
import * as usuarios from "@/lib/services/usuarios";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Editar usuário" };

export default function EditarUsuarioPage({ params }: PageProps<"/usuarios/[id]/editar">) {
  return (
    <>
      <Cabecalho titulo="Editar usuário" />
      <Suspense fallback={<Carregando />}>
        <Edicao params={params} />
      </Suspense>
    </>
  );
}

async function Edicao({ params }: Pick<PageProps<"/usuarios/[id]/editar">, "params">) {
  const eu = await exigirPagina("usuarios", "escrever");
  const { id } = await params;
  const usuario = await ouNotFound(usuarios.buscar(id));
  return <UsuarioForm usuario={usuario} ehVoce={usuario.id === eu.id} />;
}
