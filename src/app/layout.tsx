import type { Metadata } from "next";
import { DM_Serif_Display, Work_Sans } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { CabecalhoUsuario } from "@/components/cabecalho-usuario";
import "./globals.css";

const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"] });
const dmSerif = DM_Serif_Display({ variable: "--font-dm-serif", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Barbearia", template: "%s · Barbearia" },
  description: "Gestão de clientes, barbeiros, serviços e agendamentos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${workSans.variable} ${dmSerif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="poste" aria-hidden="true" />
        <header className="border-b-2 border-tinta">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
            <Link href="/" className="leading-none">
              <span className="block font-serif text-[26px]">Barbearia</span>
              <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.3em] text-verm uppercase">
                cabelo · barba · bigode
              </span>
            </Link>
            <Suspense fallback={null}>
              <CabecalhoUsuario />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
