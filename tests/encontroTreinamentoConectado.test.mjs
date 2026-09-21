// 🎓 DIR-135 — O TREINAMENTO E AS LÂMINAS FICAM CONECTADOS (14/09/2026).
//
// O PEDIDO (dono, direto): "eu não consigo editar as lâminas... as perguntas
// do treinamento não levam a lugar nenhum, não adianta de nada... está sem
// conexão, está sem sentido. Precisa ter um sentido, aonde eu coloco
// treinamento, pra onde o treinamento vai, onde ele aparece, aonde eu edito
// as lâminas."
//
// A CAUSA REAL (achada na auditoria): existiam DOIS "treinamento" que não se
// falavam —
//   1. `encontro.treinamento` (a caixa do cabeçalho, "o treinamento (40
//      min)") — o único que a apresentação de fato usa (DIR-79), mas só
//      podia ser APAGADO e reescrito do zero ("trocar o treinamento"), nunca
//      editado de verdade.
//   2. `roteiro.treinamento` (o rascunho da IA/régua, dentro de "3 ·
//      Treinamento" em "O tópico do encontro") — tinha um botão "editar" que
//      PARECIA funcionar, mas assim que existia um treinamento gravado (1),
//      esse rascunho virava mudo — editar ali não tinha efeito NENHUM na
//      apresentação. Um segundo formulário que não levava a lugar nenhum.
//
// Achado também: `roteiro.abertura` (o slide "Abertura", logo depois da
// Mentalidade) era gravado e usado na apresentação, mas nunca aparecia nem
// podia ser editado fora dela — uma lâmina de verdade, sem lugar pra editar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { treinamentoDoRoteiro, temTreinamento, normalizarTreinamento } from '../src/lib/encontro.js';

const COMPONENTE = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/EncontroMentalidade.jsx', import.meta.url), 'utf8');

// ─── treinamentoDoRoteiro — a ponte entre o rascunho e o gravado ───────────

test('treinamentoDoRoteiro: o rascunho da IA/régua vira o formato do treinamento GRAVADO', () => {
  const t = treinamentoDoRoteiro({ tema: 'Como fechar objeção de preço', objetivo: 'Sair com o script', passos: ['Abrir', 'Perguntar', 'Fechar'], pratica: 'Em dupla.' }, { por: 'Aline' });
  assert.equal(t.titulo, 'Como fechar objeção de preço');
  assert.equal(t.material, 'Sair com o script');
  assert.deepEqual(t.passos, ['Abrir', 'Perguntar', 'Fechar', 'Prática: Em dupla.']);
  assert.equal(t.por, 'Aline');
  assert.equal(temTreinamento(t), true, 'o resultado já é um treinamento de verdade, pronto pra editar');
});

test('treinamentoDoRoteiro: sem rascunho nenhum, não inventa treinamento', () => {
  assert.equal(temTreinamento(treinamentoDoRoteiro(null)), false);
  assert.equal(temTreinamento(treinamentoDoRoteiro(undefined)), false);
});

test('treinamentoDoRoteiro: sem prática, não sobra um passo vazio', () => {
  const t = treinamentoDoRoteiro({ tema: 'X', objetivo: 'Y', passos: ['A'] });
  assert.deepEqual(t.passos, ['A']);
});

// ─── a PONTE: gerar o tópico já grava o treinamento, se ainda não tinha ────

test('EncontroMentalidade.jsx: gerar o tópico grava o treinamento automaticamente QUANDO ainda não existe um gravado', () => {
  assert.match(COMPONENTE, /const seedTreinamento = temTreinamento\(encontro\?\.treinamento\) \? \{\} : \{ treinamento: treinamentoDoRoteiro\(novo\.treinamento, \{ por: treinamentoPor \}\) \}/, 'sem essa ponte, a caixa do cabeçalho continua dizendo "sem material" logo depois de gerar um treinamento inteiro');
  assert.match(COMPONENTE, /\.\.\.seedTreinamento/, 'o resultado da ponte precisa entrar no mesmo salvamento que grava o roteiro gerado');
});

// ─── UM só treinamento editável, nunca mais "apagar e recomeçar" ───────────

test('EncontroMentalidade.jsx: "trocar o treinamento" (que só apagava) não existe mais — vira editar de verdade', () => {
  assert.ok(!COMPONENTE.includes('data-teste="treinamento-limpar"'), 'o botão que só apagava tudo precisa ter saído');
  assert.match(COMPONENTE, /data-teste="treinamento-editar"/, 'precisa existir um jeito de EDITAR (não só apagar)');
  assert.match(COMPONENTE, /data-teste="treinamento-apagar"/, 'apagar continua existindo, mas como ação separada e explícita');
});

