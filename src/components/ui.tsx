import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const estiloBotao = {
  primario:
    "inline-flex items-center justify-center bg-verm px-4 py-2.5 text-[13px] font-semibold tracking-[0.1em] text-white uppercase transition-colors hover:bg-verm-escuro disabled:opacity-50",
  secundario:
    "inline-flex items-center justify-center border-[1.5px] border-tinta bg-cartao px-4 py-2 text-[13px] font-semibold tracking-[0.1em] text-tinta uppercase transition-colors hover:bg-destaque disabled:opacity-50",
  perigo:
    "inline-flex items-center justify-center px-2 py-1 text-sm font-medium text-verm underline-offset-2 hover:underline disabled:opacity-50",
  link: "px-2 py-1 text-sm font-medium text-azul underline-offset-2 hover:underline",
};

export const estiloInput =
  "w-full border-[1.5px] border-linha bg-white px-3 py-2 text-sm text-tinta transition-colors focus:border-azul focus:outline-none aria-invalid:border-verm";

export const estiloRotulo = "block text-[11px] font-semibold tracking-[0.14em] text-sub uppercase";

export function Cabecalho({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-4xl leading-tight sm:text-[40px]">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-sub italic first-letter:uppercase">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}

export function LinkBotao({
  variante = "primario",
  ...props
}: ComponentProps<typeof Link> & { variante?: keyof typeof estiloBotao }) {
  return <Link {...props} className={estiloBotao[variante]} />;
}

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-linha bg-cartao ${className}`}>{children}</div>;
}

export function Tabela({ cabecalhos, children }: { cabecalhos: string[]; children: ReactNode }) {
  return (
    <Cartao className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b-2 border-tinta text-[11px] tracking-[0.14em] text-sub uppercase">
          <tr>
            {cabecalhos.map((c, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-linha">{children}</tbody>
      </table>
    </Cartao>
  );
}

export const estiloLinha = "transition-colors hover:bg-destaque/60";

export function Vazio({ children }: { children: ReactNode }) {
  return <Cartao className="px-6 py-12 text-center text-sm text-sub italic">{children}</Cartao>;
}

export function Carregando() {
  return (
    <Cartao className="px-6 py-12 text-center text-sm text-sub">
      <span role="status">Carregando…</span>
    </Cartao>
  );
}

export function Selo({ cor, children }: { cor: "verde" | "cinza" | "azul" | "vermelho"; children: ReactNode }) {
  const cores = {
    verde: "border-verde text-verde",
    cinza: "border-linha text-sub",
    azul: "border-azul text-azul",
    vermelho: "border-verm text-verm",
  };
  return (
    <span
      className={`inline-flex items-center border-[1.5px] px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] uppercase ${cores[cor]}`}
    >
      {children}
    </span>
  );
}
