import { describe, expect, it } from "vitest";
import { haSobreposicao } from "@/lib/sobreposicao";

const h = (hm: string) => new Date(`2026-12-01T${hm}:00-03:00`);
const intervalo = (a: string, b: string) => ({ inicio: h(a), fim: h(b) });

describe("haSobreposicao", () => {
  it("permite horário colado no anterior", () => {
    expect(haSobreposicao(intervalo("10:00", "10:30"), intervalo("10:30", "11:00"))).toBe(false);
    expect(haSobreposicao(intervalo("10:30", "11:00"), intervalo("10:00", "10:30"))).toBe(false);
  });

  it("detecta sobreposição parcial", () => {
    expect(haSobreposicao(intervalo("10:00", "10:45"), intervalo("10:30", "11:00"))).toBe(true);
  });

  it("detecta intervalo contido no outro", () => {
    expect(haSobreposicao(intervalo("10:00", "12:00"), intervalo("10:30", "11:00"))).toBe(true);
    expect(haSobreposicao(intervalo("10:30", "11:00"), intervalo("10:00", "12:00"))).toBe(true);
  });

  it("detecta intervalos idênticos", () => {
    expect(haSobreposicao(intervalo("10:00", "10:30"), intervalo("10:00", "10:30"))).toBe(true);
  });
});
