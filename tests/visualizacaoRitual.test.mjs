// 🎥 A VISUALIZAÇÃO GRAVADA ganha um piso de verdade (dono, 08/09/2026):
// "precisa de pelo menos 01 minuto obrigatório e isso precisa ficar claro
// pra pessoa, e deixar livre até a pessoa quiser". Antes não tinha piso
// nenhum (1 segundo já valia) e o teto era 2 minutos rígido, cortando a
// gravação sem avisar. Depois: 60s de piso, visível igual ao contador do
// resumo escrito; o teto vira só uma rede de segurança (15 min).
//
// 🌅 09/09/2026 — dono, ao vivo, olhando o ritual em produção: "você tem que
// ter um mínimo de visualização, e o mínimo são dois minutos." Sobe de 60s
// pra 120s — mesma régua (piso visível, teto só de segurança), novo valor.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VISUALIZACAO_MIN_SEG, VISUALIZACAO_TETO_SEG, faltaDaVisualizacao, textoDoCronometroVisualizacao,
} from '../src/lib/xgame.js';

test('o piso é 120s (2 minutos) e o teto (rede de segurança) é 15 minutos', () => {
  assert.equal(VISUALIZACAO_MIN_SEG, 120);
  assert.equal(VISUALIZACAO_TETO_SEG, 900);
  assert.ok(VISUALIZACAO_TETO_SEG > VISUALIZACAO_MIN_SEG, 'o teto tem que sobrar folga bem acima do piso — é rede de segurança, não o alvo');
});

test('faltaDaVisualizacao: conta o que falta, nunca negativo', () => {
  assert.equal(faltaDaVisualizacao(0), 120);
  assert.equal(faltaDaVisualizacao(23), 97);
  assert.equal(faltaDaVisualizacao(119), 1);
  assert.equal(faltaDaVisualizacao(120), 0);
  assert.equal(faltaDaVisualizacao(180), 0, 'passar do mínimo não vira dívida — a pessoa pode gravar quanto quiser');
  assert.equal(faltaDaVisualizacao(900), 0);
  assert.equal(faltaDaVisualizacao(undefined), 120);
});

test('textoDoCronometroVisualizacao: antes do piso, diz quanto falta pra liberar', () => {
  assert.equal(textoDoCronometroVisualizacao(0), 'gravando sua visualização · 0s — grava mais 120 segundos pra poder concluir');
  assert.equal(textoDoCronometroVisualizacao(23), 'gravando sua visualização · 23s — grava mais 97 segundos pra poder concluir');
  assert.equal(textoDoCronometroVisualizacao(119), 'gravando sua visualização · 119s — grava mais 1 segundo pra poder concluir', 'plural quebrado no último segundo estraga a mesma coisa que RESUMO_MIN já corrigiu');
});

test('textoDoCronometroVisualizacao: no piso ou acima, some o "grava mais" — fica livre', () => {
  assert.equal(textoDoCronometroVisualizacao(120), 'gravando sua visualização · 120s');
  assert.equal(textoDoCronometroVisualizacao(180), 'gravando sua visualização · 180s');
  assert.equal(textoDoCronometroVisualizacao(900), 'gravando sua visualização · 900s');
});
