// 🎙️ DITADO NO DIÁRIO DE BOLSO E NO CRM — DIR-101, Fase 5 (09/09/2026).
//
// Os dois lugares onde falar é mais natural que digitar por motivos opostos:
// o diário porque é retrospectivo (a pessoa está recapitulando), o CRM porque
// o vendedor acabou de desligar o telefone, muitas vezes na rua.
//
// A DIFERENÇA QUE ESTES TESTES SEGURAM: aqui o áudio NÃO é guardado. A voz da
// gratidão é acervo (o dono pediu pra guardar); anotação de cliente e lembrete
// de tarefa são dado operacional. Guardar gravação de todo mundo sem uso é
// armazenamento por armazenamento — e ainda por cima com a voz de terceiros
// falando de negócio alheio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const DIARIO = semComentarios(ler('../src/components/licensing/CentralVendas/DiarioDeBolso.jsx'));
const CRM = semComentarios(ler('../src/components/licensing/CentralVendas/CrmContatoRegistroModal.jsx'));

test('o diário de bolso ganhou microfone na nota pessoal', () => {
  assert.match(DIARIO, /const ditado = useDitado\(/);
  assert.match(DIARIO, /setRascunho\(\(atual\) => juntarTexto\(atual, t\)\)/);
  assert.match(DIARIO, /<BotaoDitado/);
});

test('o registro de contato do CRM ganhou microfone', () => {
  assert.match(CRM, /const ditado = useDitado\(/);
  assert.match(CRM, /setObs\(\(atual\) => juntarTexto\(atual, t\)\)/);
  assert.match(CRM, /<BotaoDitado/);
});

test('aqui o áudio NÃO é guardado — é dado operacional, não acervo', () => {
  for (const [nome, fonte] of [['diário', DIARIO], ['CRM', CRM]]) {
    assert.ok(!/guardarAudio|caminhoDoAudio|cofreDeAudio/.test(fonte),
      `${nome}: apareceu gravação de áudio onde a decisão foi não guardar`);
    // o segundo argumento do onTexto (o blob) nem é recebido
    assert.match(fonte, /onTexto: \(t\) =>/, `${nome}: o blob não deve ser pego`);
  }
});

test('o texto ditado cai no campo, e o salvar continua sendo da pessoa', () => {
  // Nenhuma das duas telas pode gravar sozinha depois de transcrever.
  assert.match(DIARIO, /onClick=\{\(\) => salvarNota\(e\.id\)\}/);
  assert.ok(!/ditado[\s\S]{0,200}salvarNota\(/.test(DIARIO), 'o ditado não pode disparar o salvar');
});
