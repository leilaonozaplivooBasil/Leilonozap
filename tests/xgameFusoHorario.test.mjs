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
// hoje, e que ambos reaproveitam dataISO() (xgame.js), que já usa
// getFullYear/getMonth/getDate — sem sofrer com fuso.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const CRM_METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
const XGAME_ADMIN = fs.readFileSync(new URL('../src/components/licensing/XGameAdmin.jsx', import.meta.url), 'utf8');

for (const [nome, codigo] of [['CrmMetodo.jsx', CRM_METODO], ['XGameAdmin.jsx', XGAME_ADMIN]]) {
  test(`${nome}: hojeStr() usa dataISO() (data local) — não toISOString() (UTC)`, () => {
    assert.match(codigo, /const hojeStr = \(\) => dataISO\(\);/, `${nome} não está usando dataISO() pra "hoje"`);
    assert.ok(!/const hojeStr = \(\) => new Date\(\)\.toISOString\(\)/.test(codigo), `${nome} voltou a usar toISOString() (fuso UTC) — reintroduz o bug das 21h`);
  });
}
