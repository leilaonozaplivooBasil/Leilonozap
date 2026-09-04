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
  test('Rotina Perfeita: começa 5h, 3 reuniões, fechamento e os momentos novos ditados', () => {
    assert.equal(ROTINA_PADRAO[0].hora, '05:00');
    assert.equal(ROTINA_PADRAO.filter((r) => r.titulo.startsWith('Reunião')).length, 3);
    assert.ok(ROTINA_PADRAO.some((r) => r.titulo.includes('Fechamento do dia')));
    // DIR-45: a narrativa completa da manhã
    for (const trecho of ['Story ANTES', 'registro DURANTE', 'Término do treino', 'Caminho pra empresa', 'mostrar o ambiente', 'Organização do AMBIENTE', 'TODOS na sala de treinamento', 'ABRIR A LOJA']) {
      assert.ok(ROTINA_PADRAO.some((r) => r.titulo.includes(trecho)), `faltou na rotina: ${trecho}`);
    }
    assert.equal(ROTINA_PADRAO.length, 20);
  });

  test('DIR-45: todo item da Rotina Perfeita tem guia; princípio e narrativa fiéis ao ditado', async () => {
    const { PRINCIPIO_ROTINA, NARRATIVA_DO_DIA, guiaDaRotina } = await import('../src/lib/metodo.js');
    for (const r of ROTINA_PADRAO) assert.ok(r.guia && r.guia.length > 30, `item sem guia: ${r.titulo}`);
    assert.deepEqual(PRINCIPIO_ROTINA.percepcoes, ['VIDA INTERESSANTE', 'PROVA SOCIAL', 'AUTORIDADE', 'CONFIANÇA', 'NEGÓCIO', 'VENDA']);
    assert.equal(PRINCIPIO_ROTINA.regra, 'Primeiro seja interessante. Depois desperte interesse.');
    assert.equal(NARRATIVA_DO_DIA[0].frase, 'Tenho propósito.');
    assert.equal(NARRATIVA_DO_DIA.at(-1).frase, 'Preparo o próximo dia.');
    // as três correções do dono (v2)
    const às0645 = ROTINA_PADRAO.find((r) => r.hora === '06:45');
    assert.ok(às0645.titulo.includes('Término do treino'), '06:45 é término do treino, não leitura');
    assert.ok(ROTINA_PADRAO.find((r) => r.hora === '08:40').titulo.includes('AMBIENTE'), 'chegada organiza o ambiente, não o dia');
    assert.equal(ROTINA_PADRAO.find((r) => r.hora === '08:55').detalhe, '09:00 não é horário de chegar. 09:00 é horário de começar.');
    // o guia se acha pelo título; tarefa customizada não tem guia
    assert.match(guiaDaRotina('ABRIR A LOJA'), /horário simbólico/i);
    assert.match(guiaDaRotina('Reunião 2 (45-60 min)'), /depois a gente conversa/i);
    assert.equal(guiaDaRotina('minha tarefa custom'), null);
    assert.equal(guiaDaRotina(''), null);
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

// ══ DIR-44 — Quadro dos Sonhos por horizonte ══
const { HORIZONTES_SONHO, normalizarSonho, agruparSonhosPorHorizonte, PLACEHOLDER_DETALHES_SONHO } =
  await import('../src/lib/metodo.js');

describe('quadro dos sonhos (DIR-44)', () => {
  test('3 horizontes na ordem ditada: curto 1-2, médio 2-4, longo 5+', () => {
    assert.deepEqual(HORIZONTES_SONHO.map((h) => h.id), ['curto', 'medio', 'longo']);
    assert.equal(HORIZONTES_SONHO[0].faixa, '1 a 2 anos');
    assert.equal(HORIZONTES_SONHO[1].faixa, '2 a 4 anos');
    assert.equal(HORIZONTES_SONHO[2].faixa, '5 anos pra frente');
  });

  test('normalizarSonho: legado {titulo} vira curto prazo sem imagem', () => {
    const s = normalizarSonho({ titulo: 'Bater R$ 1 mi' });
    assert.equal(s.horizonte, 'curto');
    assert.equal(s.titulo, 'Bater R$ 1 mi');
    assert.equal(s.imagem_url, null);
    assert.equal(s.detalhes, '');
  });

  test('normalizarSonho: string pura (legado mais antigo) também vale', () => {
    const s = normalizarSonho('Casa na praia');
    assert.equal(s.titulo, 'Casa na praia');
    assert.equal(s.horizonte, 'curto');
  });

  test('normalizarSonho: horizonte inválido cai em curto; campos novos preservados', () => {
    const s = normalizarSonho({ id: 'a1', titulo: ' BMW X6 ', horizonte: 'eterno', imagem_url: 'https://x/i.png', detalhes: 'preta, 2024' });
    assert.equal(s.horizonte, 'curto');
    assert.equal(s.titulo, 'BMW X6');
    assert.equal(s.imagem_url, 'https://x/i.png');
    assert.equal(s.detalhes, 'preta, 2024');
    assert.equal(s.id, 'a1');
  });

  test('normalizarSonho: lixo não derruba (null, número, sem título)', () => {
    assert.equal(normalizarSonho(null).titulo, 'Sonho');
    assert.equal(normalizarSonho(42).titulo, 'Sonho');
    assert.equal(normalizarSonho({}).horizonte, 'curto');
  });

  test('agruparSonhosPorHorizonte preserva o ÍNDICE REAL do array gravado', () => {
    const sonhos = [
      { titulo: 'legado' },
      { titulo: 'apto', horizonte: 'longo' },
      { titulo: 'carro', horizonte: 'medio' },
      { titulo: 'viagem', horizonte: 'medio' },
    ];
    const g = agruparSonhosPorHorizonte(sonhos);
    assert.deepEqual(g.curto.map((x) => x.indice), [0]);
    assert.deepEqual(g.medio.map((x) => x.indice), [2, 3]);
    assert.deepEqual(g.longo.map((x) => x.indice), [1]);
    assert.equal(g.medio[0].sonho.titulo, 'carro');
  });

  test('agruparSonhosPorHorizonte: vazio e não-array não explodem', () => {
    assert.deepEqual(agruparSonhosPorHorizonte([]), { curto: [], medio: [], longo: [] });
    assert.deepEqual(agruparSonhosPorHorizonte(null), { curto: [], medio: [], longo: [] });
  });

  test('a orientação do dono está no placeholder (carro → ano, cor, banco, roda)', () => {
    for (const palavra of ['ano', 'cor', 'banco de couro', 'roda']) {
      assert.ok(PLACEHOLDER_DETALHES_SONHO.includes(palavra), `faltou: ${palavra}`);
    }
  });
});

// ══ DIR-46 — Lista de Network qualificada ══
const { PRODUTOS_APRESENTACAO, DIMENSOES_QUALIFICACAO, totalQualificacao, probabilidadeFechamento, qualificacaoNetworkCompleta, produtoApresentacao } =
  await import('../src/lib/metodo.js');

describe('lista de network qualificada (DIR-46)', () => {
  test('os dois produtos ditados: Parceiro de Compra e Licenças', () => {
    assert.deepEqual(PRODUTOS_APRESENTACAO.map((p) => p.id), ['parceiro_compra', 'licencas']);
    assert.equal(produtoApresentacao('licencas').label, 'Licenças');
    assert.equal(produtoApresentacao('outro'), null);
  });

  test('as 3 dimensões na ordem ditada: confiança, financeira, apetite', () => {
    assert.deepEqual(DIMENSOES_QUALIFICACAO.map((d) => d.id), ['confianca', 'financeiro', 'apetite']);
  });

  test('o exemplo do dono: 3 + 4 + 5 = 12 de 15 → 75%, quente', () => {
    const q = { produto: 'licencas', confianca: 3, financeiro: 4, apetite: 5 };
    assert.equal(totalQualificacao(q), 12);
    const p = probabilidadeFechamento(q);
    assert.equal(p.pct, 75);
    assert.equal(p.faixa.id, 'quente');
  });

  test('régua transparente nas pontas: 1/1/1 = 0% frio · 5/5/5 = 100% quente', () => {
    assert.deepEqual(
      [probabilidadeFechamento({ confianca: 1, financeiro: 1, apetite: 1 }), probabilidadeFechamento({ confianca: 5, financeiro: 5, apetite: 5 })]
        .map((p) => [p.pct, p.faixa.id]),
      [[0, 'frio'], [100, 'quente']]
    );
  });

  test('meio da régua: 3/3/3 = 50% morno', () => {
    const p = probabilidadeFechamento({ confianca: 3, financeiro: 3, apetite: 3 });
    assert.equal(p.pct, 50);
    assert.equal(p.faixa.id, 'morno');
  });

  test('incompleta ou inválida → null (número não se inventa)', () => {
    assert.equal(totalQualificacao(null), null);
    assert.equal(totalQualificacao({ confianca: 3, financeiro: 4 }), null);
    assert.equal(totalQualificacao({ confianca: 6, financeiro: 4, apetite: 5 }), null);
    assert.equal(probabilidadeFechamento({ confianca: 0, financeiro: 1, apetite: 1 }), null);
    assert.equal(qualificacaoNetworkCompleta({ confianca: 3, financeiro: 4, apetite: 5 }), true);
  });
});

// ══ DIR-47 — Contato e Convite vivo ══
const { RESULTADOS_CONTATO, registroContatoValido, agendaDoDiaContatos } = await import('../src/lib/metodo.js');

describe('contato e convite (DIR-47)', () => {
  test('os desfechos ditados: feito, agendado, pediu pra retornar + os possíveis', () => {
    assert.deepEqual(RESULTADOS_CONTATO.map((r) => r.id), ['feito', 'agendado', 'retornar', 'nao_atendeu', 'sem_interesse']);
  });

  test('registro válido: agendado exige data/hora, retornar exige data', () => {
    assert.equal(registroContatoValido({ resultado: 'feito' }), true);
    assert.equal(registroContatoValido({ resultado: 'agendado' }), false);
    assert.equal(registroContatoValido({ resultado: 'agendado', quando: '2026-09-04T14:00' }), true);
    assert.equal(registroContatoValido({ resultado: 'retornar' }), false);
    assert.equal(registroContatoValido({ resultado: 'retornar', retornar_em: '2026-09-10' }), true);
    assert.equal(registroContatoValido({ resultado: 'inventado' }), false);
    assert.equal(registroContatoValido(null), false);
  });

  test('agenda do dia: agendados por hora + retornos do dia, escopo é quem chama', () => {
    const clientes = [
      { full_name: 'Bia', contatos_metodo: [{ resultado: 'agendado', quando: '2026-09-03T16:00' }, { resultado: 'agendado', quando: '2026-09-04T09:00' }] },
      { full_name: 'Ana', contatos_metodo: [{ resultado: 'agendado', quando: '2026-09-03T09:30' }, { resultado: 'retornar', retornar_em: '2026-09-03' }] },
      { full_name: 'Caio', contatos_metodo: [{ resultado: 'sem_interesse', em: '2026-09-03T10:00' }] },
      { full_name: 'Sem histórico' },
    ];
    const { agendados, retornos } = agendaDoDiaContatos(clientes, '2026-09-03');
    assert.deepEqual(agendados.map((a) => a.cliente.full_name), ['Ana', 'Bia']);
    assert.deepEqual(retornos.map((r) => r.cliente.full_name), ['Ana']);
    assert.deepEqual(agendaDoDiaContatos([], '2026-09-03'), { agendados: [], retornos: [] });
  });
});

// ══ DIR-48 — agendador com criação real no Google ══
const { eventoGoogleDaReuniao, DURACOES_REUNIAO } = await import('../src/lib/metodo.js');

describe('agendador de reuniões (DIR-48)', () => {
  test('durações oferecidas incluem as 45-60 do método', () => {
    assert.deepEqual(DURACOES_REUNIAO, [30, 45, 60, 90]);
  });

  test('evento montado com início, fim pela duração, local e timezone', () => {
    const e = eventoGoogleDaReuniao({ titulo: 'Reunião — Diogo (Leilão NoZap)', inicio: '2026-09-04T14:00', duracaoMin: 45, detalhes: 'levar números', local: 'Escritório' });
    assert.equal(e.summary, 'Reunião — Diogo (Leilão NoZap)');
    assert.equal(e.start.dateTime, '2026-09-04T14:00:00');
    assert.equal(e.end.dateTime, '2026-09-04T14:45:00');
    assert.equal(e.start.timeZone, 'America/Sao_Paulo');
    assert.equal(e.location, 'Escritório');
    assert.equal(e.description, 'levar números');
  });

  test('duração some vira 60; sem local o campo não vai; virada de dia correta', () => {
    const e = eventoGoogleDaReuniao({ inicio: '2026-09-04T23:30' });
    assert.equal(e.end.dateTime, '2026-09-05T00:30:00');
    assert.ok(!('location' in e));
    assert.equal(e.summary, 'Reunião — Leilão NoZap');
  });

  test('início inválido → null (evento não se inventa)', () => {
    assert.equal(eventoGoogleDaReuniao({ inicio: 'não é data' }), null);
    assert.equal(eventoGoogleDaReuniao({ inicio: '' }), null);
  });
});
