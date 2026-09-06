// As metas da pessoa (06/09/2026): modelo por função, progresso das tarefas e vendas, ritmo e semáforo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAVES, METAS_MODELO, metasDoModelo, ritmoDoMes, progressoDasMetas, semaforo, mesDe } from '../src/lib/metasPessoa.js';

test('o modelo por função vira metas prontas pra gravar, com rótulo e unidade', () => {
  const m = metasDoModelo('socio_executivo', { userId: 'u1', mes: '2026-09', criadoPorId: 'dono' });
  assert.equal(m.length, 4);
  assert.deepEqual([m[0].chave, m[0].rotulo, m[0].alvo, m[0].unidade, m[0].user_id, m[0].mes], ['contatos', 'Contatos feitos', 480, 'no mês', 'u1', '2026-09']);
  assert.equal(m.find((x) => x.chave === 'faturamento').unidade, 'R$');
  assert.deepEqual(metasDoModelo('inventada', { userId: 'u1', mes: '2026-09' }), []);
  assert.ok(Object.keys(METAS_MODELO).length >= 9);
  assert.ok(CHAVES.every((c) => c.rotulo && c.unidade));
});

test('ritmo do mês: quanto já passou; antes do mês 0, depois 1', () => {
  assert.equal(ritmoDoMes('2026-09', '2026-09-15'), 0.5);
  assert.equal(ritmoDoMes('2026-09', '2026-08-31'), 0);
  assert.equal(ritmoDoMes('2026-09', '2026-10-01'), 1);
  assert.equal(ritmoDoMes('2026-09', '2026-09-30'), 1);
  assert.equal(mesDe('2026-09-15'), '2026-09');
});

test('progresso: contatos são Hábito 4 feitos, reuniões Hábito 5, faturamento e produto vêm das vendas; ritmo diz se está atrás', () => {
  const metas = [
    { chave: 'contatos', tipo: 'numero', alvo: 100 },
    { chave: 'reunioes', tipo: 'numero', alvo: 20 },
    { chave: 'faturamento', tipo: 'numero', alvo: 10000 },
    { chave: 'produto:p1', tipo: 'produto', produto_id: 'p1', alvo: 10 },
  ];
  const tarefas = [
    ...Array.from({ length: 60 }, (_, i) => ({ id: `c${i}`, feito: true, habito: 4 })),
    { id: 'r1', feito: true, habito: 5 }, { id: 'r2', feito: false, habito: 5 },
  ];
  const vendas = [{ product_id: 'p1', quantity: 3, total_amount: 3000 }, { product_id: 'p2', total_amount: 1500 }];
  const p = progressoDasMetas({ metas, tarefasDoMes: tarefas, vendasDoMes: vendas, mes: '2026-09', hojeISO: '2026-09-15' });
  assert.deepEqual(p.map((x) => [x.feito, x.pct, x.noRitmo]), [[60, 60, true], [1, 5, false], [4500, 45, false], [3, 30, false]]);
  assert.equal(p[1].faltaNoRitmo, 9, 'na metade do mês devia ter 10 reuniões; tem 1');
});

test('semáforo: verde sem furo, amarelo com um, vermelho com dois ou mais — e diz os motivos', () => {
  assert.deepEqual(semaforo({}), { cor: 'verde', furos: 0, motivos: [] });
  assert.equal(semaforo({ planejou: false }).cor, 'amarelo');
  const v = semaforo({ planejou: false, atrasadas: 2, metasForaDoRitmo: 1 });
  assert.equal(v.cor, 'vermelho');
  assert.deepEqual(v.motivos, ['não gerou o planejamento de hoje', '2 prontos atrasados', '1 meta atrás do ritmo']);
});
