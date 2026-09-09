// 🖼️ EDITAR O PRÓPRIO PERFIL — inclusive a foto (09/09/2026).
//
// Relato: a Iara tentou trocar a própria foto e levou
// "Erro ao atualizar perfil: Apenas admin pode editar usuários".
// Dono: "isso deve ser padrão para todos, alterar a própria foto é ok."
//
// A CAUSA ERA UMA PERGUNTA ERRADA. O adapter desviava pra rota do próprio
// cadastro só quando `!op` — quando a pessoa NÃO era operador. Quem tem cargo
// de estoque (distribuidor, loja física, ponto de retirada) ou é
// admin_financeiro caía no `adminUpdateUser`, que exige admin. Resultado ao
// contrário do esperado: o cliente comum salvava o próprio cadastro, o
// operador não. Eram 10 pessoas ativas nessa situação.
//
// A pergunta certa é "este cadastro é SEU?", não "você é operador?".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const ADAPTER = semComentarios(ler('../src/api/plataformaAdapter.js'));
const ROTA = semComentarios(ler('../api/functions/atualizarMeuCadastro.js'));

/** O trecho do adapter que decide o desvio pra rota do próprio cadastro. */
const DESVIO = (() => {
  const i = ADAPTER.indexOf("const _souAdmin");
  assert.ok(i > -1, 'sumiu o desvio do próprio cadastro no adapter');
  return ADAPTER.slice(i, ADAPTER.indexOf('atualizarMeuCadastro', i) + 200);
})();

test('🔴 o desvio pergunta "é o MEU cadastro?", não "sou operador?"', () => {
  assert.match(DESVIO, /_ehMeuCadastro/, 'a condição precisa olhar a posse do cadastro');
  assert.match(DESVIO, /String\(_eu\.id\) === String\(id\)/, 'a posse se prova comparando o id, não o cargo');
  // O `!op` sozinho é a regra velha: era ela que prendia o operador.
  assert.ok(!/if \(!op && table === 'app_users'/.test(ADAPTER),
    'voltou o `!op` — operador perde de novo o direito de editar o próprio perfil');
});

test('🔴 operador editando OUTRA pessoa não entra por aqui', () => {
  // Se entrasse, cairia no `_skip` e a escrita sumiria calada — o PONTO 130 de
  // volta, que é o pior desfecho possível: a tela diz que salvou e não salvou.
  const cond = DESVIO.slice(DESVIO.indexOf('if ('), DESVIO.indexOf('{', DESVIO.indexOf('if (')));
  assert.match(cond, /_ehMeuCadastro/, 'a posse tem que estar NA CONDIÇÃO, não só lá dentro');
});

test('admin continua pelo caminho antigo — senão troca um bug por outro', () => {
  // `atualizarMeuCadastro` tem lista fechada e não inclui role/career_levels.
  // Desviar admin pra cá faria o Painel de Controle perder, em silêncio, a
  // edição do próprio cargo.
  assert.match(DESVIO, /!_souAdmin/);
  assert.match(DESVIO, /\['admin', 'super_admin'\]\.includes\(op\?\.role\)/);
});

test('🖼️ a FOTO está na lista do que cada um pode mudar em si', () => {
  const lista = ROTA.slice(ROTA.indexOf('const MEUS_CAMPOS'), ROTA.indexOf('];', ROTA.indexOf('const MEUS_CAMPOS')));
  for (const campo of ['avatar_url', 'profile_photo_url']) {
    assert.match(lista, new RegExp(`'${campo}'`), `${campo} fora da lista — a pessoa não troca a própria foto`);
  }
});

test('🔴 mas a lista NÃO deixa ninguém se promover', () => {
  // O perigo do outro lado: "editar o próprio cadastro" virar "editar o próprio
  // cargo". Estes campos nunca podem entrar em MEUS_CAMPOS.
  const lista = ROTA.slice(ROTA.indexOf('const MEUS_CAMPOS'), ROTA.indexOf('];', ROTA.indexOf('const MEUS_CAMPOS')));
  for (const proibido of ['role', 'career_levels', 'primary_career_level', 'commission_balance', 'active', 'enabled_panels']) {
    assert.ok(!new RegExp(`'${proibido}'`).test(lista), `🔴 ${proibido} na lista do próprio cadastro = autopromoção`);
  }
});

test('🔴 a identidade vem do crachá, nunca do corpo da requisição', () => {
  // Sem isto, bastava mandar o id de outra pessoa no corpo pra editar o
  // cadastro dela — e a lista fechada não salvaria ninguém.
  assert.match(ROTA, /const eu = String\(ses\.userId\)/);
  assert.match(ROTA, /pedido !== eu/, 'o corpo pedindo outra pessoa tem que ser recusado');
  assert.match(ROTA, /cracha_de_outra_pessoa/);
});
