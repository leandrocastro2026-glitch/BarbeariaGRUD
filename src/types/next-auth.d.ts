import type { DefaultSession } from "next-auth";
import type { Perfil } from "@/lib/permissoes";

declare module "next-auth" {
  interface User {
    perfil?: Perfil;
    versaoSessao?: number;
  }
  interface Session {
    user: { id: string; perfil: Perfil; versaoSessao: number } & DefaultSession["user"];
  }
}
