// 🎯 O placar do dia — um alerta por vez e a explicação fora do title= (DIR-180)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { alertaDoDia, explicacoesDoPlacar } from '../src/lib/placarDoDia.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('dia limpo não inventa alerta nenhum', () => {
  assert.equal(alertaDoDia(), null);
  assert.equal(alertaDoDia({ liberacao: null, avisosPronto: 2 }), null);
  // liberação SEM hora não é liberação
  assert.equal(alertaDoDia({ liberacao: { motivo: 'corrida da empresa' } }), null);
});

test('um alerta por vez: o mais grave vence os outros três', () => {
  // os quatro disparando juntos → só o zero por não votar aparece
  const todos = {
    naoVotou: true, atrasouPronto: true, emAvisoPronto: true,
    liberacao: { ate_hora: '09:00', motivo: 'corrida' }, horaFimVotacao: '18:00',
  };
  assert.equal(alertaDoDia(todos).tipo, 'zerado-nao-votou');
  assert.equal(alertaDoDia(todos).tom, 'grave');
  assert.ok(alertaDoDia(todos).titulo.includes('18:00'));

  // sem o não-votar, o atraso do pronto assume
  assert.equal(alertaDoDia({ ...todos, naoVotou: false }).tipo, 'zerado-atraso');
  // sem os dois zeros, o aviso âmbar assume
  assert.equal(alertaDoDia({ ...todos, naoVotou: false, atrasouPronto: false }).tipo, 'aviso-pronto');
  // e só então a liberação verde
  assert.equal(alertaDoDia({ ...todos, naoVotou: false, atrasouPronto: false, emAvisoPronto: false }).tipo, 'liberado');
});

test('o aviso conta certo e avisa quando o próximo zera tudo', () => {
  const dois = alertaDoDia({ emAvisoPronto: true, avisosPronto: 1, avisosAntesDeZerar: 3 });
  assert.ok(dois.titulo.startsWith('⚠️ AVISO 2 DE 3'));
  assert.ok(dois.texto.includes('sobe pra 3 de 3'));
  assert.ok(dois.texto.includes('No 4º, zera tudo'));
  assert.equal(dois.tom, 'aviso');

  // no último aviso a frase muda: a próxima zera
  const ultimo = alertaDoDia({ emAvisoPronto: true, avisosPronto: 2, avisosAntesDeZerar: 3 });
  assert.ok(ultimo.titulo.startsWith('⚠️ AVISO 3 DE 3'));
  assert.ok(ultimo.texto.includes('o dia INTEIRO zera'));
  assert.ok(!ultimo.texto.includes('sobe pra'));
});

test('a liberação diz até que hora e por quê, nas duas pontas', () => {
  const a = alertaDoDia({ liberacao: { ate_hora: '09:00', motivo: 'corrida da empresa' } });
  assert.equal(a.tom, 'bom');
  assert.ok(a.titulo.includes('até as 09:00'));
  assert.ok(a.titulo.includes('corrida da empresa'));
  assert.ok(a.texto.includes('Depois das 09:00'));
  // sem motivo, não sobra um travessão solto
  assert.ok(!alertaDoDia({ liberacao: { ate_hora: '09:00' } }).titulo.includes('—'));
});

test('as explicações dos quatro números existem e carregam os valores de verdade', () => {
  const e = explicacoesDoPlacar({
    metaVendasCiclo: 26, votacaoInicio: '07:00', votacaoFim: '18:00',
    diasFixo: 22, valorDia: 'R$ 90,90', pesoReferencia: 75, cicloDiasUteis: 22,
  });
  assert.deepEqual(Object.keys(e), ['token', 'mvm', 'cotacao', 'xpay']);
  for (const k of Object.keys(e)) {
    assert.ok(e[k].titulo.length > 0, `${k} sem título`);
    assert.ok(e[k].texto.length > 40, `${k} sem texto`);
  }
  assert.ok(e.token.texto.includes('meta 26 no ciclo'));
  assert.ok(e.mvm.texto.includes('das 07:00 às 18:00'));
  assert.ok(e.xpay.texto.includes('÷ 22 dias'));
  assert.ok(e.xpay.texto.includes('R$ 90,90'));
  assert.ok(e.xpay.texto.includes('peso 75'));
  assert.ok(e.cotacao.texto.includes('0,80 no dia 22'));
});

test('a tela usa a lib: um alerta só, e os números abrem a folha em vez do title=', () => {
  const P = ler('../src/components/licensing/CentralVendas/PlacarDoDia.jsx');
  const M = ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx');
  // o Compromisso delega pro placar em vez de empilhar os blocos na mão
  assert.ok(M.includes('<PlacarDoDia'), 'CrmMetodo não monta o PlacarDoDia');
  assert.ok(M.includes("import PlacarDoDia from './PlacarDoDia'"));
  // e os quatro avisos antigos saíram de lá
  assert.ok(!M.includes('xgame.perdeu_por_nao_votar && mostrarPainel'), 'sobrou aviso antigo empilhado no CrmMetodo');
  assert.ok(!M.includes('xgame.em_aviso_pronto && mostrarPainel'), 'sobrou aviso antigo empilhado no CrmMetodo');
  // o placar chama a lib pura, não refaz a regra no JSX
  assert.ok(P.includes('alertaDoDia('), 'o placar não usa alertaDoDia');
  assert.ok(P.includes('explicacoesDoPlacar('), 'o placar não usa explicacoesDoPlacar');
  // 📱 a explicação abre por TOQUE — no celular title= nunca abre
  assert.ok(P.includes('onClick={() => abrir('), 'os números não abrem a folha ao toque');
  assert.ok(P.includes('data-teste="folha-explicacao"'));
});
