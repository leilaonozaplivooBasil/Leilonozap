// 💰 O PESO ENTRA NA GERAÇÃO DO DIA (DIR-75, 06/09/2026).
//
// A conta do fixo distribuído pelo peso mora em distribuicaoFixo.js (feita
// pela sessão do X-Performance, com os testes dela). O que ESTE arquivo
// protege é a outra metade, que ninguém tinha visto: o motor de peso
// automático existia desde o X-GAME e NUNCA era chamado ao gerar o dia. Toda
// tarefa nascia sem peso, caía no padrão 3, e — na régua nova, em que o dia
// completo é a Rotina Perfeita com peso 75 — um dia gerado somava 54 e pagava
// só 72% do fixo. Por isso no app publicado toda linha mostra o mesmo R$ 2,95.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pesoAutomatico, reguaDoDia, PESO_DIA_COMPLETO } from '../src/lib/xgame.js';
import { DIAS_FIXO } from '../src/lib/distribuicaoFixo.js';
import { ROTINA_PADRAO, gerarTarefasDaRotina } from '../src/lib/metodo.js';

const P = { verba_producao: 7000, verba_bonus: 200, valor_venda: 50 };

describe('o peso entra na geração do dia', () => {
  test('sem a régua de peso, a tarefa nasce sem peso — o comportamento de antes', () => {
    const linhas = gerarTarefasDaRotina(ROTINA_PADRAO, 'u1', '2026-09-07');
    assert.ok(linhas.every((l) => l.peso === undefined), 'não podia inventar peso sem a régua');
  });

  test('com a régua, cada tarefa nasce com o peso dela — e eles são diferentes', () => {
    const linhas = gerarTarefasDaRotina(ROTINA_PADRAO, 'u1', '2026-09-07', pesoAutomatico);
    assert.ok(linhas.every((l) => l.peso >= 1 && l.peso <= 6), 'peso fora da régua');
    assert.ok(new Set(linhas.map((l) => l.peso)).size > 1, 'todos com o mesmo peso: a régua não foi aplicada');
    const almoco = linhas.find((l) => /Almo/.test(l.titulo));
    const reuniao = linhas.find((l) => /Reunião 1/.test(l.titulo));
    assert.ok(reuniao.peso > almoco.peso, 'reunião tem que pesar mais que o almoço');
  });

  // 🔒 O QUE LIGA AS DUAS SESSÕES: a régua do dia completo (peso 75) é
  // calculada com pesoAutomatico — então o dia gerado só bate nela se o
  // gerador aplicar o MESMO pesoAutomatico. Sem isso, dia gerado = peso 54.
  test('o dia gerado com a régua soma EXATAMENTE o peso do dia completo', () => {
    const linhas = gerarTarefasDaRotina(ROTINA_PADRAO, 'u1', '2026-09-07', pesoAutomatico)
      .map((l, i) => ({ ...l, id: `g${i}` }));
    const r = reguaDoDia(linhas, P);
    assert.equal(r.somaPesos, PESO_DIA_COMPLETO, `somou ${r.somaPesos}, o dia completo é ${PESO_DIA_COMPLETO}`);
    assert.equal(r.pesoFalta, 0, 'dia gerado não pode ficar com peso em aberto');
    // e paga o fixo do dia inteiro
    assert.ok(Math.abs(r.valorDia - 7000 / DIAS_FIXO) < 0.01, `valor do dia ${r.valorDia}`);
  });

  test('o dia gerado SEM a régua fica devendo — é o defeito que estava dormindo', () => {
    const linhas = gerarTarefasDaRotina(ROTINA_PADRAO, 'u1', '2026-09-07')
      .map((l, i) => ({ ...l, id: `g${i}` }));
    const r = reguaDoDia(linhas, P);
    assert.ok(r.somaPesos < PESO_DIA_COMPLETO, 'sem peso automático o dia não chega na régua');
    assert.ok(r.pesoFalta > 0);
  });
});
