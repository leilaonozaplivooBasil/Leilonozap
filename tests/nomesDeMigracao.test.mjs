// Migração com nome que o CLI do Supabase IGNORA nunca chega no banco — e o deploy
// fica verde mesmo assim. Este teste é o que impede isso de acontecer de novo.
//
// INCIDENTE QUE ORIGINOU (27–28/08/2026): `20260827b_financial_income_cost_center.sql`
// e `20260827c_recurring_group_id.sql` (PRs #132/#134) usavam data + LETRA pra
// desempatar duas migrações do mesmo dia. O `supabase db push` só enxerga timestamp em
// dígitos puros: pulou as duas, imprimiu "Skipping migration ..." e devolveu exit 0.
// O código foi pra produção gravando numa tabela e em colunas que não existiam —
// receita não registrada e o cron gerarGastosFixos falhando calado todo dia às 06:00,
// por ~25 horas, até uma conferência manual achar.
//
// O script conferido aqui é o mesmo que roda no deploy (.github/workflows/
// deploy-migrations.yml), então o CI e o deploy nunca discordam.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(RAIZ, 'scripts', 'checar-nomes-migracoes.mjs');
const DIR = join(RAIZ, 'supabase', 'migrations');

function rodar() {
  try {
    return { ok: true, saida: execFileSync('node', [SCRIPT], { encoding: 'utf8' }) };
  } catch (e) {
    return { ok: false, saida: `${e.stdout || ''}${e.stderr || ''}` };
  }
}

describe('nomes das migrações do Supabase', () => {
  test('nenhuma migração do repositório é pulada pelo CLI', () => {
    const r = rodar();
    assert.equal(r.ok, true, `o checador reprovou:\n${r.saida}`);
  });

  test('uma migração nova com letra no lugar da hora é REPROVADA', () => {
    // Exatamente o formato que causou o incidente. Se um dia isto passar, a trava
    // furou e o próximo `20260901b_...` vai sumir em produção de novo.
    const alvo = join(DIR, '20260901b_teste_da_trava.sql');
    writeFileSync(alvo, '-- arquivo temporário do teste; removido no finally\n');
    try {
      const r = rodar();
      assert.equal(r.ok, false, 'o checador deixou passar um nome que o CLI ignora');
      assert.match(r.saida, /20260901b_teste_da_trava\.sql/);
    } finally {
      unlinkSync(alvo);
    }
  });

  test('desempate por hora (14 dígitos) é aceito', () => {
    const alvo = join(DIR, '20260901143000_teste_da_trava.sql');
    writeFileSync(alvo, '-- arquivo temporário do teste; removido no finally\n');
    try {
      assert.equal(rodar().ok, true, 'o formato recomendado no erro foi recusado');
    } finally {
      unlinkSync(alvo);
    }
  });

  test('a lista de herança só cobre arquivos que ainda existem', () => {
    // Se alguém apagar ou renomear um dos 10 antigos, a entrada correspondente vira
    // lixo e passa a ser uma exceção aberta pra um nome inválido futuro.
    const naPasta = new Set(readdirSync(DIR));
    const heranca = [
      '20260821c_estorno_carteira.sql',
      '20260821d_reserva_ledger_trava_devolucao.sql',
      '20260821e_estoque_baixa_atomica.sql',
      '20260821f_estoque_check_nao_negativo.sql',
      '20260821g_estoque_reservas.sql',
      '20260822a_whatsapp_router_idempotencia.sql',
      '20260822b_ai_conversas.sql',
      '20260822c_heloim_solicitacoes.sql',
      '20260827b_financial_income_cost_center.sql',
      '20260827c_recurring_group_id.sql',
    ];
    const orfas = heranca.filter((f) => !naPasta.has(f));
    assert.deepEqual(orfas, [], 'tire da lista de herança do script o que não existe mais');
  });
});
