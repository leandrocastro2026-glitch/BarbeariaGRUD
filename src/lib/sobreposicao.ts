export type Intervalo = { inicio: Date; fim: Date };

/** Intervalos semiabertos [inicio, fim): encostar um no outro não é conflito. */
export function haSobreposicao(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fim && a.fim > b.inicio;
}
