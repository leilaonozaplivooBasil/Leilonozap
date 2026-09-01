// metodo — o Método vivo (DIR-43): rotina → dia, progresso, períodos e o
// link de agenda do Google.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  HABITOS, ROTINA_PADRAO, periodoDe, gerarTarefasDaRotina, progressoDia,
  linkGoogleAgenda, qualificacaoValida,
} from '../src/lib/metodo.js';

describe('conteúdo do método', () => {
  test('8 hábitos, na ordem do deck', () => {
    assert.equal(HABITOS.length, 8);
    assert.deepEqual(HABITOS.map((h) => h.id), [
      'sonho', 'compromisso', 'lista', 'contato', 'apresentacao',
      'acompanhamento', 'verificacao', 'duplicacao',
    ]);
  });
  test('rotina padrão: começa 5h, tem as 3 reuniões e o fechamento do dia', () => {
    assert.equal(ROTINA_PADRAO[0].hora, '05:00');
    assert.equal(ROTINA_PADRAO.filter((r) => r.titulo.startsWith('Reunião')).length, 3);
    assert.ok(ROTINA_PADRAO.some((r) => r.titulo.includes('Fechamento do dia')));
  });
});

describe('Master Task', () => {
  test('gerarTarefasDaRotina: modelo vira linhas do dia, com ordem', () => {
    const t = gerarTarefasDaRotina([{ hora: '05:00', titulo: 'Acordar' }, { titulo: 'Sem hora' }, { hora: 'x' }], 'u1', '2026-09-02');
    assert.equal(t.length, 2); // item sem título não entra
    assert.deepEqual(t[0], { user_id: 'u1', data: '2026-09-02', hora: '05:00', titulo: 'Acordar', detalhe: '', feito: false, ordem: 0 });
    assert.equal(t[1].ordem, 1);
  });
  test('progressoDia: feitas ÷ total; dia vazio = 0 sem inventar', () => {
    assert.deepEqual(progressoDia([{ feito: true }, { feito: false }]), { total: 2, feitas: 1, pct: 50 });
    assert.equal(progressoDia([]).pct, 0);
  });
  test('períodos: manhã < 12h ≤ tarde < 18h ≤ noite; sem hora vai pro grupo próprio', () => {
    assert.equal(periodoDe('05:00'), 'manha');
    assert.equal(periodoDe('13:00'), 'tarde');
    assert.equal(periodoDe('18:30'), 'noite');
    assert.equal(periodoDe(''), 'dia');
  });
});

describe('agenda do Google (Hábito 5)', () => {
  test('gera a URL de template oficial com início/fim e título', () => {
    const url = linkGoogleAgenda({ titulo: 'Reunião Renan', inicio: '2026-09-02T13:00:00Z', duracaoMin: 60 });
    assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
    assert.ok(url.includes('20260902T130000Z%2F20260902T140000Z'));
    assert.ok(url.includes('Reuni%C3%A3o+Renan') || url.includes('Reuni%C3%A3o%20Renan'));
    assert.equal(linkGoogleAgenda({ titulo: 'x', inicio: 'lixo' }), null);
  });
});

describe('qualificação da lista (Hábito 3)', () => {
  test('só 1 a 5 vale', () => {
    assert.equal(qualificacaoValida(3), true);
    assert.equal(qualificacaoValida(0), false);
    assert.equal(qualificacaoValida(6), false);
    assert.equal(qualificacaoValida('3'), false);
  });
});
