/**
 * 🧠 DO NÓ DO MAPA PARA A FILA QUE JÁ EXISTE.
 *
 * Pedido do dono (áudio de 19/09/2026): esvaziar a mente e "automaticamente eu
 * já transformo isso e direciono para onde eu quero".
 *
 * O risco desta peça não é o desenho. É PERDER uma anotação (linha sem dono,
 * que não aparece em painel nenhum) ou GRAVAR a mesma duas vezes — e aí o dono
 * vê na fila trabalho que ele pediu uma vez só.
 *
 * 🔴 Este arquivo já testou uma tabela `demandas` própria. Ela foi removida em
 * 21/09: a casa já tinha `xperf_demandas`. O que sobrou para testar é só o que
 * é de verdade novo.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  demandaDoNo, jaEstaNaFila, rotuloDaOrigem,
  ORIGEM_MAPA, RECEBIDA, PESO_NEUTRO,
} from '../src/lib/demandas.js';

const no = (over = {}) => ({ id: 'n1', texto: 'ligar pro fornecedor', ...over });
const QUEM = { pessoaId: 'u1', pessoaNome: 'Basil' };

describe('demandaDoNo — a linha que nasce do mapa', () => {
  test('monta a linha de xperf_demandas com o texto do nó', () => {
    const d = demandaDoNo(no(), QUEM);
    assert.equal(d.titulo, 'ligar pro fornecedor');
    assert.equal(d.pessoa_id, 'u1');
    assert.equal(d.pessoa_nome, 'Basil');
    assert.equal(d.origem, ORIGEM_MAPA);
    assert.equal(d.status, RECEBIDA);
  });

  test('quem anotou é quem faz — pessoa e criador são o mesmo', () => {
    // é a mente DELE sendo esvaziada; redirecionar é decisão do Painel, depois.
    const d = demandaDoNo(no(), QUEM);
    assert.equal(d.criado_por_id, d.pessoa_id);
  });

  test('peso nunca sai nulo', () => {
    // o Painel imprime "· peso {d.peso}" sem condicional: nulo vira "· peso "
    // pendurado na linha, e quem lê acha que o dado sumiu.
    const d = demandaDoNo(no(), QUEM);
    assert.equal(d.peso, PESO_NEUTRO);
    assert.ok(d.peso >= 1 && d.peso <= 6, 'o CHECK do banco é 1..6');
  });

  test('sem dono devolve null em vez de gravar órfã', () => {
    // linha sem pessoa_id não aparece em painel nenhum: some em silêncio,
    // que é o pior destino possível para algo recém-anotado.
    assert.equal(demandaDoNo(no(), { pessoaId: null }), null);
    assert.equal(demandaDoNo(no(), {}), null);
    assert.equal(demandaDoNo(no()), null);
  });

  test('nó vazio ou só com espaço não vira demanda', () => {
    assert.equal(demandaDoNo(no({ texto: '' }), QUEM), null);
    assert.equal(demandaDoNo(no({ texto: '   ' }), QUEM), null);
    assert.equal(demandaDoNo(no({ texto: null }), QUEM), null);
    assert.equal(demandaDoNo(null, QUEM), null);
  });

  test('apara o espaço das pontas', () => {
    assert.equal(demandaDoNo(no({ texto: '  comprar caixa  ' }), QUEM).titulo, 'comprar caixa');
  });

  test('corta título gigante em 300', () => {
    const d = demandaDoNo(no({ texto: 'x'.repeat(500) }), QUEM);
    assert.equal(d.titulo.length, 300);
  });

  test('sem nome a demanda ainda nasce — nome é enfeite', () => {
    const d = demandaDoNo(no(), { pessoaId: 'u1' });
    assert.equal(d.pessoa_nome, null);
    assert.equal(d.titulo, 'ligar pro fornecedor');
  });

  test('não inventa encontro nem detalhe', () => {
    const d = demandaDoNo(no(), QUEM);
    assert.equal(d.encontro_id, null);
    assert.equal(d.detalhe, null);
  });

  test('pessoaId numérico vira texto — a coluna é text', () => {
    const d = demandaDoNo(no(), { pessoaId: 42 });
    assert.equal(d.pessoa_id, '42');
    assert.equal(typeof d.pessoa_id, 'string');
  });
});

describe('jaEstaNaFila — a trava contra duplicata', () => {
  const fila = [
    { id: 'a', titulo: 'ligar pro fornecedor', origem: ORIGEM_MAPA },
    { id: 'b', titulo: 'fechar o caixa', origem: ORIGEM_MAPA },
  ];

  test('acha o que já está lá', () => {
    assert.equal(jaEstaNaFila(fila, 'ligar pro fornecedor'), true);
  });

  test('deixa passar o que é novo', () => {
    assert.equal(jaEstaNaFila(fila, 'comprar etiqueta'), false);
  });

  test('ignora caixa e espaço sobrando — é o mesmo pedido', () => {
    // o dono reescreve o nó com outra capitalização e clica de novo; para ele
    // é a mesma coisa, e o sistema não pode discordar.
    assert.equal(jaEstaNaFila(fila, 'LIGAR PRO FORNECEDOR'), true);
    assert.equal(jaEstaNaFila(fila, '  ligar   pro  fornecedor  '), true);
  });

  test('demanda de OUTRA origem com o mesmo título não bloqueia', () => {
    // uma demanda do encontro chamada igual é outra coisa, pedida por outra
    // pessoa em outro contexto — barrar o mapa por causa dela esconderia o
    // pedido do dono.
    const comEncontro = [{ id: 'c', titulo: 'fechar o caixa', origem: 'encontro' }];
    assert.equal(jaEstaNaFila(comEncontro, 'fechar o caixa'), false);
  });

  test('título vazio nunca conta como já existente', () => {
    // senão um nó em branco seria tratado como duplicata e o erro real
    // ("sem título") nunca apareceria.
    assert.equal(jaEstaNaFila(fila, ''), false);
    assert.equal(jaEstaNaFila(fila, '   '), false);
    assert.equal(jaEstaNaFila(fila, null), false);
  });

  test('aguenta fila vazia, nula e com buraco', () => {
    assert.equal(jaEstaNaFila([], 'qualquer'), false);
    assert.equal(jaEstaNaFila(null, 'qualquer'), false);
    assert.equal(jaEstaNaFila(undefined, 'qualquer'), false);
    assert.equal(jaEstaNaFila([null, undefined, ...fila], 'fechar o caixa'), true);
  });
});

describe('rotuloDaOrigem', () => {
  test('o mapa tem nome próprio', () => {
    assert.equal(rotuloDaOrigem(ORIGEM_MAPA), 'do mapa mental');
  });

  test('as origens que já existiam seguem com o rótulo delas', () => {
    assert.equal(rotuloDaOrigem('encontro'), 'do encontro');
    assert.equal(rotuloDaOrigem('ceo'), 'do CEO');
  });

  test('origem desconhecida devolve ela mesma, não quebra', () => {
    assert.equal(rotuloDaOrigem('zeca'), 'zeca');
    assert.equal(rotuloDaOrigem(''), 'anotada');
    assert.equal(rotuloDaOrigem(null), 'anotada');
  });
});
