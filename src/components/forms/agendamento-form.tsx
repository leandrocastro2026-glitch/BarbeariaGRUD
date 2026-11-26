"use client";

import { formatarPreco } from "@/lib/dinheiro";
import { STATUS, STATUS_ROTULO } from "@/lib/validacao";
import { AreaTexto, Campo, Entrada, Formulario, Selecao } from "../formulario";

type Opcao = { id: number; nome: string };

export type AgendamentoFormProps = {
  clientes: Opcao[];
  barbeiros: (Opcao & { ativo: boolean })[];
  servicos: (Opcao & { precoCentavos: number; duracaoMin: number })[];
  /** Valores para edição; `inicio` já no formato do input datetime-local. */
  agendamento?: {
    id: number;
    clienteId: number;
    barbeiroId: number;
    servicoId: number;
    inicio: string;
    status: string;
    observacao: string | null;
  };
  /** Pré-preenchimento ao criar (ex.: vindo do filtro da lista). */
  padrao?: { barbeiroId?: number; clienteId?: number; inicio?: string };
};

export function AgendamentoForm({ clientes, barbeiros, servicos, agendamento, padrao }: AgendamentoFormProps) {
  // Na edição, mantém o barbeiro atual na lista mesmo se estiver inativo.
  const barbeirosVisiveis = barbeiros.filter((b) => b.ativo || b.id === agendamento?.barbeiroId);
  // Ignora pré-seleção inválida (cliente inexistente, barbeiro inativo); senão o navegador escolheria o primeiro da lista.
  const clientePadrao = clientes.some((c) => c.id === padrao?.clienteId) ? padrao?.clienteId : undefined;
  const barbeiroPadrao = barbeirosVisiveis.some((b) => b.id === padrao?.barbeiroId) ? padrao?.barbeiroId : undefined;

  return (
    <Formulario
      url={agendamento ? `/api/agendamentos/${agendamento.id}` : "/api/agendamentos"}
      metodo={agendamento ? "PUT" : "POST"}
      destino="/agendamentos"
      rotuloEnviar={agendamento ? "Salvar alterações" : "Agendar"}
    >
      <Campo nome="clienteId" rotulo="Cliente">
        <Selecao name="clienteId" defaultValue={agendamento?.clienteId ?? clientePadrao ?? ""} required>
          <option value="" disabled>
            Selecione…
          </option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Selecao>
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo nome="barbeiroId" rotulo="Barbeiro">
          <Selecao name="barbeiroId" defaultValue={agendamento?.barbeiroId ?? barbeiroPadrao ?? ""} required>
            <option value="" disabled>
              Selecione…
            </option>
            {barbeirosVisiveis.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
                {b.ativo ? "" : " (inativo)"}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo nome="servicoId" rotulo="Serviço">
          <Selecao name="servicoId" defaultValue={agendamento?.servicoId ?? ""} required>
            <option value="" disabled>
              Selecione…
            </option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {s.duracaoMin} min · {formatarPreco(s.precoCentavos)}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo nome="inicio" rotulo="Data e hora" dica="Horário de Brasília.">
          <Entrada
            name="inicio"
            type="datetime-local"
            step={300}
            defaultValue={agendamento?.inicio ?? padrao?.inicio ?? ""}
            required
          />
        </Campo>
        <Campo nome="status" rotulo="Status">
          <Selecao name="status" defaultValue={agendamento?.status ?? "AGENDADO"}>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {STATUS_ROTULO[s]}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>
      <Campo nome="observacao" rotulo="Observação" dica="Opcional.">
        <AreaTexto name="observacao" rows={3} defaultValue={agendamento?.observacao ?? ""} />
      </Campo>
    </Formulario>
  );
}
