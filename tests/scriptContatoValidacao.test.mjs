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
