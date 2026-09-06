// 📄 O RELATÓRIO DO EXECUTIVO e a limpeza da X-Performance (dono, 06/09/2026):
// "quero mais organizado, mais limpo… e a geração de PDF de cada executivo
// pra ser compartilhado". O conteúdo do PDF é puro e se prova aqui; o desenho
// (jsPDF) se prova no navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nomeBonito, primeiroNome, agruparPorMotivo, habitosDaPessoa, relatorioDoExecutivo, textoDoRelatorio, paraPdf } from '../src/lib/relatorioExecutivo.js';
import { habitosDoTime, periodoDe } from '../src/lib/habitosDoTime.js';

test('o nome bonito: o painel guarda em caixa alta e a tela mostra como gente', () => {
  assert.equal(nomeBonito('JOSÉ AMÂNCIO'), 'José Amâncio');
  assert.equal(nomeBonito('DISTRIBUIDOR'), 'Distribuidor');
  assert.equal(nomeBonito('maria de souza e silva'), 'Maria de Souza e Silva');
  assert.equal(nomeBonito("luiz sant'anna filho"), "Luiz Sant'Anna Filho");
  assert.equal(nomeBonito('Ana-Clara  Dias'), 'Ana-Clara Dias');
  assert.equal(nomeBonito('João Pedro JR'), 'João Pedro JR');
  assert.equal(nomeBonito(''), '');
  assert.equal(primeiroNome('EMANUEL ALVES'), 'Emanuel');
});

test('quem não fez, agrupado pelo motivo — maior grupo primeiro, nomes em ordem', () => {
  const g = agruparPorMotivo([
    { pessoaId: 'a', nome: 'Zeca', motivo: 'sem quadro dos sonhos' },
    { pessoaId: 'b', nome: 'Ana', motivo: 'não gerou a rotina' },
    { pessoaId: 'c', nome: 'Bia', motivo: 'sem quadro dos sonhos' },
    { pessoaId: 'd', nome: 'Caio', motivo: null },
  ]);
  assert.deepEqual(g.map((x) => [x.motivo, x.quantos, x.pessoas.map((p) => p.nome)]), [
    ['sem quadro dos sonhos', 2, ['Bia', 'Zeca']],
    ['não fez', 1, ['Caio']],
    ['não gerou a rotina', 1, ['Ana']],
  ]);
});

const TIME = [{ id: 'e', nome: 'EMANUEL SILVA', funcaoCurta: 'COO' }, { id: 'c', nome: 'Carla Souza', funcaoCurta: 'Embaixador' }];
const HOJE = '2026-09-07';
const oito = habitosDoTime({
  time: TIME, hojeISO: HOJE, periodo: periodoDe('hoje', HOJE),
  tarefas: [{ user_id: 'e', data: HOJE, hora: '05:15', titulo: 'Story ANTES da atividade física', feito: true }],
  perfis: [{ user_id: 'e', sonhos: [{ t: 'casa' }] }],
  vendas: [{ seller_id: 'c', status: 'paid', created_date: `${HOJE}T15:00:00Z`, total_amount: 1200 }],
});

test('os 8 Hábitos de UMA pessoa saem da leitura do time: fez com o detalhe, não fez com o motivo', () => {
  const h = habitosDaPessoa(oito, 'e');
  assert.equal(h.length, 8);
  assert.deepEqual([h[0].fez, h[0].texto], [true, '1 sonho no quadro']);
  assert.deepEqual([h[1].fez, h[1].texto], [true, 'acordou · rotina 100% (1/1)']);
  assert.deepEqual([h[5].fez, h[5].texto], [false, 'não vendeu']);
  const c = habitosDaPessoa(oito, 'c');
  assert.deepEqual([c[0].fez, c[0].texto, c[5].fez], [false, 'sem quadro e sem rotina', true]);
});

