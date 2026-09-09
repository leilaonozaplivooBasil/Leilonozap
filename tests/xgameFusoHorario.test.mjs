// 🐛 09/09/2026 — dono, ao vivo no grupo do WhatsApp: "todos zerados... eu
// votei em geral!" Achado: CrmMetodo.jsx e XGameAdmin.jsx definiam
// hojeStr() com `new Date().toISOString().slice(0, 10)` — data em UTC. No
// Brasil (UTC-3), a partir das 21h locais o UTC já virou o dia seguinte —
// bem no fim da janela de votação (17h–21h30), a hora de maior movimento.
// Resultado: entre 21h e meia-noite local, toda leitura/escrita de voto e
// placar (xgame_votos_mvm, xgame_diario) caía num dia ERRADO — a checagem
// "votou em todo mundo hoje" buscava o voto na data de amanhã, não achava
// nada, e zerava quem tinha votado certinho.
//
// A prova é textual (não dá pra importar hojeStr — não é exportado, e
// re-implementar o bug aqui pra "provar" com Date.now() seria frágil):
// garante que os dois arquivos não voltam a usar toISOString() pra data de
// hoje, e que ambos reaproveitam dataISO() (xgame.js). ⚠️ dataISO() em si
// usava getFullYear/getMonth/getDate (hora do APARELHO) até a DIR-129 —
// ver os testes abaixo, que travam a versão corrigida (força Brasília).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dataISO, somarDiasISO, minutosBrasilia } from '../src/lib/xgame.js';

const CRM_METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
const XGAME_ADMIN = fs.readFileSync(new URL('../src/components/licensing/XGameAdmin.jsx', import.meta.url), 'utf8');
const XGAME_PAGE = fs.readFileSync(new URL('../src/pages/XGame.jsx', import.meta.url), 'utf8');

for (const [nome, codigo] of [['CrmMetodo.jsx', CRM_METODO], ['XGameAdmin.jsx', XGAME_ADMIN]]) {
  test(`${nome}: hojeStr() usa dataISO() (data local) — não toISOString() (UTC)`, () => {
    assert.match(codigo, /const hojeStr = \(\) => dataISO\(\);/, `${nome} não está usando dataISO() pra "hoje"`);
    assert.ok(!/const hojeStr = \(\) => new Date\(\)\.toISOString\(\)/.test(codigo), `${nome} voltou a usar toISOString() (fuso UTC) — reintroduz o bug das 21h`);
  });
}

// 🐛 DIR-129 (09/09/2026) — dono, de novo, achado concreto no banco: a
// leitura do Emannuel, feita às 21h11 de Brasília do dia 7, nasceu com
// `data: '2026-09-09'` (dois dias à frente). Causa: dataISO() usava
// getFullYear/getMonth/getDate — hora do APARELHO, não de Brasília. A
// suposição de que "hora local do aparelho == Brasília" é exatamente o
// tipo de confusão que o dono pediu pra nunca mais existir.
test('dataISO(): força America/Sao_Paulo sempre — não depende do fuso do aparelho', () => {
  // 21h11 em Brasília (UTC-3) do dia 7 é, em UTC, já 00h11 do dia 8 — um
  // relógio/fuso de aparelho que não seja Brasília bateria errado aqui.
  assert.equal(dataISO(new Date('2026-09-08T00:11:31.716Z')), '2026-09-07');
  // um minuto depois já é 21h00 em Brasília — ainda dia 7.
  assert.equal(dataISO(new Date('2026-09-08T00:00:00.000Z')), '2026-09-07');
  // no instante exato da virada de Brasília (00:00 BRT = 03:00 UTC).
  assert.equal(dataISO(new Date('2026-09-08T02:59:59.000Z')), '2026-09-07');
  assert.equal(dataISO(new Date('2026-09-08T03:00:00.000Z')), '2026-09-08');
});

test('src/lib/xgame.js: dataISO() usa Intl.DateTimeFormat com America/Sao_Paulo, não getFullYear/getMonth/getDate', () => {
  const XGAME = fs.readFileSync(new URL('../src/lib/xgame.js', import.meta.url), 'utf8');
  const inicio = XGAME.indexOf('export function dataISO');
  const fim = XGAME.indexOf('\n}', inicio);
  const corpo = XGAME.slice(inicio, fim);
  assert.match(corpo, /Intl\.DateTimeFormat\('en-CA',\s*\{\s*timeZone:\s*'America\/Sao_Paulo'\s*\}\)/, 'dataISO() precisa forçar Brasília — não pode voltar a depender do fuso do aparelho');
});

