import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho, Carregando, LinkBotao, Selo, Tabela, estiloBotao, estiloLinha } from "@/components/ui";
import { PERFIL_ROTULO, type Perfil } from "@/lib/permissoes";
import * as usuarios from "@/lib/services/usuarios";
import { exigirPagina } from "@/lib/sessao";

export const metadata: Metadata = { title: "Usuários" };

export default function UsuariosPage() {
  return (
    <>
      <Cabecalho titulo="Usuários" acao={<LinkBotao href="/usuarios/novo">Novo usuário</LinkBotao>} />
      <Suspense fallback={<Carregando />}>
        <Lista />
      </Suspense>
    </>
  );
}

async function Lista() {
  const eu = await exigirPagina("usuarios");
  const itens = await usuarios.listar();
  return (
    <Tabela cabecalhos={["Nome", "E-mail", "Perfil", "Situação", ""]}>
      {itens.map((u) => (
        <tr key={u.id} className={`${estiloLinha} ${u.ativo ? "" : "text-sub"}`}>
          <td className="px-4 py-3 font-medium">
            {u.nome}
            {u.id === eu.id && <span className="ml-2 text-xs font-normal text-sub">(você)</span>}
          </td>
          <td className="px-4 py-3">{u.email}</td>
          <td className="px-4 py-3">
            <Selo cor={u.perfil === "ADMIN" ? "vermelho" : "azul"}>{PERFIL_ROTULO[u.perfil as Perfil]}</Selo>
          </td>
          <td className="px-4 py-3">{u.ativo ? <Selo cor="verde">Ativo</Selo> : <Selo cor="cinza">Inativo</Selo>}</td>
          <td className="px-4 py-3">
            <div className="flex items-start justify-end gap-1">
              <Link href={`/usuarios/${u.id}/editar`} className={estiloBotao.link}>
                Editar
              </Link>
              {u.id !== eu.id && <BotaoExcluir url={`/api/usuarios/${u.id}`} descricao={`o usuário ${u.nome}`} />}
            </div>
          </td>
        </tr>
      ))}
    </Tabela>
  );
}
