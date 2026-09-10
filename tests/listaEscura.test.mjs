// 🌑 A LISTA DO <select> EM PAINEL ESCURO — "mais fundo branco" (dono, 09/09/2026).
//
// O <select> fechado a gente estiliza; a LISTA que ele abre, não. Ela é desenhada
// pelo sistema operacional a partir do fundo do PRÓPRIO <select> — e os nossos
// campos escuros usam `bg-white/[0.06]`, que é translúcido: fundo nenhum. O
// sistema cai no branco. Junto com o `text-white` desses campos, o resultado é
// TEXTO BRANCO EM LISTA BRANCA — a pessoa abre a lista e não vê opção nenhuma.
//
// Foi assim que o bug sobreviveu: consertado num lugar, de um jeito, deixando
// oito outros <select> iguais pra trás. Por isso a cor mora numa regra SÓ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CSS = ler('../src/index.css');
const ARQUIVOS = [
  ['DistribuirTarefa', semComentarios(ler('../src/components/licensing/CentralVendas/DistribuirTarefa.jsx'))],
  ['PainelCorporativo', semComentarios(ler('../src/components/licensing/CentralVendas/PainelCorporativo.jsx'))],
  ['EntradaComDestinos', semComentarios(ler('../src/components/licensing/CentralVendas/EntradaComDestinos.jsx'))],
];

test('a regra existe, e pinta a OPTION — não só o select', () => {
  assert.match(CSS, /select\.lista-escura option/, 'sem pintar a <option>, Windows e Linux continuam brancos');
  assert.match(CSS, /select\.lista-escura\s*\{[^}]*color-scheme:\s*dark/, 'sem color-scheme:dark, Chrome/Edge no Mac continuam brancos');
  assert.match(CSS, /background-color:\s*#1F2937/i);
  assert.match(CSS, /color:\s*#F4F4F4/i, 'fundo escuro sem texto claro é o mesmo problema ao contrário');
});

test('🔴 todo campo escuro compartilhado carrega a classe', () => {
  // Estes `campo` são usados por VÁRIOS <select> de uma vez — é onde o conserto
  // rende, e onde esquecer custa oito telas.
  for (const [nome, src] of ARQUIVOS.slice(0, 2)) {
    const linha = src.split('\n').find((l) => l.startsWith('const campo ='));
    assert.ok(linha, `${nome}: sumiu o estilo compartilhado`);
    assert.match(linha, /text-white/, `${nome}: se deixou de ser escuro, este teste precisa ser revisto, não removido`);
    assert.match(linha, /lista-escura/, `${nome}: a lista aberta volta a ser branca com texto branco`);
  }
});

test('🔴 nenhum <select> escuro ficou pra trás', () => {
  // A varredura é o ponto: consertar o que o print mostrou e deixar os irmãos
  // quebrados é exatamente o que aconteceu antes.
  for (const [nome, src] of ARQUIVOS) {
    for (const tag of src.match(/<select[\s\S]{0,400}?>/g) || []) {
      const temFundoTranslucido = /bg-white\/\[0/.test(tag) || /\{campo\}/.test(tag) || /campo\}/.test(tag);
      if (!temFundoTranslucido) continue;
      assert.ok(/lista-escura/.test(tag) || /className=\{campo\}/.test(tag) || /\$\{campo\}/.test(tag),
        `${nome}: <select> em campo escuro sem lista-escura → ${tag.slice(0, 90)}`);
    }
  }
});

test('a cor da lista mora num lugar só', () => {
  // Duas cópias do mesmo conserto divergem, e a que ficar pra trás volta a ser
  // branca sem ninguém notar.
  const PECA = ARQUIVOS[2][1];
  assert.ok(!/style=\{escuro \? estiloOpcaoEscura/.test(PECA), 'voltou a pintar <option> na mão, em paralelo com o CSS');
  assert.match(PECA, /lista-escura/, 'a peça tem que usar a mesma regra dos outros');
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔴 O MESMO BUG VOLTOU, NO PALCO DO X-GAME (09/09/2026, 19h05)
// ═══════════════════════════════════════════════════════════════════════════
// Dono, com print, COM A VOTAÇÃO ABERTA: "lista com fundo branco na parte de
// votação". A votação MvM fecha 21h30 e quem não vota em todos zera o dia
// inteiro — MvM, Human Token, pontos e X-Pay. Lista ilegível ali não é
// cosmético: é o dia de todo mundo.
//
// A causa NÃO era o select da votação. É a regra `.xeos-palco select`, que
// repinta TODO select do palco com fundo translúcido (fundo nenhum, pro
// sistema operacional) e cor branca. Os selects do palco nunca receberam a
// classe `.lista-escura` porque quem os escurece é CSS, não uma classe no JSX.
//
// Por isso a correção mora colada na regra que causa, e não em mais uma classe
// aplicada à mão: assim o PRÓXIMO select do palco já nasce legível. Consertar
// por classe de novo era repetir o erro que fez o bug sobreviver duas vezes.
test('🌑 o palco do X-GAME pinta a lista dos selects que ele mesmo escurece', () => {
  const semCom = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(
    semCom,
    /\.xeos-palco\.xeos-palco select\s*\{[^}]*color-scheme:\s*dark/,
    'sem color-scheme:dark, a lista volta a abrir branca no Chrome/Edge do Mac',
  );
  assert.match(
    semCom,
    /\.xeos-palco\.xeos-palco select option[^{]*\{[^}]*background-color:\s*#1F2937/i,
    'sem fundo opaco na <option>, Windows e Linux continuam com lista branca',
  );
  assert.match(
    semCom,
    /\.xeos-palco\.xeos-palco select option[^{]*\{[^}]*color:\s*#F4F4F4/i,
    'fundo escuro sem texto claro é o mesmo problema ao contrário',
  );
});

test('🔴 e a regra que causa o problema continua sendo a que o resolve', () => {
  // Se alguém tirar o `!important` de cor/fundo do select do palco, a correção
  // acima pode virar remendo sem causa. Este teste amarra as duas na mesma
  // vizinhança: o conserto tem que continuar ao lado do que ele conserta.
  const semCom = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const iCausa = semCom.indexOf('.xeos-palco.xeos-palco select {');
  const iScheme = semCom.search(/\.xeos-palco\.xeos-palco select\s*\{[^}]*color-scheme/);
  const iOption = semCom.indexOf('.xeos-palco.xeos-palco select option');
  assert.ok(iCausa >= 0, 'sumiu a regra do palco que escurece os selects');
  assert.ok(iScheme >= 0, 'sumiu o color-scheme do conserto');
  assert.ok(iOption >= 0, 'sumiu a pintura das <option> do conserto');
  // ⚠️ As DUAS metades precisam ficar perto da causa. A primeira versão deste
  // teste media só o color-scheme — e passou verde com a pintura das <option>
  // jogada pro fim do arquivo. Verificado por mutação; corrigido antes de subir.
  for (const [nome, i] of [['color-scheme', iScheme], ['pintura das option', iOption]]) {
    assert.ok(
      Math.abs(i - iCausa) < 2000,
      `o conserto (${nome}) se afastou da regra que causa — quem editar uma não vai ver a outra`,
    );
  }
});
