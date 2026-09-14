// 🔁 "SALVAR PROS OUTROS DIAS", CLARO, NO LUGAR ONDE A PESSOA MONTA O DIA
// DELA — DIR-146 (14/09/2026).
//
// O incidente: a Eloá organizou o dia dela em 13/09 (tarefas próprias, hora
// e título dela), e no dia seguinte o app voltou pra rotina padrão da casa —
// a customização nunca tinha sido salva no MOLDE permanente
// (metodo_perfil.rotina), só como linhas avulsas daquele dia. Dono, ao vivo:
// "a gente tem que ter uma opção também, de quando a pessoa montar o teu
// planejamento, ter um botão de salvar pros outros dias, e isso ficar
// claro." O ADM já tinha isso (DIR-142.2, tornarRecorrente); faltava pra
// PRÓPRIA pessoa, direto na tarefa do dia — não escondido num painel à parte.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));

test('a tarefa do dia tem um botão claro de "repetir todo dia" — mesma função de incluir da rotina', () => {
  assert.match(CRM, /const tornarRecorrente = \(t\) => \{/);
  assert.match(CRM, /gravarRotina\(incluirNaRotina\(rotina, \{ hora: t\.hora, titulo: t\.titulo \}\)\)/);
  assert.match(CRM, /data-teste="repetir-todo-dia"/);
  assert.match(CRM, /onClick=\{\(\) => tornarRecorrente\(t\)\}/);
});

test('repetir não duplica: já estando na rotina, avisa em vez de gravar de novo', () => {
  assert.match(CRM, /rotina\.some\(\(i\) => i\.titulo\.trim\(\)\.toLowerCase\(\) === String\(t\.titulo \|\| ''\)\.trim\(\)\.toLowerCase\(\)\)/);
  assert.match(CRM, /toast\.error\('Já está na sua rotina — repete todo dia\.'\)/);
});
