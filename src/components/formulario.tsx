"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { estiloBotao, estiloInput, estiloRotulo } from "./ui";

type Erros = Record<string, string[] | undefined>;
const ErrosContext = createContext<Erros>({});

/** Lê o formulário como objeto; checkboxes viram boolean (marcado ou não). */
function lerFormulario(form: HTMLFormElement): Record<string, unknown> {
  const dados: Record<string, unknown> = Object.fromEntries(new FormData(form));
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement && el.type === "checkbox" && el.name) dados[el.name] = el.checked;
  }
  return dados;
}

export function Formulario({
  url,
  metodo,
  destino,
  rotuloEnviar = "Salvar",
  children,
}: {
  url: string;
  metodo: "POST" | "PUT";
  destino: string;
  rotuloEnviar?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [erros, setErros] = useState<Erros>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setMensagem(null);
    try {
      const resp = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lerFormulario(e.currentTarget)),
      });
      if (!resp.ok) {
        const corpo = (await resp.json().catch(() => ({}))) as { erro?: string; campos?: Erros };
        setErros(corpo.campos ?? {});
        setMensagem(corpo.erro ?? "Não foi possível salvar.");
        return;
      }
      router.push(destino);
      router.refresh();
    } catch {
      setMensagem("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ErrosContext.Provider value={erros}>
      <form onSubmit={enviar} noValidate className="max-w-xl space-y-5 border border-linha bg-cartao p-6">
        {mensagem && (
          <div role="alert" className="border-l-4 border-verm bg-white px-4 py-3 text-sm text-verm">
            {mensagem}
          </div>
        )}
        {children}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={enviando} className={estiloBotao.primario}>
            {enviando ? "Salvando…" : rotuloEnviar}
          </button>
          <button type="button" onClick={() => router.back()} className={estiloBotao.secundario}>
            Cancelar
          </button>
        </div>
      </form>
    </ErrosContext.Provider>
  );
}

function useErro(nome: string) {
  return useContext(ErrosContext)[nome]?.[0];
}

export function Campo({
  nome,
  rotulo,
  dica,
  children,
}: {
  nome: string;
  rotulo: string;
  dica?: ReactNode;
  children: ReactNode;
}) {
  const erro = useErro(nome);
  return (
    <div className="space-y-1.5">
      <label htmlFor={nome} className={estiloRotulo}>
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${nome}-erro`} className="text-sm text-verm">
          {erro}
        </p>
      ) : (
        dica && <p className="text-xs text-sub italic">{dica}</p>
      )}
    </div>
  );
}

function propsDeErro(nome: string, erro: string | undefined) {
  return {
    id: nome,
    name: nome,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": erro ? `${nome}-erro` : undefined,
  };
}

export function Entrada({ name, ...props }: ComponentProps<"input"> & { name: string }) {
  const erro = useErro(name);
  return <input {...props} {...propsDeErro(name, erro)} className={estiloInput} />;
}

export function Selecao({ name, ...props }: ComponentProps<"select"> & { name: string }) {
  const erro = useErro(name);
  return <select {...props} {...propsDeErro(name, erro)} className={estiloInput} />;
}

export function AreaTexto({ name, ...props }: ComponentProps<"textarea"> & { name: string }) {
  const erro = useErro(name);
  return <textarea {...props} {...propsDeErro(name, erro)} className={estiloInput} />;
}
