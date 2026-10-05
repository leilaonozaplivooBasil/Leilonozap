// 🔨 "VENDIDO!" é do leilão, não da requisição (26/09/2026) — caso do Luciano no PS5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deveCelebrar, fraseDoVendido, JANELA_DO_F5_S } from '../src/lib/festaDoFim.js';

test('🎉 celebra só na transição ao vivo active → ended/sold, e uma vez', () => {
  assert.equal(deveCelebrar({ anterior: 'active', atual: 'ended', jaCelebrou: false }), true);
  assert.equal(deveCelebrar({ anterior: 'active', atual: 'sold', jaCelebrou: false }), true);
  assert.equal(deveCelebrar({ anterior: 'active', atual: 'ended', jaCelebrou: true }), false, 'já celebrou');
  assert.equal(deveCelebrar({ anterior: null, atual: 'ended', jaCelebrou: false }), false, 'abriu a sala já encerrada');
  assert.equal(deveCelebrar({ anterior: 'ended', atual: 'ended', jaCelebrou: false }), false);
  assert.equal(deveCelebrar({ anterior: 'scheduled', atual: 'active', jaCelebrou: false }), false, 'abrir não é vender');
  assert.equal(deveCelebrar({ anterior: 'active', atual: 'paused', jaCelebrou: false }), false);
});

test('💬 a frase do balão', () => {
  assert.equal(fraseDoVendido('Douglas Pimenta Pereira'), '🎉 VENDIDO para Douglas Pimenta Pereira! 🎉');
  assert.equal(fraseDoVendido(null), '🔨 Leilão encerrado!');
});

test('🏟️ a sala: a festa vive em celebrarFim, guardada por ref, e dispara pela transição de estado', () => {
  const R = readFileSync(new URL('../src/pages/AuctionRoom.jsx', import.meta.url), 'utf8');
  assert.match(R, /const celebrouRef = useRef\(false\);/);
  assert.match(R, /const celebrarFim = useCallback\(\(\{ winner_id, winner_name \} = \{\}\) => \{\n\s*if \(celebrouRef\.current\) return;\n\s*celebrouRef\.current = true;/);
  assert.match(R, /if \(deveCelebrar\(\{ anterior, atual, jaCelebrou: celebrouRef\.current, segundosDesdeOFim: desdeOFim \}\)\) \{\n\s*celebrarFim\(\{ winner_id: auction\?\.winner_id, winner_name: auction\?\.winner_name \}\);/);
  assert.match(R, /celebrarFim\(result\);/, 'a resposta do servidor continua celebrando (uma vez)');
  assert.equal((R.match(/playSound\('hammer'\)/g) || []).length, 3, 'as marteladas só existem dentro de celebrarFim');
  assert.doesNotMatch(R, /setTimeout\(\(\) => setShowWinnerModal\(true\), 4000\);[\s\S]*setTimeout\(\(\) => setShowWinnerModal\(true\), 4000\);/, 'o modal de 4s só num lugar');
});

test('🔄 a janela do F5 (01/10/2026): quem recarrega no segundo final ainda vê o VENDIDO', () => {
  assert.equal(JANELA_DO_F5_S, 45);
  // abriu a sala já encerrada, 10 s depois do fim: estava aqui na hora
  assert.equal(deveCelebrar({ anterior: null, atual: 'ended', jaCelebrou: false, segundosDesdeOFim: 10 }), true);
  assert.equal(deveCelebrar({ anterior: undefined, atual: 'sold', jaCelebrou: false, segundosDesdeOFim: 45 }), true, 'no limite');
  // chegou depois: 46 s, 10 min
  assert.equal(deveCelebrar({ anterior: null, atual: 'ended', jaCelebrou: false, segundosDesdeOFim: 46 }), false);
  assert.equal(deveCelebrar({ anterior: null, atual: 'ended', jaCelebrou: false, segundosDesdeOFim: 600 }), false);
  // encerrado à mão com end_time no futuro: não há "desde o fim" que valha
  assert.equal(deveCelebrar({ anterior: null, atual: 'ended', jaCelebrou: false, segundosDesdeOFim: -3600 }), false);
  // sem a medida, continua como era
  assert.equal(deveCelebrar({ anterior: null, atual: 'ended', jaCelebrou: false }), false);
  assert.equal(deveCelebrar({ anterior: null, atual: 'ended', jaCelebrou: false, segundosDesdeOFim: null }), false);
  // a janela NÃO vale para quem já estava com a sala aberta num estado que não é active
  assert.equal(deveCelebrar({ anterior: 'paused', atual: 'ended', jaCelebrou: false, segundosDesdeOFim: 5 }), false);
  // e nunca duas vezes
  assert.equal(deveCelebrar({ anterior: null, atual: 'ended', jaCelebrou: true, segundosDesdeOFim: 5 }), false);
});