test('o relatório do executivo: cabeçalho, números, os quatro blocos e o nome do arquivo', () => {
  const rel = relatorioDoExecutivo({
    pessoa: { id: 'e', nome: 'EMANUEL SILVA', posicao: 'Executivo de Contas', funcaoCurta: 'COO', fixo: 7000 },
    periodo: periodoDe('hoje', HOJE), habitos: habitosDaPessoa(oito, 'e'), hojeISO: HOJE, mes: '2026-09', geradoPor: 'LUIZ SANTANNA',
    metas: [{ rotulo: 'Reuniões de investimento', feito: 10, alvo: 44, unidade: 'no mês', pct: 23, noRitmo: true }, { rotulo: 'Faturamento', feito: 1000, alvo: 5000, unidade: 'R$', pct: 20, noRitmo: false }],
    demandas: [
      { id: 'd1', titulo: 'Mandar a proposta', origem: 'ceo', criado_por_nome: 'Luiz Santanna', prazo_em: '2026-09-11T21:00:00Z', habito: 6, status: 'recebida' },
      { id: 'd2', titulo: 'Cadastrar 5 influenciadores', origem: 'diretor', status: 'agendada', estado: { id: 'conferida', rotulo: 'conferida ✔✔' } },
      { id: 'd3', titulo: 'Ligar pro fornecedor', origem: 'encontro', status: 'agendada', estado: { id: 'atrasada', rotulo: 'atrasada' } },
      { id: 'd4', titulo: 'Relatório antigo', origem: 'gestao', status: 'devolvida', devolvida_motivo: 'já foi feito' },
    ],
    producao: { total: 3, concluidas: 1, pct: 33, semAgendar: 1, atrasadas: 1 },
    semaforo: { cor: 'amarelo', motivos: ['1 demanda sem agendar'] },
  });
  assert.equal(rel.titulo, 'X-Performance · Relatório do Executivo');
  assert.deepEqual(rel.pessoa, { id: 'e', nome: 'Emanuel Silva', posicao: 'Executivo de Contas', funcao: 'COO', fixo: 'R$ 7.000,00' });
  assert.deepEqual(rel.semaforo, { cor: 'amarelo', texto: '1 demanda sem agendar' });
  assert.deepEqual(rel.numeros.map((n) => [n.rotulo, n.valor, n.cor]), [['Hábitos', '3/8', 'amarelo'], ['Metas no ritmo', '1/2', 'amarelo'], ['Demandas', '1/3', 'vermelho'], ['Sem agendar', '1', 'amarelo']]);
  assert.match(rel.periodoRotulo, /^hoje, segunda-feira, 07 de setembro de 2026$/);
  assert.deepEqual(rel.blocos.map((b) => [b.id, b.resumo, b.linhas.length]), [
    ['habitos', '3 de 8', 8],
    ['metas', '1 de 2 no ritmo', 2],
    ['demandas', '1 pra agendar · 1 em andamento · 1 conferida · 1 devolvida', 4],
    ['producao', '1 de 3 demandas concluídas · 33% · 1 sem agendar · 1 atrasada', 0],
  ]);
  assert.deepEqual(rel.blocos[0].linhas[0], { n: 1, texto: '1. Sonho', apoio: '1 sonho no quadro', cor: 'verde', fez: true });
  assert.deepEqual(rel.blocos[1].linhas.map((l) => [l.apoio, l.pct, l.cor]), [['10 de 44 no mês', 23, 'verde'], ['R$ 1.000,00 de R$ 5.000,00', 20, 'amarelo']]);
  assert.deepEqual(rel.blocos[2].linhas.map((l) => [l.texto, l.apoio, l.estado.rotulo, l.estado.cor]), [
    ['Mandar a proposta', 'CEO · Luiz Santanna · até 11/09 · H6', 'sem agendar', 'amarelo'],
    ['Ligar pro fornecedor', 'encontro de segunda', 'atrasada', 'vermelho'],
    ['Cadastrar 5 influenciadores', 'diretoria', 'conferida', 'verde'],
    ['Relatório antigo', 'gestão', 'devolvida: já foi feito', 'cinza'],
  ]);
  assert.equal(rel.rodape, 'Gerado em segunda-feira, 07 de setembro de 2026 por Luiz Santanna · Leilão no Zap · Top College');
  assert.equal(rel.nomeArquivo, 'x-performance-emanuel-silva-2026-09-07.pdf');
  // o texto pro WhatsApp
  const txt = textoDoRelatorio(rel);
  assert.match(txt, /^\*X-Performance · Relatório do Executivo\*\n\*Emanuel Silva\* · Executivo de Contas · COO\n🟡 1 demanda sem agendar\n/);
  assert.match(txt, /\*Metas de 09\/2026\* — 1 de 2 no ritmo\n🟢 Reuniões de investimento — 10 de 44 no mês/);
  assert.match(txt, /🔴 Ligar pro fornecedor — encontro de segunda \(atrasada\)/);
});

test('sem meta, sem demanda e sem período: o relatório não quebra', () => {
  const rel = relatorioDoExecutivo({ pessoa: { id: 'x', nome: 'Fulano' }, hojeISO: HOJE });
  assert.deepEqual(rel.numeros.map((n) => n.valor), ['0/8', '—', '0/0', '0']);
  assert.deepEqual(rel.blocos.map((b) => b.resumo), ['0 de 8', 'sem meta definida', 'nenhuma demanda']);
  assert.equal(rel.semaforo, null);
});

test('paraPdf: só o que a Helvetica desenha — travessão, aspas, setas, emoji e ✔✔ viram o parente mais próximo', () => {
  assert.equal(paraPdf('pronto — a conferir ✔✔ → “ok” … 1× 🟢'), 'pronto - a conferir ok -> "ok" ... 1x');
  assert.equal(paraPdf('gratidão · R$ 1.200,00 · Sant\'Anna'), 'gratidão · R$ 1.200,00 · Sant\'Anna');
  assert.equal(paraPdf('中文'), '??');
});