test('somarDiasISO(): soma/subtrai dias por calendário puro, sem tocar em fuso', () => {
  assert.equal(somarDiasISO('2026-09-07', 1), '2026-09-08');
  assert.equal(somarDiasISO('2026-09-07', -1), '2026-09-06');
  assert.equal(somarDiasISO('2026-09-30', 1), '2026-10-01'); // virada de mês
  assert.equal(somarDiasISO('2026-12-31', 1), '2027-01-01'); // virada de ano
  assert.equal(somarDiasISO('2026-09-07', 0), '2026-09-07');
});

test('CrmMetodo.jsx: mudarDia() usa somarDiasISO() (calendário puro) — não toISOString() (fuso do aparelho)', () => {
  assert.match(CRM_METODO, /const mudarDia = \(delta\) => \{\s*setDia\(somarDiasISO\(dia, delta\)\);/, 'mudarDia precisa usar somarDiasISO() em vez de montar Date local e reconverter por toISOString()');
  assert.ok(!/d\.toISOString\(\)\.slice\(0, 10\)\);\s*\};/.test(CRM_METODO), 'mudarDia voltou a depender do fuso do aparelho');
});

// 🐛 DIR-133 (09/09/2026) — auditoria do Ritual do Amanhecer, dono: "vamos
// ver se a gente melhora... algumas pessoas reclamaram que não conseguiram."
// Achado direto no banco: três pessoas reprovadas no ritual de hoje às
// 05h17–05h25 de Brasília pelo corte de 5h15 — que já tinha sido corrigido
// pra 5h30 no código minutos antes. A causa raiz: `agoraMin` (o relógio do
// jogo inteiro — janela do ritual, AGORA/ATRASADO/PERDIDO de toda tarefa, e
// a janela de votação do MvM em XGame.jsx) vinha de `d.getHours()*60 +
// d.getMinutes()` — hora LOCAL DO APARELHO, o mesmo erro exato da DIR-129,
// só que na hora do dia em vez da data.
test('minutosBrasilia(): força America/Sao_Paulo sempre — não depende do fuso do aparelho', () => {
  // 21h11 em Brasília (UTC-3) é 00h11 UTC do dia seguinte — um aparelho
  // rodando em UTC (ou qualquer fuso que não seja Brasília) bateria errado.
  assert.equal(minutosBrasilia(new Date('2026-09-08T00:11:00.000Z')), 21 * 60 + 11);
  // a virada exata de Brasília: 00:00 BRT = 03:00 UTC.
  assert.equal(minutosBrasilia(new Date('2026-09-08T02:59:00.000Z')), 23 * 60 + 59);
  assert.equal(minutosBrasilia(new Date('2026-09-08T03:00:00.000Z')), 0);
  // o corte real do ritual, 05h17 de Brasília (uma das três reprovações de hoje).
  assert.equal(minutosBrasilia(new Date('2026-09-09T08:17:00.000Z')), 5 * 60 + 17);
});

test('src/lib/xgame.js: minutosBrasilia() usa Intl.DateTimeFormat com America/Sao_Paulo, não getHours/getMinutes', () => {
  const XGAME = fs.readFileSync(new URL('../src/lib/xgame.js', import.meta.url), 'utf8');
  const inicio = XGAME.indexOf('export function minutosBrasilia');
  const fim = XGAME.indexOf('\n}', inicio);
  const corpo = XGAME.slice(inicio, fim);
  assert.match(corpo, /Intl\.DateTimeFormat\('en-GB',\s*\{/);
  assert.match(corpo, /timeZone:\s*'America\/Sao_Paulo'/);
});

test('CrmMetodo.jsx e XGame.jsx: o relógio do jogo (agoraMin) usa minutosBrasilia() — não getHours()/getMinutes() do aparelho', () => {
  assert.match(CRM_METODO, /const \[agoraMin, setAgoraMin\] = useState\(\(\) => minutosBrasilia\(\)\);/);
  assert.match(CRM_METODO, /setAgoraMin\(minutosBrasilia\(\)\)/);
  assert.ok(!/getHours\(\)\s*\*\s*60\s*\+.*getMinutes\(\)/.test(CRM_METODO), 'CrmMetodo.jsx voltou a depender do fuso do aparelho pro relógio do jogo');
  assert.match(XGAME_PAGE, /const agoraMin = minutosBrasilia\(agora\);/);
  assert.ok(!/getHours\(\)\s*\*\s*60\s*\+.*getMinutes\(\)/.test(XGAME_PAGE), 'XGame.jsx voltou a depender do fuso do aparelho pro relógio do jogo (afeta a janela de votação do MvM)');
});
