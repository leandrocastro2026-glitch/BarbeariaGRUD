"use client";

import type { Servico } from "@prisma/client";
import { centavosParaInput } from "@/lib/dinheiro";
import { Campo, Entrada, Formulario } from "../formulario";

export function ServicoForm({ servico }: { servico?: Servico }) {
  return (
    <Formulario
      url={servico ? `/api/servicos/${servico.id}` : "/api/servicos"}
      metodo={servico ? "PUT" : "POST"}
      destino="/servicos"
      rotuloEnviar={servico ? "Salvar alterações" : "Cadastrar serviço"}
    >
      <Campo nome="nome" rotulo="Nome">
        <Entrada name="nome" defaultValue={servico?.nome} placeholder="Corte, Barba…" required autoFocus />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo nome="preco" rotulo="Preço (R$)">
          <Entrada
            name="preco"
            inputMode="decimal"
            defaultValue={servico ? centavosParaInput(servico.precoCentavos) : ""}
            placeholder="40,00"
            required
          />
        </Campo>
        <Campo
          nome="duracaoMin"
          rotulo="Duração (minutos)"
          dica={servico ? "Mudar não altera agendamentos já feitos." : undefined}
        >
          <Entrada name="duracaoMin" type="number" min={5} max={480} step={5} defaultValue={servico?.duracaoMin ?? 30} required />
        </Campo>
      </div>
    </Formulario>
  );
}
