// 🎯 DIR-112.1 (09/09/2026) — dono, ao vivo, depois de ver o ponto do script
// virar automático por tamanho: "você só vai dar um ponto quando você
// conferir, como se fosse uma validação... se o script estiver bom, aí você
// vai fixar e dar esse ponto." Este arquivo prova duas coisas na mesma
// mudança: (1) o ponto saiu do "escreveu 20 caracteres" e passou a depender
// do veredito da IA (`aprovado`), e (2) o cartão do script trocou o fundo
// pastel translúcido (que ficava sujo sobre o hero escuro da tela) por um
// fundo branco sólido — "só essa cor que está feia, vamos deixar coeso".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
const COACH = fs.readFileSync(new URL('../api/functions/scriptContatoCoach.js', import.meta.url), 'utf8');

test('scriptContatoCoach: a saída tem um veredito "aprovado", não só a dica', () => {
  assert.match(COACH, /aprovado:\s*z\.boolean\(\)/, 'sem o campo aprovado, não tem como o front travar o ponto até a IA conferir');
  assert.match(COACH, /VALIDADOR/i, 'o sistema precisa se assumir também validador, não só treinador — é o portão do ponto');
});

// 🐛 09/09/2026 — achado na auditoria pré-publicação: o teste acima só
// confere que o SCHEMA declara `aprovado` — nunca que a resposta de
// SUCESSO de verdade devolve esse campo. Foi exatamente essa lacuna que
// deixou passar o bug: a rota aprovava certinho por dentro (`out.aprovado`
// existia), mas o último `res.json(...)` do caminho de sucesso esquecia de
// incluir o campo — então TODO script, aprovado ou não pela IA, chegava
// no front como `aprovado: undefined` (⇒ nunca dava o ponto). Este teste
// trava que TODO campo do schema `Dica` (não só `aprovado`) sai de verdade
// na resposta de sucesso — sem precisar montar um mock da Anthropic pra
// isso, só lendo o próprio texto-fonte com mais rigor que antes.
test('scriptContatoCoach: a resposta de SUCESSO devolve todos os campos do schema Dica — não só metade deles', () => {
  const camposSchema = [...COACH.matchAll(/^\s{2}(\w+):\s*z\./gm)].map((m) => m[1]);
  assert.deepEqual(camposSchema.sort(), ['aprovado', 'dica', 'pontos_fortes'], 'o schema Dica mudou — atualize esta lista de campos esperados');
  const inicioSucesso = COACH.indexOf('const out = resposta.parsed_output;');
  const fimHandler = COACH.indexOf('} catch (e) {', inicioSucesso);
  assert.ok(inicioSucesso >= 0 && fimHandler > inicioSucesso);
  const trechoSucesso = COACH.slice(inicioSucesso, fimHandler);
  const ultimoReturn = [...trechoSucesso.matchAll(/res\.status\(200\)\.json\(\{[\s\S]*?\}\);/g)].pop()?.[0];
  assert.ok(ultimoReturn, 'a última resposta do caminho de sucesso (depois de checar refusal/out vazio) tem que existir');
  for (const campo of camposSchema) {
    assert.match(ultimoReturn, new RegExp(`\\b${campo}:\\s*out\\.${campo}\\b`), `a resposta de sucesso esqueceu de devolver "${campo}" do "out" — é exatamente o bug do "aprovado sempre false" que chegou em produção`);
  }
});

test('salvarScript: NÃO concede ponto sozinho — só grava o texto', () => {
  const trecho = METODO.match(/const salvarScript = \(\) => [^;]+;/);
  assert.ok(trecho, 'salvarScript devia ser uma função de uma linha só (sem lógica de pontuação)');
  assert.doesNotMatch(trecho[0], /script_pontuado_em/, 'salvarScript não pode mais gravar script_pontuado_em — quem faz isso agora é a validação da IA');
});

test('pedirDicaDoScript: só pontua quando a IA aprova, e só uma vez', () => {
  const inicio = METODO.indexOf('const pedirDicaDoScript');
  assert.ok(inicio >= 0);
  const trecho = METODO.slice(inicio, inicio + 1200);
  assert.match(trecho, /if \(j\.aprovado && !perfil\?\.script_pontuado_em\)/, 'o ponto tem que exigir aprovado=true E ainda não ter pontuado antes (o "uma vez só")');
  assert.match(trecho, /script_pontuado_em: new Date\(\)\.toISOString\(\)/);
});

test('o cartão do script usa fundo branco sólido, não pastel translúcido', () => {
  const inicio = METODO.indexOf('data-teste="contato-script"');
  assert.ok(inicio >= 0);
  const trecho = METODO.slice(inicio, inicio + 400);
  assert.match(trecho, /bg-white/, 'o cartão precisa de um fundo sólido — pastel translúcido em cima do hero escuro dessa tela fica sujo');
  assert.doesNotMatch(trecho, /bg-amber-50\/50|bg-nz-verde-fundo\/20/, 'essas classes translúcidas foram exatamente o que o dono reportou como "cor feia"');
});

test('o estado visual do cartão (validado ou não) usa script_pontuado_em, não o tamanho do texto', () => {
  const inicio = METODO.indexOf('data-teste="contato-script"');
  const trecho = METODO.slice(inicio, inicio + 1600);
  assert.match(trecho, /perfil\?\.script_pontuado_em/);
  assert.doesNotMatch(trecho, /script\.trim\(\)\.length >= 20/, 'o "já vale ponto" visual não pode mais depender só de ter 20 caracteres');
});
