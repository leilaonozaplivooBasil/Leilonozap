// 🐛 09/09/2026 — auditoria noturna do X-Pay (dinheiro real). Achado: no
// painel executivo (Visão Executiva do time), o X-Pay recuperado no fim de
// semana entrava em DOBRO contra a pessoa — contava como GANHO (linha
// r.xpay) e continuava contando como PERDIDO (linha r.perdido), porque o
// xpay_perdido gravado no dia original nunca é reescrito quando a tarefa é
// recuperada depois. O "X-Pay perdidos por atraso" mostrado pro dono ficava
// inflado pelo que a pessoa já tinha recuperado de volta.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ARQ = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx', import.meta.url), 'utf8');

test('XGameVisaoExecutiva.jsx: r.perdido subtrai o xpay_recuperado — o que foi recuperado sai da conta de "perdido"', () => {
  assert.match(
    ARQ,
    /r\.perdido \+= Math\.max\(0, \(Number\(d\.detalhes\?\.xpay_perdido\) \|\| 0\) - \(Number\(d\.detalhes\?\.xpay_recuperado\) \|\| 0\)\);/,
    'r.perdido precisa descontar o que já foi recuperado — senão o mesmo dinheiro conta como ganho E como perdido ao mesmo tempo',
  );
});
