import test from 'node:test';
import assert from 'node:assert/strict';
import { decisaoAposIA, imagensParaComparar, JANELA_ANTI_RECICLAGEM } from '../src/lib/xgameValidacao.js';

// ─── decisaoAposIA — a régua de "zero intervenção humana até esgotar a chance" ──

test('aprovada dentro da janela: aprova direto, sem humano', () => {
  assert.deepEqual(decisaoAposIA({ veredito: 'aprovada' }, { foraDaJanela: false }), { acao: 'aprovar' });
});

test('aprovada mas fora da janela de horário: vira análise do gestor (prazo é regra da casa, não da IA)', () => {
  assert.deepEqual(decisaoAposIA({ veredito: 'aprovada' }, { foraDaJanela: true }), { acao: 'analise_gestor' });
});

test('reprovada é reprovada na hora — não precisa de segunda chance pra imagem sem relação nenhuma', () => {
  const r = decisaoAposIA({ veredito: 'reprovada', motivo: 'imagem não bate com a tarefa' }, {});
  assert.equal(r.acao, 'reprovar');
  assert.equal(r.motivo, 'imagem não bate com a tarefa');
});

test('dúvida NA PRIMEIRA tentativa com pergunta: pede justificativa — não vai pro gestor ainda', () => {
  const r = decisaoAposIA({ veredito: 'duvida', pergunta_para_pessoa: 'essa foto é de você bebendo água, não treinando — pode explicar?' }, { tentativa: 1 });
  assert.equal(r.acao, 'pedir_justificativa');
  assert.match(r.pergunta, /bebendo água/);
});

test('dúvida sem pergunta pra fazer (a IA não soube o que perguntar): vai direto pro gestor', () => {
  const r = decisaoAposIA({ veredito: 'duvida', motivo: 'imagem de baixa qualidade' }, { tentativa: 1 });
  assert.equal(r.acao, 'analise_gestor');
});

test('dúvida na SEGUNDA tentativa (pessoa já se justificou): esgotou — cai pro gestor, é ZERO tentativa a mais', () => {
  const r = decisaoAposIA({ veredito: 'duvida', pergunta_para_pessoa: 'ainda não convence' }, { tentativa: 2 });
  assert.equal(r.acao, 'analise_gestor');
});

test('veredito ausente ou inesperado nunca aprova nem reprova por omissão — trata como dúvida', () => {
  assert.equal(decisaoAposIA({}, { tentativa: 1 }).acao, 'analise_gestor');
  assert.equal(decisaoAposIA({ veredito: 'xpto' }, { tentativa: 1 }).acao, 'analise_gestor');
});

test('IA FORA DO AR não é dúvida: bloqueia — não conta, não conclui, não vai pro gestor (o buraco que deixou a foto na cama passar)', () => {
  const r = decisaoAposIA({ veredito: 'duvida', ia_indisponivel: true, motivo: 'gateway 404' }, { tentativa: 1 });
  assert.equal(r.acao, 'ia_fora');
  assert.match(r.motivo, /404/);
  // vale mesmo que o gateway tenha devolvido um veredito "por engano"
  assert.equal(decisaoAposIA({ veredito: 'aprovada', ia_indisponivel: true }, {}).acao, 'ia_fora');
});

test('aprovada na segunda tentativa (a justificativa convenceu) aprova normalmente', () => {
  assert.deepEqual(decisaoAposIA({ veredito: 'aprovada' }, { tentativa: 2, foraDaJanela: false }), { acao: 'aprovar' });
});

// ─── imagensParaComparar — a memória visual anti-reciclagem ─────────────────

test('pega as URLs mais recentes primeiro, até o teto da janela', () => {
  const lista = [
    { quando: '2026-09-01T10:00:00Z', print_url: 'a.jpg' },
    { quando: '2026-09-05T10:00:00Z', print_url: 'b.jpg' },
    { quando: '2026-09-03T10:00:00Z', print_url: 'c.jpg' },
  ];
  assert.deepEqual(imagensParaComparar(lista, 2), ['b.jpg', 'c.jpg']);
});

test('ignora comprovações sem imagem (ex: aprendizado só com resumo)', () => {
  const lista = [{ quando: '2026-09-01', print_url: null }, { quando: '2026-09-02', print_url: 'x.jpg' }];
  assert.deepEqual(imagensParaComparar(lista), ['x.jpg']);
});

test('lista vazia ou ausente não quebra', () => {
  assert.deepEqual(imagensParaComparar([]), []);
  assert.deepEqual(imagensParaComparar(undefined), []);
});

test('o teto padrão é o exportado (documenta o contrato: payload não cresce sem limite)', () => {
  const lista = Array.from({ length: 20 }, (_, i) => ({ quando: `2026-09-${String(i + 1).padStart(2, '0')}`, print_url: `${i}.jpg` }));
  assert.equal(imagensParaComparar(lista).length, JANELA_ANTI_RECICLAGEM);
});
