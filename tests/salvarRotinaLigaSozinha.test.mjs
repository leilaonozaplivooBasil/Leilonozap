// 🗓️ "EU CLIQUEI EM SALVAR" — 21/09/2026.
//
// Dono, num domingo, montando a rotina inteira e salvando item por item:
// "eu cliquei em salvar... deu trabalho pra fazer... hoje apareceu vazio."
// Auditoria direta no banco: os 18 itens salvos estavam intactos — o
// problema era `rotina_automatica: false` na conta dele, e SALVAR a
// rotina (`gravarRotina`) nunca ligava essa chave — só o botão SEPARADO
// "gerar o dia" (DIR-80/81) fazia isso. Ele nunca tinha clicado nele (ou
// já tinha clicado em "parar de gerar todo dia" antes, sem lembrar).
//
// Pedido dele, depois da correção pontual: "precisa ter como ver a rotina
// pra frente com a data do dia seguinte, comprovando que está salva."
//
// Duas peças:
// 1. `gravarRotina` liga `rotina_automatica` sozinha quando ainda não tava
//    ligada (e desfaz um "parar" antigo) — salvar a rotina PASSA a
//    significar "ela repete", sem depender de um segundo clique escondido.
// 2. A tela mostra, de forma PERSISTENTE (não só um toast que some), o dia
//    da semana + a data em que a rotina automática passa a valer — visível
//    tanto no cabeçalho recolhido quanto dentro do painel "A minha rotina".

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));

test('gravarRotina liga rotina_automatica sozinha quando ainda não tava ligada, e desliga "recusada"', () => {
  const ini = CRM.indexOf('const gravarRotina = async (nova) => {');
  assert.ok(ini > 0, 'premissa: gravarRotina existe');
  const trecho = CRM.slice(ini, ini + 700);
  assert.match(trecho, /if \(!estadoRotina\.automatica\) \{/);
  assert.match(trecho, /patch\.rotina_automatica = true;/);
  assert.match(trecho, /patch\.rotina_automatica_recusada = false;/);
  assert.match(trecho, /patch\.rotina_automatica_desde = valeAPartirDe\(hojeStr\(\)\);/);
});

test('o toast de "rotina salva" prova a data concreta em que passa a valer, não só "amanhã"', () => {
  assert.match(CRM, /toast\.success\(`Rotina salva — \$\{proximoDiaRotina \|\| 'amanhã'\} já nasce com ela sozinho\.`\);/);
});

test('proximoDiaRotina é o mesmo cálculo de valeAPartirDe, formatado com dia da semana + data', () => {
  assert.match(CRM, /const proximoDiaRotina = useMemo\(\(\) => \{/);
  assert.match(CRM, /const iso = valeAPartirDe\(hojeStr\(\)\);/);
  assert.match(CRM, /const diaSemana = DIAS_SEMANA\[new Date\(`\$\{iso\}T12:00:00`\)\.getDay\(\)\];/);
});

test('o status "liga sozinha"/"parada" fica visível no cabeçalho recolhido — sem precisar abrir o painel', () => {
  assert.match(CRM, /data-teste="rotina-selo-automatica"/);
  const ini = CRM.indexOf('data-teste="abrir-minha-rotina"');
  const trecho = CRM.slice(ini, ini + 900);
  assert.match(trecho, /estadoRotina\.automatica \? `· ✅ liga sozinha` : '· ⏸ parada'/);
});

test('dentro do painel "A minha rotina", o status mostra a data concreta do próximo dia — não só "está ligada"', () => {
  assert.match(CRM, /data-teste="rotina-status-automatica"/);
  assert.match(CRM, /✅ Está ligada — \$\{proximoDiaRotina \|\| 'o próximo dia'\} já nasce sozinho com ela\./);
});
