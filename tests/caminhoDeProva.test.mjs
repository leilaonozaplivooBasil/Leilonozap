// 🔴 O print não subia na segunda tentativa (08/09/2026).
// O caminho era fixo por usuário + dia + tarefa; a partir do segundo envio o
// Storage recusava com 400 (sobrescrever exige política de UPDATE, que não
// existe). Estes testes seguram as duas pontas: o caminho nunca repete, e o
// modal não engole mais a mensagem real do erro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { caminhoDeProva, caminhoSeguro } from '../src/lib/caminhoDeProva.js';
import { semComentarios } from './_ajuda.mjs';


const CRM = readFileSync(
  new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url),
  'utf8',
);

test('dois envios da MESMA tarefa, no mesmo dia, geram caminhos diferentes', () => {
  const base = { pasta: 'prints', uid: 'u1', dia: '2026-09-08', tarefaId: 't9', ext: 'jpg' };
  const vistos = new Set();
  for (let i = 0; i < 200; i++) vistos.add(caminhoDeProva(base));
  assert.equal(vistos.size, 200, 'caminho repetiu — o 400 do Storage volta');
});

test('o prefixo continua sendo dia_tarefa, pra prova seguir localizável', () => {
  const c = caminhoDeProva({ pasta: 'prints', uid: 'u1', dia: '2026-09-08', tarefaId: 't9', ext: 'jpg' });
  assert.ok(c.startsWith('xgame/prints/u1/2026-09-08_t9_'), c);
  assert.ok(c.endsWith('.jpg'), c);
});

test('caminho fica sem caractere que o Storage recusa', () => {
  const c = caminhoDeProva({
    pasta: 'prints', uid: 'usuário com espaço', dia: '2026-09-08',
    tarefaId: 'a/b?c', ext: '.PNG', unico: 'xyz',
  });
  assert.equal(c, 'xgame/prints/usu_rio_com_espa_o/2026-09-08_a_b_c_xyz.PNG');
});

test('sem extensão vira .bin, e não fica ponto solto no fim', () => {
  const c = caminhoDeProva({ pasta: 'rituais', uid: 'u', dia: 'd', tarefaId: 't', ext: '', unico: 'z' });
  assert.equal(c, 'xgame/rituais/u/d_t_z.bin');
});

test('campo vazio não vira barra dupla nem pasta anônima', () => {
  const c = caminhoDeProva({ pasta: '', uid: '', dia: '', tarefaId: '', ext: 'jpg', unico: 'z' });
  assert.equal(c, 'xgame/provas/sem-id/sem-dia_sem-tarefa_z.jpg');
});

test('caminhoSeguro preserva as pastas e limpa cada pedaço', () => {
  assert.equal(caminhoSeguro('xgame/prints/u 1/foto (2).jpg'), 'xgame/prints/u_1/foto__2_.jpg');
});

test('caminhoSeguro não deixa escapar da pasta', () => {
  assert.equal(caminhoSeguro('xgame/../../etc/senha'), 'xgame/etc/senha');
  assert.equal(caminhoSeguro('//a///b//'), 'a/b');
  assert.equal(caminhoSeguro(null), '');
});

test('UploadFile passa TODO caminho pela peneira, não só o automático', () => {
  const src = semComentarios(
    readFileSync(new URL('../src/api/plataformaAdapter.js', import.meta.url), 'utf8'),
  );
  const i = src.indexOf('async UploadFile(');
  assert.ok(i > 0, 'UploadFile sumiu do adapter');
  const corpo = src.slice(i, i + 700);
  assert.ok(corpo.includes('caminhoSeguro(path)'), 'caminho recebido de fora voltou a ir cru');
  assert.ok(!/\bpath \|\|/.test(corpo), 'voltou o `path ||` sem limpeza');
});

test('o modal monta os dois caminhos pelo helper, sem template fixo', () => {
  const src = semComentarios(CRM);
  assert.ok(src.includes("caminhoDeProva({ pasta: 'prints'"), 'print voltou ao caminho fixo');
  assert.ok(src.includes("caminhoDeProva({ pasta: 'rituais'"), 'ritual voltou ao caminho fixo');
  assert.ok(!src.includes('`xgame/prints/'), 'sobrou template fixo do print');
  assert.ok(!src.includes('`xgame/rituais/'), 'sobrou template fixo do ritual');
});

test('o erro do upload chega no usuário com o motivo real', () => {
  const src = semComentarios(CRM);
  const i = src.indexOf('Erro ao enviar a imagem');
  assert.ok(i > 0, 'mensagem de erro do print sumiu');
  const trecho = src.slice(Math.max(0, i - 400), i + 200);
  assert.ok(!/\}\s*catch\s*\{/.test(trecho), 'o catch voltou a ser vazio');
  assert.ok(trecho.includes('e?.message'), 'a mensagem do Storage voltou a ser engolida');
});
