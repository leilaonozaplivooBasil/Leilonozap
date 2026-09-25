// 🃏 PADRÃO DOS CARDS (25/09/2026) — regras puras e a montagem.
// Dono: "os cards ficam sempre diferentes uns dos outros… o relógio ocupa muito
// espaço". Viu A e B lado a lado na banca e escolheu A.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { prazoDoCard, CLASSES_DO_TITULO_FIXO } from '../src/lib/padraoDoCard.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const DIA = 24 * 60 * 60 * 1000;

test('dias e HH:MM:SS ficam como estão; urgente passa junto', () => {
  assert.deepEqual(prazoDoCard({ text: '4 dias', isUrgent: false }, new Date(Date.now() + 4 * DIA)), { texto: '4 dias', ehData: false, urgente: false });
  assert.deepEqual(prazoDoCard({ text: '00:09:12', isUrgent: true }, new Date(Date.now() + 9 * 60000)), { texto: '00:09:12', ehData: false, urgente: true });
});

test('📅 em SEMANAS o card mostra a data ("até dd/mm"), não "1 semana" — régua de 03/09 e 17/09', () => {
  const fim = new Date(Date.now() + 12 * DIA);
  const r = prazoDoCard({ text: '1 semana', isUrgent: false }, fim);
  assert.equal(r.ehData, true);
  const dia = fim.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
  assert.equal(r.texto, `até ${dia}`);
  assert.equal(prazoDoCard({ text: '2 semanas' }, null).texto, '2 sem', 'sem data confiável, encurta em vez de inventar');
  assert.equal(prazoDoCard({ text: '2 semanas' }, 'lixo').texto, '2 sem');
});

test('sem contagem, ou "Encerrado", não há prazo', () => {
  assert.equal(prazoDoCard(null, Date.now()), null);
  assert.equal(prazoDoCard({ text: 'Encerrado' }, Date.now()), null);
  assert.equal(prazoDoCard({ text: '' }, Date.now()), null);
});

test('🧱 a montagem do padrão: título fixo, card esticado, linhas reservadas, botões no rodapé', () => {
  assert.equal(CLASSES_DO_TITULO_FIXO, 'min-h-[2rem] sm:min-h-[3rem] md:min-h-[3.5rem]');
  const C = ler('../src/components/auction/AuctionCard.jsx');
  assert.match(C, /const classesDoCard = `\$\{cardStyles\} h-full flex flex-col`;/);
  assert.match(C, /line-clamp-2 break-words overflow-wrap-anywhere \$\{CLASSES_DO_TITULO_FIXO\}/);
  assert.match(C, /<CardContent className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col"/);
  assert.match(C, /data-teste="linha-do-lider"[^>]*min-h-\[1rem\]/);
  assert.match(C, /mb-3 sm:mb-4 min-h-\[24px\] sm:min-h-\[28px\]/, 'a linha de lances/compre-já tem altura reservada');
  assert.equal((C.match(/className="space-y-2 sm:space-y-3 mt-auto"/g) || []).length, 2, 'os botões descem pro rodapé (ativo e encerrado)');
  // as grades que exibem cards nivelam a altura da linha
  for (const f of ['../src/pages/Home.jsx', '../src/components/home/DestaquesLeiloes.jsx', '../src/pages/DiretoDeFabrica.jsx', '../src/pages/ProtecaoCriacao.jsx']) {
    assert.match(ler(f), /auto-rows-fr/, `${f} sem auto-rows-fr`);
  }
});

test('⭐ os DESTAQUES usam a MESMA grade da vitrine: 2 lado a lado no celular, 3 no desktop', () => {
  // dono (25/09): "os leilões em destaque também precisam estar no padrão dos
  // outros cards de leilão, sempre lado a lado" — a grade era grid-cols-1 no celular
  const D = ler('../src/components/home/DestaquesLeiloes.jsx');
  assert.match(D, /className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 auto-rows-fr" data-teste="grade-destaques"/);
  assert.doesNotMatch(D, /grid-cols-1/, 'sobrou grade de 1 coluna nos destaques');
});
