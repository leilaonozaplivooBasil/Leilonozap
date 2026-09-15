// 🔴 13/09/2026 — o MESMO corte silencioso de 1.000 linhas do Supabase (já
// achado no estoque, no CRM de clientes e nos votos do MvM — ver
// lerTudoDoSupabase.js) apareceu numa QUARTA tabela: `metodo_tarefas`.
//
// Achado ao vivo pelo dono: o ADM X-Game (X-office) mostrava "0/0 tarefas
// concluídas hoje" enquanto a Visão Executiva, no mesmo instante, mostrava
// "10/173". A causa: `XPerformanceGestao.jsx` carregava o CICLO INTEIRO
// (~30 dias) de TODO o time (até 16 pessoas × ~20 tarefas/dia) numa consulta
// só, sem paginar — passa de 1.000 linhas bem antes de chegar no dia de
// hoje (ordenado por data crescente), e o Supabase corta calado, sem erro
// nenhum aparecendo. `PerformanceEquipe.jsx` tinha o mesmo padrão, ainda
// pior: nem filtrava por pessoa, o time INTEIRO da empresa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const XPERF_GESTAO = ler('../src/components/licensing/CentralVendas/XPerformanceGestao.jsx');
const PERFORMANCE_EQUIPE = ler('../src/components/licensing/CentralVendas/PerformanceEquipe.jsx');

test('XPerformanceGestao.jsx: o ciclo inteiro de metodo_tarefas do time vem paginado, não num select() só', () => {
  assert.match(XPERF_GESTAO, /import \{ lerTudoDoSupabase \} from '@\/lib\/lerTudoDoSupabase';/);
  assert.match(XPERF_GESTAO, /const data = await lerTudoDoSupabase\(\(\) => supabase\.from\('metodo_tarefas'\)/,
    'a leitura do ciclo inteiro precisa ser paginada — senão "hoje" some silenciosamente quando o ciclo já passou de 1.000 linhas');
});

test('PerformanceEquipe.jsx: o período inteiro de metodo_tarefas do time (sem filtro de pessoa) vem paginado', () => {
  assert.match(PERFORMANCE_EQUIPE, /import \{ lerTudoDoSupabase \} from '@\/lib\/lerTudoDoSupabase';/);
  assert.match(PERFORMANCE_EQUIPE, /const tarefasDoPeriodo = await lerTudoDoSupabase\(\(\) => supabase\.from\('metodo_tarefas'\)/,
    'sem paginação, o time inteiro (sem filtro de user_id) estoura 1.000 linhas ainda mais rápido');
});
