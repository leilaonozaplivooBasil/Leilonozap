// 🐛 "ESTÁ COM UM BUG" — 20/09/2026.
//
// Dono, ao vivo, batendo em "marcar como lida" repetidas vezes e a mesma
// notificação voltando toda vez que reabria a tela: "eu fico marcando como
// lida, como lida, e ela volta toda vez que eu abro. Está com um bug."
//
// Achado, direto no banco (não no código): `supabase.from('xgame_mensagens')
// .update({lida:true})`, chamado do navegador com o papel `anon`/
// `authenticated` — o mesmo que `SinoNotificacoes.jsx`/`MensagemProCeo.jsx`
// usavam — afeta ZERO linhas, mesmo a policy de UPDATE valendo pra qualquer
// linha (`qual: true`) e a coluna `lida` tendo GRANT UPDATE liberado pra
// esses papéis. A tela mentia: atualizava só o estado local (otimista), e a
// próxima busca (poll de 30s, ou reabrir a página) trazia `lida: false` de
// volta do banco — a mensagem de sete dias atrás (Emannuel Lima, 13/09)
// nunca tinha realmente virado lida uma vez sequer.
//
// A correção: a escrita da coluna `lida` sai do navegador e passa pela
// mesma rota de chave de serviço que já é a única porta de LEITURA desta
// tabela (`xgameMensagensListar.js`) — `xgameMensagensMarcarLida.js`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const SINO = semComentarios(readFileSync(new URL('../src/components/common/SinoNotificacoes.jsx', import.meta.url), 'utf8'));
const CEO = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/MensagemProCeo.jsx', import.meta.url), 'utf8'));

for (const [nome, texto] of [['SinoNotificacoes.jsx', SINO], ['MensagemProCeo.jsx', CEO]]) {
  test(`${nome}: marcarLida chama a rota de serviço, não mais o update direto no navegador`, () => {
    assert.match(texto, /fetch\('\/api\/functions\/xgameMensagensMarcarLida', \{/);
    assert.match(texto, /body: JSON\.stringify\(\{ actorId: uid, mensagemId: m\.id \}\)/);
    assert.doesNotMatch(texto, /supabase\.from\('xgame_mensagens'\)\.update/, 'voltou o UPDATE direto — o mesmo que provamos que não escreve nada no banco');
  });
}

test('a rota nova existe e confere que a mensagem é endereçada a quem está marcando (não deixa marcar a de qualquer um)', () => {
  const rota = semComentarios(readFileSync(new URL('../api/functions/xgameMensagensMarcarLida.js', import.meta.url), 'utf8'));
  assert.match(rota, /const ehDestinatario = mensagensRecebidasPor\(\[mensagem\], \{ userId: actorId, papeis \}\)\.length > 0;/);
  assert.match(rota, /if \(!ehDestinatario\) return res\.status\(403\)/);
  assert.match(rota, /method: 'PATCH'/);
});
