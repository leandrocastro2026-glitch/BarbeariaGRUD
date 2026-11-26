"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

export type ItemNav = { href: string; rotulo: string };

function Links({ itens, caminho }: { itens: ItemNav[]; caminho: string | null }) {
  return (
    <nav aria-label="Principal" className="flex flex-wrap gap-0.5 text-[12px] font-medium tracking-[0.12em] uppercase">
      {itens.map(({ href, rotulo }) => {
        const ativo = caminho !== null && (href === "/" ? caminho === "/" : caminho.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`px-2.5 py-1.5 transition-colors ${
              ativo ? "bg-tinta text-cartao" : "text-sub hover:bg-destaque hover:text-tinta"
            }`}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

function LinksComDestaque({ itens }: { itens: ItemNav[] }) {
  return <Links itens={itens} caminho={usePathname()} />;
}

/** O caminho atual só existe em tempo de requisição; o fallback sem destaque entra no shell. */
export function Navegacao({ itens }: { itens: ItemNav[] }) {
  return (
    <Suspense fallback={<Links itens={itens} caminho={null} />}>
      <LinksComDestaque itens={itens} />
    </Suspense>
  );
}
