// O pronto com prazo e o enviar-e-voltar (06/09/2026): "começar tal hora e
// entregar até tal hora; aparece pra ele dar o pronto até; a gente cobra".
import test from 'node:test';
import assert from 'node:assert/strict';
import { prazoDe, rotuloDoPrazo, estadoDoPronto, carimboDoPronto, carimboDaDevolucao, filaDoPronto, textoCompartilharPronto } from '../src/lib/pronto.js';

// 🐛 09/09/2026 — auditoria noturna: dia+hora precisam virar Brasília de
// verdade, não o fuso do aparelho que roda o código (o CI/produção rodam em
// UTC) — o mesmo bug de classe já corrigido em dataISO()/minutosBrasilia().
// 17:30 em Brasília (UTC-3) é 20:30 em UTC — é isso que trava aqui.
test('prazoDe: dia + hora viram o "pronto até" sempre em Brasília (UTC-3), não no fuso do aparelho; sem hora, 18:00', () => {
  assert.equal(prazoDe('2026-09-08', '17:30'), '2026-09-08T20:30:00.000Z');
  assert.equal(prazoDe('2026-09-08'), '2026-09-08T21:00:00.000Z');
  assert.equal(prazoDe(''), null);
  assert.equal(prazoDe('xx'), null);
});

test('rotuloDoPrazo: só a hora quando é hoje; dia e hora quando não é', () => {
  assert.equal(rotuloDoPrazo(prazoDe('2026-09-08', '18:00'), '2026-09-08'), 'pronto até 18:00');
  assert.equal(rotuloDoPrazo(prazoDe('2026-09-09', '09:15'), '2026-09-08'), 'pronto até 09/09 09:15');
  assert.equal(rotuloDoPrazo(null), null);
});

test('estadoDoPronto: aguardando → atrasada → pronto (no prazo ou atrasado) → conferida; devolvida espera a pessoa', () => {
  const prazo = prazoDe('2026-09-08', '18:00'); // 18:00 em Brasília
  const antes = new Date('2026-09-08T15:00:00-03:00'); // antes das 18:00 em Brasília
  const depois = new Date('2026-09-08T19:00:00-03:00'); // depois das 18:00 em Brasília
  assert.equal(estadoDoPronto({ prazo_em: prazo }, antes).id, 'aguardando');
  assert.equal(estadoDoPronto({ prazo_em: prazo }, depois).id, 'atrasada');
  assert.deepEqual(estadoDoPronto({ prazo_em: prazo, feito: true, pronto_em: antes.toISOString() }, depois), { id: 'pronto', rotulo: 'pronto', atrasou: false });
  assert.deepEqual(estadoDoPronto({ prazo_em: prazo, feito: true, pronto_em: depois.toISOString() }, depois), { id: 'pronto', rotulo: 'pronto (atrasado)', atrasou: true });
  assert.equal(estadoDoPronto({ prazo_em: prazo, feito: true, conferido: true, pronto_em: antes.toISOString() }, depois).id, 'conferida');
  assert.equal(estadoDoPronto({ prazo_em: prazo, devolvida_motivo: 'faltou o print' }, antes).id, 'devolvida');
  assert.equal(estadoDoPronto({}, antes).id, 'aguardando', 'sem prazo nunca atrasa');
});

test('os carimbos: dar o pronto limpa a devolução; devolver desfaz o pronto e o SIM, com o recado', () => {
  const agora = new Date('2026-09-08T16:00:00');
  assert.deepEqual(carimboDoPronto(true, agora), { feito: true, pronto_em: agora.toISOString(), devolvida_motivo: null, devolvida_em: null });
  assert.deepEqual(carimboDoPronto(false, agora), { feito: false, pronto_em: null });
  assert.deepEqual(carimboDaDevolucao('  faltou o print ', agora), { feito: false, pronto_em: null, conferido: null, devolvida_motivo: 'faltou o print', devolvida_em: agora.toISOString() });
  assert.equal(carimboDaDevolucao('', agora).devolvida_motivo, 'refazer');
});

test('filaDoPronto: só as distribuídas, atrasadas primeiro, depois os prontos a conferir; conferidas por último', () => {
  const agora = new Date('2026-09-08T19:00:00-03:00'); // depois das 18:00 em Brasília
  const prazo = prazoDe('2026-09-08', '18:00');
  const fila = filaDoPronto([
    { id: 'rotina', titulo: 'Gratidão' },
    { id: 'c', origem: 'xperf', prazo_em: prazo, feito: true, conferido: true, pronto_em: '2026-09-08T10:00:00Z' },
    { id: 'p', origem: 'xperf', prazo_em: prazo, feito: true, pronto_em: '2026-09-08T10:00:00Z' },
    { id: 'a', origem: 'xperf', prazo_em: prazo },
    { id: 'd', origem: 'xperf', prazo_em: prazo, devolvida_motivo: 'x' },
    { id: 'g', origem: 'xperf', prazo_em: prazoDe('2026-09-09', '18:00') },
  ], agora);
  assert.deepEqual(fila.map((f) => [f.tarefa.id, f.estado.id]), [['a', 'atrasada'], ['p', 'pronto'], ['d', 'devolvida'], ['g', 'aguardando'], ['c', 'conferida']]);
});

// 📲 09/09/2026 — dono: "tinha um botão WhatsApp aqui... a gente tirou
// porque ia mandar mensagem mais personalizada, mais bonita... só um texto
// mesmo, mas bem bonito." O compartilhamento volta, com texto pronto.
test('textoCompartilharPronto: usa o primeiro nome, o título e o prazo — um lembrete, não cobrança', () => {
  const t = { titulo: 'Fechar a proposta da loja Norte', data: '2026-09-09', prazo_em: prazoDe('2026-09-09', '18:00') };
  const texto = textoCompartilharPronto(t, 'Emannuel Alves de Lima');
  assert.match(texto, /Oi Emannuel!/);
  assert.match(texto, /Fechar a proposta da loja Norte/);
  assert.match(texto, /pronto até 18:00/);
  assert.match(texto, /X-GAME/);
  assert.ok(!/cobrando|atrasad|zerar|zerou/i.test(texto), 'é lembrete gentil, não a cobrança do "avisar"');
});

test('textoCompartilharPronto: sem prazo ou sem nome, não quebra', () => {
  assert.doesNotThrow(() => textoCompartilharPronto({ titulo: 'Tarefa qualquer' }, ''));
  const texto = textoCompartilharPronto({ titulo: 'Tarefa qualquer' }, '');
  assert.match(texto, /Oi você!/);
});
