"use client";

import type { Cliente } from "@prisma/client";
import { Campo, Entrada, Formulario } from "../formulario";

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  return (
    <Formulario
      url={cliente ? `/api/clientes/${cliente.id}` : "/api/clientes"}
      metodo={cliente ? "PUT" : "POST"}
      destino="/clientes"
      rotuloEnviar={cliente ? "Salvar alterações" : "Cadastrar cliente"}
    >
      <Campo nome="nome" rotulo="Nome">
        <Entrada name="nome" defaultValue={cliente?.nome} autoComplete="name" required autoFocus />
      </Campo>
      <Campo nome="telefone" rotulo="Telefone">
        <Entrada name="telefone" type="tel" defaultValue={cliente?.telefone} placeholder="(11) 98888-7777" required />
      </Campo>
      <Campo nome="email" rotulo="E-mail" dica="Opcional.">
        <Entrada name="email" type="email" defaultValue={cliente?.email ?? ""} autoComplete="email" />
      </Campo>
    </Formulario>
  );
}
