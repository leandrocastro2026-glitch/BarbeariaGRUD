const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatarPreco = (centavos: number) => BRL.format(centavos / 100);

/** 3550 → "35,50" para preencher o campo de preço. */
export const centavosParaInput = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");
