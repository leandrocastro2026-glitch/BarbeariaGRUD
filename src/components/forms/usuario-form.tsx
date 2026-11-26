"use client";

import { PERFIS, PERFIL_ROTULO, type Perfil } from "@/lib/permissoes";
import { Campo, Entrada, Formulario, Selecao } from "../formulario";

type Usuario = { id: number; nome: string; email: string; perfil: string; ativo: boolean };

export function UsuarioForm({ usuario, ehVoce }: { usuario?: Usuario; ehVoce?: boolean }) {
  return (
    <Formulario
      url={usuario ? `/api/usuarios/${usuario.id}` : "/api/usuarios"}
      metodo={usuario ? "PUT" : "POST"}
      destino="/usuarios"
      rotuloEnviar={usuario ? "Salvar alterações" : "Criar usuário"}
    >
      <Campo nome="nome" rotulo="Nome">
        <Entrada name="nome" defaultValue={usuario?.nome} autoComplete="off" required autoFocus />
      </Campo>
      <Campo nome="email" rotulo="E-mail (login)">
        <Entrada name="email" type="email" defaultValue={usuario?.email} autoComplete="off" required />
      </Campo>
      <Campo
        nome="perfil"
        rotulo="Perfil"
        dica="Recepção agenda e cadastra clientes. Administrador também vê faturamento, dashboard e usuários."
      >
        <Selecao name="perfil" defaultValue={(usuario?.perfil as Perfil) ?? "RECEPCAO"} disabled={ehVoce}>
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {PERFIL_ROTULO[p]}
            </option>
          ))}
        </Selecao>
      </Campo>
      {/* Campo desabilitado não é enviado; mantém o perfil atual ao editar a si mesmo. */}
      {ehVoce && <input type="hidden" name="perfil" value={usuario?.perfil} />}
      <Campo
        nome="senha"
        rotulo={usuario ? "Nova senha" : "Senha"}
        dica={usuario ? "Deixe em branco para manter a senha atual." : "Mínimo de 8 caracteres."}
      >
        <Entrada name="senha" type="password" autoComplete="new-password" minLength={8} required={!usuario} />
      </Campo>
      {usuario && !ehVoce && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="ativo" defaultChecked={usuario.ativo} className="size-4 accent-verm" />
          Ativo (pode entrar no sistema)
        </label>
      )}
      {usuario && ehVoce && <input type="hidden" name="ativo" value="true" />}
    </Formulario>
  );
}
