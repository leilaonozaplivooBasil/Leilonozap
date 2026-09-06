// roteamentoSlack — de qual GRUPO do WhatsApp veio, pra qual CANAL do Slack vai.
//
// É a solicitação #3 que o próprio dono registrou no grupo TOP TECH DIGITAL em 05/09/2026,
// que ficou "aguardando autorização" desde as 07:30: "Criar e configurar integração do bot
// com o Slack para os grupos Top Tech, Top Tech Digital e Logística". O ponto de atenção que
// ele escreveu junto — "pra não postar no lugar errado" — é o que estes testes cobram.
//
// O caso do "-group" vs "@g.us" não é hipótese: em 27/08 essa diferença deixou a Heloim muda
// num grupo inteiro, sem log nenhum, porque a comparação era de string exata.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { digitos, lerMapaGrupoCanal, canalDoGrupo } from '../supabase/functions/whatsapp-router/roteamentoSlack.js';

const PADRAO = 'C0BHCMYJJGJ';           // #top-tech-leilão-nozap, o único canal que existe hoje
const TOP_TECH = '120363402599586067';  // id real do grupo TOP TECH DIGITAL

describe('lerMapaGrupoCanal', () => {
  test('lê pares separados por vírgula', () => {
    const m = lerMapaGrupoCanal(`${TOP_TECH}-group=C0BHCMYJJGJ,120363111111111111@g.us=#logistica-tech`);
    assert.equal(m.get(TOP_TECH), 'C0BHCMYJJGJ');
    assert.equal(m.get('120363111111111111'), 'logistica-tech');
  });

  test('aceita quebra de linha e ponto-e-vírgula, e apara espaço', () => {
    const m = lerMapaGrupoCanal(`  ${TOP_TECH}=C1 \n 222=C2 ; 333=C3 `);
    assert.deepEqual([...m.values()], ['C1', 'C2', 'C3']);
  });

  test('o "#" do nome do canal é removido — o Slack não quer ele na API', () => {
    assert.equal(lerMapaGrupoCanal(`${TOP_TECH}=#logistica-tech`).get(TOP_TECH), 'logistica-tech');
  });

  test('par torto é ignorado sem derrubar o resto do mapa', () => {
    const m = lerMapaGrupoCanal(`lixo,=C1,${TOP_TECH}=C0BHCMYJJGJ,222=,abc=C9`);
    assert.equal(m.get(TOP_TECH), 'C0BHCMYJJGJ', 'um par ruim comeu o mapa inteiro');
    assert.equal(m.size, 1);
  });

  test('grupo repetido: a primeira ocorrência vence, não a última', () => {
    assert.equal(lerMapaGrupoCanal(`${TOP_TECH}=PRIMEIRO,${TOP_TECH}=SEGUNDO`).get(TOP_TECH), 'PRIMEIRO');
  });

  test('secret vazio ou ausente devolve mapa vazio, não estoura', () => {
    for (const ruim of ['', undefined, null, {}, 42, []]) {
      assert.equal(lerMapaGrupoCanal(ruim).size, 0, `entrada ${String(ruim)}`);
    }
  });
});

describe('canalDoGrupo', () => {
  const mapa = lerMapaGrupoCanal(`${TOP_TECH}-group=C0BHCMYJJGJ,120363111111111111@g.us=#logistica-tech`);

  test('o MESMO grupo nos dois formatos cai no MESMO canal', () => {
    // é a regressão de 27/08: "-group" (Z-API) e "@g.us" (export/print) são o mesmo grupo
    for (const forma of [`${TOP_TECH}-group`, `${TOP_TECH}@g.us`, TOP_TECH, ` ${TOP_TECH} `]) {
      assert.deepEqual(canalDoGrupo(forma, mapa, PADRAO), { canal: 'C0BHCMYJJGJ', origem: 'mapa' },
        `formato "${forma}" não resolveu`);
    }
  });

  test('grupo fora do mapa vai pro canal padrão — nunca some', () => {
    const r = canalDoGrupo('999999999999999999-group', mapa, PADRAO);
    assert.equal(r.canal, PADRAO);
    assert.equal(r.origem, 'padrao', 'precisa dizer que caiu no padrão, pra dar pra avisar');
  });

  test('conversa 1:1 (sem grupo) vai pro padrão', () => {
    for (const nada of [null, undefined, '', {}]) {
      assert.equal(canalDoGrupo(nada, mapa, PADRAO).canal, PADRAO);
    }
  });

  test('mapa inválido não impede a publicação', () => {
    for (const ruim of [null, undefined, {}, 'texto']) {
      assert.equal(canalDoGrupo(`${TOP_TECH}-group`, ruim, PADRAO).canal, PADRAO);
    }
  });

  test('o "#" do canal padrão também sai', () => {
    assert.equal(canalDoGrupo(null, mapa, '#top-tech-leilao-nozap').canal, 'top-tech-leilao-nozap');
  });

  test('dois grupos diferentes NÃO se misturam — o ponto de atenção do dono', () => {
    const a = canalDoGrupo(`${TOP_TECH}-group`, mapa, PADRAO).canal;
    const b = canalDoGrupo('120363111111111111-group', mapa, PADRAO).canal;
    assert.notEqual(a, b, 'os dois grupos foram parar no mesmo canal');
  });
});

describe('digitos', () => {
  test('extrai só o número, em qualquer formato', () => {
    assert.equal(digitos('120363402599586067-group'), TOP_TECH);
    assert.equal(digitos('120363402599586067@g.us'), TOP_TECH);
  });
  test('lixo devolve vazio em vez de estourar', () => {
    for (const ruim of [null, undefined, {}, [], true, Symbol('x')]) assert.equal(digitos(ruim), '');
  });
});
