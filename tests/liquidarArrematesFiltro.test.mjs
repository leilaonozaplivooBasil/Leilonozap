// Reproduz o defeito real do cron de liquidação (24/08/2026):
// pegar os N mais antigos e SÓ DEPOIS tirar os planos de carreira faz o lote
// inteiro virar plano, e sobram ZERO produtos para liquidar.
//
// O retrato de produção no dia: 44 planos + 4 produtos reais em awaiting_payment,
// com os planos muito mais velhos (o mais antigo de 05/01/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(
  new URL('../api/functions/liquidarArrematesPendentes.js', import.meta.url),
  'utf8'
);

// Réplica exata de ehPlanoOuTeste() do arquivo.
function ehPlanoOuTeste(a) {
  return a?.is_investment_plan === true
    || a?.is_test_auction === true
    || /\bplano\b/i.test(a?.title || '');
}

// Fila igual à de produção: 44 planos velhos + 4 produtos reais mais novos.
function filaDeProducao() {
  const planos = Array.from({ length: 44 }, (_, i) => ({
    id: `plano-${i}`,
    title: `Plano Parceiro nivel ${i}`,
    is_investment_plan: true,
    end_time: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
  }));
  const produtos = [
    { id: 'p1', title: 'Kit Com 9 Mini Esponjas De Maquiagem', end_time: '2026-07-27T00:14:22Z' },
    { id: 'p2', title: 'Organizador De Mesa Triplo Articulável', end_time: '2026-08-21T00:44:33Z' },
    { id: 'p3', title: 'Kit 10 Driver Reator Led 8w-25w', end_time: '2026-08-21T00:53:06Z' },
    { id: 'p4', title: 'Sapato Calcado De Seguranca Epi', end_time: '2026-08-23T18:11:09Z' },
  ];
  return [...planos, ...produtos].sort((a, b) => a.end_time.localeCompare(b.end_time));
}

test('o defeito: limitar ANTES de filtrar não sobra nenhum produto', () => {
  const fila = filaDeProducao();
  const lote = fila.slice(0, 20);                 // era assim: order=end_time.asc&limit=20
  const alvos = lote.filter((a) => !ehPlanoOuTeste(a));
  assert.equal(alvos.length, 0, 'é exatamente por isso que o cron rodou 4x sem liquidar nada');
});

test('a correção: filtrar ANTES traz os 4 produtos reais', () => {
  const fila = filaDeProducao();
  // O que a consulta faz agora: exclui plano/teste no banco, depois limita.
  const semPlanos = fila.filter((a) => a.is_investment_plan !== true && a.is_test_auction !== true);
  const lote = semPlanos.slice(0, 100);
  const alvos = lote.filter((a) => !ehPlanoOuTeste(a));

  assert.equal(alvos.length, 4);
  assert.deepEqual(
    alvos.map((a) => a.id),
    ['p1', 'p2', 'p3', 'p4'],
    'os 4 produtos reais, do mais antigo para o mais novo'
  );
});

test('a consulta exclui plano/teste no próprio banco', () => {
  assert.match(fonte, /is_investment_plan=not\.is\.true/);
  assert.match(fonte, /is_test_auction=not\.is\.true/);
});

test('o caso "pendente mas nenhum liquidável" agora deixa rastro no log', () => {
  assert.match(
    fonte,
    /alvos\.length === 0[\s\S]{0,220}console\.log/,
    'sem esse log o defeito volta a passar mudo'
  );
});

test('o filtro por título fica no JS, para não excluir produto legítimo', () => {
  // O ilike do PostgREST (*plano*) pegaria estes dois por engano.
  assert.equal(ehPlanoOuTeste({ title: 'Planotec Fone de Ouvido' }), false);
  assert.equal(ehPlanoOuTeste({ title: 'Mesa Planejada Compacta' }), false);
  // E continua pegando os de verdade.
  assert.equal(ehPlanoOuTeste({ title: 'PLANO DE CARREIRA - Vendedor' }), true);
});
