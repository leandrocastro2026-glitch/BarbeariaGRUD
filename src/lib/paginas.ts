import { notFound } from "next/navigation";
import { NotFoundError } from "./erros";

/** Converte NotFoundError do serviço na página 404 do Next. */
export async function ouNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}
