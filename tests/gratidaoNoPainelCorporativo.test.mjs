// 🙏 A GRATIDÃO CHEGA AO GESTOR — DIR-123 (09/09/2026).
//
// O PEDIDO (dono): "você acha legal transcrever o áudio automático pra ele
// ter isso no seu histórico e vermos isso também?"
//
// A transcrição já caía no Diário de Bolso da PRÓPRIA pessoa (DIR-101.1,
// `comprovacao.entrega`). O que faltava era o GESTOR ver, sem abrir o
// diário de cada um — mas o ÁUDIO em si é blindado por design
// (api/functions/audioDoDitado.js: "nem gestão ouve por aqui"), então só o
// TEXTO viaja pro Painel Corporativo — nunca o play de quem não é dono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { ehTarefaDeGratidao } from '../src/lib/xgame.js';
import { textoEFonte } from '../src/lib/diarioDeBolso.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const PAINEL = semComentarios(ler('../src/components/licensing/CentralVendas/PainelCorporativo.jsx'));
const API = ler('../api/functions/audioDoDitado.js');

test('o Painel Corporativo busca comprovacao das tarefas do mês (sem isso não tem gratidão pra ler)', () => {
  assert.match(PAINEL, /metodo_tarefas'\)\.select\('id,data,hora,titulo,feito,conferido,pronto_em,prazo_em,devolvida_motivo,habito,origem,demanda_id,categoria,comprovacao'\)/);
});

test('a gratidão mostrada é a mais recente, pela MESMA régua do Diário de Bolso (textoEFonte)', () => {
  assert.match(PAINEL, /import \{ textoEFonte \} from '@\/lib\/diarioDeBolso'/);
  assert.match(PAINEL, /ehTarefaDeGratidao\(t\.titulo\)/);
  assert.match(PAINEL, /const \{ texto \} = textoEFonte\(ultima\)/);
});

test('textoEFonte pega a transcrição quando só houve áudio (a mesma conta que o diário usa)', () => {
  const tarefa = { titulo: 'Acordar e gratidão', feito: true, comprovacao: { entrega: '🎙️ falei sobre minha família, saúde e o trabalho' } };
  assert.ok(ehTarefaDeGratidao(tarefa.titulo));
  const { texto, fonte } = textoEFonte(tarefa);
  assert.equal(texto, '🎙️ falei sobre minha família, saúde e o trabalho');
  assert.equal(fonte, 'resumo');
});

test('🔒 o ÁUDIO da gratidão NUNCA toca pra quem não é dono — só o texto viaja pro painel', () => {
  // a régua de bloqueio já existe no backend, de propósito — este teste só
  // trava que ela continua lá, e que o painel não tenta contornar isso.
  assert.match(API, /Áudio de gratidão é da pessoa\. Nem gestão ouve por aqui/);
  assert.match(API, /String\(eu\) !== String\(dono\)/);
  assert.match(PAINEL, /\{ehMeu && gratidaoRecente\.audioPath && \(/, 'o play só pode aparecer quando é a própria pessoa');
});

test('quem não é a própria pessoa nunca vê o componente de tocar áudio nesta seção', () => {
  const bloco = PAINEL.slice(PAINEL.indexOf('data-teste="painel-gratidao"'), PAINEL.indexOf('data-teste="painel-gratidao"') + 700);
  const antesDoOuvir = bloco.slice(0, bloco.indexOf('<OuvirGratidao'));
  assert.match(antesDoOuvir, /ehMeu &&/, 'o <OuvirGratidao> tem que estar atrás do gate ehMeu, não solto');
});
