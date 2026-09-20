// 🔁 "NÃO ESTÁ CLARO" — DIR-150 (15/09/2026).
//
// O botão "repetir todo dia" da DIR-146 existia, mas dono, ao vivo, um dia
// depois: "não está claro que dá pra deixar a rotina salva pro dia
// seguinte... dê a opção de ela manter recorrente isso com a rotina diária
// dela, bem claro." Três furos concretos:
//
// 1. O botão era só um ÍCONE, sem legenda — sem hover (celular), ninguém
//    lia o que ele fazia, e depois de clicar não tinha como saber se
//    aquela tarefa JÁ era recorrente ou não.
// 2. A escolha só aparecia DEPOIS de criar a tarefa, num segundo passo que
//    ela tinha que lembrar de fazer — "cada rotina que ela coloque" pede
//    a opção NA HORA de colocar.
// 3. Editar hora/título de uma tarefa dava só um AVISO passivo ("pra mudar
//    todo dia, edite a sua rotina"), sem ação nenhuma ali.
//
// E o Ritual do Amanhecer NUNCA pode entrar em nenhum desses três — ele não
// é um item comum de `metodo_perfil.rotina` (é gerado e pesado à parte,
// DIR-142, 20% do dia); deixar "repetir" nele criaria uma entrada de rotina
// fantasma brigando com o ritual de verdade todo dia.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));

test('a tarefa do dia mostra um SELO quando já é recorrente — não fica só o botão mudo', () => {
  assert.match(CRM, /estaNaRotina\(t\.hora, t\.titulo\) \? \(/);
  assert.match(CRM, /data-teste="ja-e-rotina"/);
  assert.match(CRM, /já repete todo dia/);
});

test('o botão de repetir agora tem TEXTO, não só ícone (celular não tem hover pro title)', () => {
  const ini = CRM.indexOf('data-teste="repetir-todo-dia"');
  assert.ok(ini > 0, 'premissa: o botão existe');
  const trecho = CRM.slice(ini - 50, ini + 400);
  assert.match(trecho, /> repetir todo dia<\/button>/, 'o botão voltou a ser só ícone, sem texto ao lado');
});

test('o Ritual do Amanhecer NUNCA ganha botão/selo de repetir — não é item comum da rotina', () => {
  const ini = CRM.indexOf('data-teste="repetir-todo-dia"');
  const fim = CRM.indexOf('removerTarefa(t)', ini);
  const bloco = CRM.slice(CRM.lastIndexOf('{!ehTarefaDeGratidao(t.titulo) && (', ini), fim);
  assert.match(bloco, /!ehTarefaDeGratidao\(t\.titulo\) && \(/, 'sumiu a blindagem do ritual no botão/selo de repetir');
});

test('a escolha de repetir entra JUNTO de criar a tarefa nova — não só depois', () => {
  assert.match(CRM, /const \[repetirNovaTarefa, setRepetirNovaTarefa\] = useState\(false\);/);
  assert.match(CRM, /data-teste="repetir-nova-tarefa"/);
  assert.match(CRM, /if \(repetirNovaTarefa && !estaNaRotina\(novaTarefa\.hora \|\| '', novaTarefa\.titulo\)\) \{/);
  // 🗓️ 20/09/2026 — DIR-166.2: o dia da semana escolhido na hora de criar
  // a tarefa entra no mesmo gravarRotina, não num patch separado.
  assert.match(CRM, /await gravarRotina\(incluirNaRotina\(rotina, \{ hora: novaTarefa\.hora \|\| '', titulo: novaTarefa\.titulo, dias_semana: diasNovaTarefa \}\)\);/);
});

test('editar hora/título de hoje ganha a MESMA escolha, não só um aviso passivo', () => {
  assert.match(CRM, /const \[repetirEdicao, setRepetirEdicao\] = useState\(false\);/);
  assert.match(CRM, /data-teste="repetir-na-edicao"/);
  // pré-marcado quando a tarefa já é da rotina — ela está corrigindo o
  // padrão, não criando uma exceção pontual
  assert.match(CRM, /setRepetirEdicao\(estaNaRotina\(t\.hora, t\.titulo\)\)/);
  // salvarEdicao aplica a MESMA correção na rotina, achando pelo título
  // ORIGINAL (antes da edição) — nunca cria duplicata
  assert.match(CRM, /const idx = rotina\.findIndex\(\(i\) => i\.titulo\.trim\(\)\.toLowerCase\(\) === String\(t\.titulo \|\| ''\)\.trim\(\)\.toLowerCase\(\)\);/);
  // 🗓️ 20/09/2026 — DIR-166.1: o dia da semana entra junto, no mesmo patch
  assert.match(CRM, /const patch = \{ hora, titulo, dias_semana: edicao\.dias_semana \};/);
  assert.match(CRM, /const novaRotina = idx >= 0 \? editarNaRotina\(rotina, idx, patch\) : incluirNaRotina\(rotina, patch\);/);
});

test('editar o Ritual não oferece "repetir" — o horário dele é definido nele mesmo, não na rotina genérica', () => {
  assert.match(CRM, /isto muda só o dia de hoje — o horário do Ritual do Amanhecer é definido nele mesmo\./);
});
