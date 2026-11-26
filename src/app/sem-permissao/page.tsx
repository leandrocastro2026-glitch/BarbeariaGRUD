import type { Metadata } from "next";
import { Cartao, LinkBotao } from "@/components/ui";

export const metadata: Metadata = { title: "Sem permissão" };

export default function SemPermissaoPage() {
  return (
    <Cartao className="mx-auto max-w-md border-t-[3px] border-t-verm p-8 text-center">
      <h1 className="font-serif text-3xl">Sem permissão</h1>
      <p className="mt-2 mb-6 text-sm text-sub">
        O seu perfil não tem acesso a esta área. Se precisar, peça a um administrador.
      </p>
      <LinkBotao href="/" variante="secundario">
        Voltar para a agenda
      </LinkBotao>
    </Cartao>
  );
}