test('EncontroMentalidade.jsx: o formulário de edição do treinamento chega com os campos JÁ PREENCHIDOS (edição de verdade, não uma folha em branco)', () => {
  assert.match(COMPONENTE, /data-teste="editar-treinamento-titulo"/);
  assert.match(COMPONENTE, /data-teste="editar-treinamento-material"/);
  assert.match(COMPONENTE, /data-teste="editar-treinamento-passos"/);
  // os 3 campos usam defaultValue={treinamentoEfetivo.*} — nunca nascem vazios
  const bloco = COMPONENTE.slice(COMPONENTE.indexOf('editandoTreinamento ? (', COMPONENTE.indexOf('data-teste="treinamento-caixa"')), COMPONENTE.indexOf('treinamento-editar-fechar'));
  assert.match(bloco, /defaultValue=\{treinamentoEfetivo\.titulo\}/);
  assert.match(bloco, /defaultValue=\{treinamentoEfetivo\.material\}/);
  assert.match(bloco, /defaultValue=\{treinamentoEfetivo\.passos\.join\('\\n'\)\}/);
});

// ─── sem mais um segundo treinamento mudo dentro de "O tópico do encontro" ─

test('EncontroMentalidade.jsx: "3 · Treinamento" não tem mais campos de edição PRÓPRIOS (o rascunho que ficava mudo, sem avisar)', () => {
  assert.ok(!COMPONENTE.includes('mudarTreinamento'), 'a função que editava só o rascunho (sem efeito na apresentação quando havia um gravado) precisa ter saído');
  assert.ok(!COMPONENTE.includes('data-teste="editar-treinamento-tema"'), 'campo do rascunho antigo não pode mais existir');
  assert.ok(!COMPONENTE.includes('data-teste="editar-treinamento-objetivo"'), 'campo do rascunho antigo não pode mais existir');
});

test('EncontroMentalidade.jsx: "O tópico do encontro" mostra o MESMO treinamento que a apresentação usa, e aponta pra onde editar', () => {
  assert.match(COMPONENTE, /data-teste="topico-treinamento"[\s\S]{0,400}\{treinamentoEfetivo\.titulo\}/, 'o painel do tópico precisa mostrar o treinamento EFETIVO (o mesmo da apresentação), não um rascunho à parte');
  assert.match(COMPONENTE, /data-teste="topico-treinamento-editar-no-topo"/, 'precisa apontar claramente pra onde a edição de verdade mora');
});

test('treinamentoEfetivo: a mesma régua de precedência do slidesDoEncontro (gravado, se existir; senão o rascunho) — as duas telas nunca podem discordar', () => {
  assert.match(COMPONENTE, /const treinamentoEfetivo = useMemo\(\(\) => \(\s*temTreinamento\(treinamento\) \? treinamento : treinamentoDoRoteiro\(roteiro\?\.treinamento, \{ por: treinamentoPor \}\)/);
});

// ─── a abertura vira uma lâmina editável (antes só existia dentro do Apresentar) ─

test('EncontroMentalidade.jsx: a "Abertura" (uma lâmina de verdade da apresentação) agora aparece e pode ser editada fora do modo Apresentar', () => {
  assert.match(COMPONENTE, /data-teste="topico-abertura"/);
  assert.match(COMPONENTE, /data-teste="editar-abertura"/);
  assert.match(COMPONENTE, /mudarAbertura = \(valor\) => salvarEncontro\(\{ roteiro: \{ \.\.\.roteiro, abertura: valor \} \}\)/);
});

// ─── editar direto de dentro da lâmina, no modo Apresentar ─────────────────

test('EncontroMentalidade.jsx: dá pra editar direto de dentro da apresentação — "aonde eu edito as lâminas?" tem uma resposta na própria lâmina', () => {
  const inicioApresentacao = COMPONENTE.indexOf('data-teste="apresentacao"');
  assert.ok(inicioApresentacao >= 0);
  const cabecalho = COMPONENTE.slice(inicioApresentacao, COMPONENTE.indexOf('data-teste="apresentacao-fechar"'));
  assert.match(cabecalho, /data-teste="apresentacao-editar"/, 'precisa ter um botão de editar dentro da própria tela cheia');
  // DIR-168: o lápis passou a editar a PRÓPRIA lâmina, na apresentação; fechar e
  // editar o tópico inteiro continua existindo, como um clique dentro do editor.
  assert.match(cabecalho, /setEditandoLamina\(\(v\) => !v\)/, 'o lápis abre a edição da lâmina na própria tela cheia');
  assert.match(COMPONENTE, /data-teste="apresentacao-editar-tudo"[\s\S]{0,40}|setApresentando\(false\); setEditandoLamina\(false\); setEditando\(true\); setEditandoTreinamento\(true\)/, 'editar o tópico inteiro continua a um clique');
});

// ─── nada de estado de edição grudado ao trocar de encontro/apagar tudo ────

test('EncontroMentalidade.jsx: editandoTreinamento reseta ao trocar de semana e ao "começar do zero" — sem editor grudado numa reunião diferente', () => {
  assert.match(COMPONENTE, /setPautasAbertas\(!encontro\?\.roteiro\); setEditando\(false\); setEditandoTreinamento\(false\);/);
  const apagarTudo = COMPONENTE.slice(COMPONENTE.indexOf('const apagarTudo = ()'), COMPONENTE.indexOf('const direcionar ='));
  assert.match(apagarTudo, /setEditandoTreinamento\(false\)/);
});
