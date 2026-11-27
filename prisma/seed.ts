// Usa o client do app para que nomes, telefones e e-mails já sejam gravados cifrados.
import { prisma } from "../src/lib/prisma";

/** Horário de hoje em Brasília, ex.: hoje("14:30"). */
function hoje(hm: string, diasAFrente = 0) {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const d = new Date(`${dia}T${hm}:00-03:00`);
  return new Date(d.getTime() + diasAFrente * 86_400_000);
}

async function main() {
  if ((await prisma.cliente.count()) > 0) {
    console.log("Banco já possui dados; seed ignorado.");
    return;
  }

  const [ana, bruno, carla] = await Promise.all([
    prisma.cliente.create({ data: { nome: "Ana Souza", telefone: "(11) 98888-1111", email: "ana@exemplo.com" } }),
    prisma.cliente.create({ data: { nome: "Bruno Lima", telefone: "(11) 97777-2222" } }),
    prisma.cliente.create({ data: { nome: "Carla Mendes", telefone: "(11) 96666-3333", email: "carla@exemplo.com" } }),
  ]);
  const [joao, pedro] = await Promise.all([
    prisma.barbeiro.create({ data: { nome: "João Silva", telefone: "(11) 3333-4444", especialidade: "Degradê" } }),
    prisma.barbeiro.create({ data: { nome: "Pedro Alves", telefone: "(11) 3333-5555", especialidade: "Barba" } }),
    prisma.barbeiro.create({ data: { nome: "Rafael Costa", telefone: "(11) 3333-6666", ativo: false } }),
  ]);
  const [corte, barba, combo] = await Promise.all([
    prisma.servico.create({ data: { nome: "Corte", precoCentavos: 4000, duracaoMin: 30 } }),
    prisma.servico.create({ data: { nome: "Barba", precoCentavos: 3000, duracaoMin: 20 } }),
    prisma.servico.create({ data: { nome: "Corte + Barba", precoCentavos: 6500, duracaoMin: 50 } }),
  ]);

  const novo = (clienteId: number, barbeiroId: number, s: typeof corte, inicio: Date, status = "AGENDADO") =>
    prisma.agendamento.create({
      data: {
        clienteId,
        barbeiroId,
        servicoId: s.id,
        inicio,
        fim: new Date(inicio.getTime() + s.duracaoMin * 60_000),
        status,
      },
    });

  await novo(ana.id, joao.id, corte, hoje("09:00"), "CONCLUIDO");
  await novo(bruno.id, joao.id, combo, hoje("10:00"));
  await novo(carla.id, pedro.id, barba, hoje("10:00"));
  await novo(ana.id, pedro.id, corte, hoje("15:30"), "CANCELADO");
  await novo(bruno.id, joao.id, corte, hoje("11:00", 1));

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
