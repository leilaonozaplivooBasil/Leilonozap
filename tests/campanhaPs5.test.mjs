// 📣 Campanha do PS5 (26/09/2026) — a peça, a janela e quem recebe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { montarEmailPs5, dentroDaJanela, elegivel, primeiroNome, LINK, IMAGEM, JANELA, TIPO, CHAVE } from '../api/_lib/campanhaPs5.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const brt = (dia, hora) => new Date(`${dia}T${hora}:00-03:00`).getTime();

test('a peça: hora certa (ENCERRA às 18h), arte, um botão pro link do dono, link de saída, assunto sem caixa alta', () => {
  const m = montarEmailPs5({ nome: 'lilian lima', linkSaida: 'https://leilaonozap.net/api/functions/descadastrar?email=x&t=y' });
  assert.equal(m.assunto, 'PS5 no leilão: encerra hoje às 18h. Dê seu lance');
  assert.ok(m.assunto.length <= 70); assert.doesNotMatch(m.assunto, /[A-ZÁÉÍÓÚ]{4,}|!!/);
  assert.match(m.html, /Lilian, hoje é dia de oportunidade grande/);
  assert.match(m.html, /Às 18h encerra a disputa de um PS5 novo na caixa/, 'o PS5 fecha às 18h — não "entra em disputa"');
  assert.doesNotMatch(m.html, /entra em disputa/);
  assert.match(m.html, new RegExp(IMAGEM.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')));
  assert.equal((m.html.match(/Home\?ref=top/g) || []).length >= 2, true, 'arte e botão levam pro link do dono');
  assert.match(m.html, /Acesse sua conta e dê seu lance/);
  assert.match(m.html, /descadastrar\?email=x/);
  assert.match(m.html, /leia as regras da plataforma/);
  assert.match(m.texto, /Acesse sua conta e dê seu lance: https:\/\/leilaonozap\.net\/Home\?ref=top/);
  assert.equal(LINK, 'https://leilaonozap.net/Home?ref=top');
  // sem nome: a saudação some, não sai "undefined,"
  assert.match(montarEmailPs5({}).html, /<p[^>]*>Hoje é dia de oportunidade grande/);
});

test('primeiro nome: limpa e recusa recado no lugar de nome', () => {
  assert.equal(primeiroNome('ÂNGELA MARIA'), 'Ângela');
  assert.equal(primeiroNome('Vim pelo wendrel'), '');
  assert.equal(primeiroNome('P5 BEPE1'), '');
  assert.equal(primeiroNome(''), '');
});

test('janela: só 26/09 entre 12:30 e 17:30 de Brasília', () => {
  assert.equal(JANELA.dia, '2026-09-26');
  assert.equal(dentroDaJanela(brt('2026-09-26', '12:30')), true);
  assert.equal(dentroDaJanela(brt('2026-09-26', '15:00')), true);
  assert.equal(dentroDaJanela(brt('2026-09-26', '17:30')), true);
  assert.equal(dentroDaJanela(brt('2026-09-26', '12:29')), false);
  assert.equal(dentroDaJanela(brt('2026-09-26', '17:31')), false, 'perto do martelo (18h) não vale mais mandar');
  assert.equal(dentroDaJanela(brt('2026-09-27', '13:00')), false);
});

test('quem recebe: e-mail válido, ativo, aceita aviso, não saiu, não é caixa interna, ainda não recebeu — uma vez só', () => {
  const ok = { id: 'u1', email: 'Cliente@Gmail.com', active: true };
  assert.deepEqual(elegivel(ok), { ok: true, motivo: 'ok' });
  assert.equal(elegivel({ id: 'u2', email: 'c16504274762@concurso.leilaonozap.net' }).motivo, 'sintetico');
  assert.equal(elegivel({ id: 'u3', email: 'teste@hotmail.com' }).motivo, 'teste');
  assert.equal(elegivel({ id: 'u4', email: 'fulano@gmail.con' }).motivo, 'typo');
  assert.equal(elegivel({ id: 'u5', email: 'relacionamento@leilaonozap.com' }).motivo, 'interno');
  assert.equal(elegivel({ id: 'u6', email: 'a@b.com', active: false }).motivo, 'inativo');
  assert.equal(elegivel({ id: 'u7', email: 'a@b.com', avisos_leilao: false }).motivo, 'nao_aceita');
  assert.equal(elegivel({ id: 'u8', email: 'saiu@b.com' }, { descadastrados: new Set(['saiu@b.com']) }).motivo, 'descadastrado');
  assert.equal(elegivel({ id: 'u9', email: 'a@b.com' }, { jaReceberam: new Set(['u9']) }).motivo, 'ja_recebeu');
  assert.equal(elegivel({ email: 'a@b.com' }).motivo, 'sem_id');
  assert.equal(TIPO, 'campanha_ps5'); assert.equal(CHAVE, '2026-09-26');
});

test('🔒 a rota: só na janela, uma vez por pessoa, em lotes, teste só para caixa da casa; e o cron existe', () => {
  const R = ler('../api/functions/dispararCampanhaPs5.js');
  assert.match(R, /if \(!dentroDaJanela\(Date\.now\(\)\)\) return/);
  assert.match(R, /avisos_enviados\?select=user_id&tipo=eq\.\$\{TIPO\}&chave=eq\.\$\{CHAVE\}/);
  assert.match(R, /resolution=ignore-duplicates/);
  assert.match(R, /if \(!CAIXAS_DE_TESTE\.includes\(teste\)\) return res\.status\(403\)/);
  assert.match(R, /messageVersions: versoes/);
  assert.match(R, /email: 'ofertas@leilaonozap\.com'/, 'campanha sai do ofertas@, nunca do no-reply@ do código de login');
  const V = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  // 🗓️ o cron foi só do dia 26/09 e saiu depois do disparo (892 enviados, 0 falhas)
  assert.doesNotMatch(V, /dispararCampanhaPs5", "schedule"/);
  assert.match(V, /"api\/functions\/dispararCampanhaPs5\.js": \{ "maxDuration": 60 \}/);
});
