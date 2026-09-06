#!/usr/bin/env node
// Falha se alguma migração NOVA tiver nome que o CLI do Supabase ignora.
//
// ── POR QUE ISTO EXISTE (28/08/2026) ─────────────────────────────────────────
// O `supabase db push` só enxerga arquivo no formato `<timestamp>_nome.sql`, com
// o timestamp em dígitos puros. Qualquer outra coisa ele PULA — imprimindo uma
// linha discreta ("Skipping migration ...") e devolvendo exit 0. Verde no CI,
// migração inexistente no banco.
//
// Foi assim que financial_income, cost_center e recurring_group_id (PRs #132/#134)
// ficaram fora de produção: os arquivos se chamavam `20260827b_...` e `20260827c_...`
// — data + LETRA, um jeito natural de desempatar duas migrações do mesmo dia, e que
// o CLI descarta. O código foi pro ar em 27/08 gravando numa tabela e em colunas
// que não existiam: receita não registrada e o cron de gastos fixos falhando calado
// às 06:00 todo dia, por ~25 horas, até alguém conferir na mão.
//
// Este script transforma esse silêncio em erro de CI, antes do merge.
//
// ── COMO DESEMPATAR DUAS MIGRAÇÕES DO MESMO DIA ──────────────────────────────
// Use a HORA, não uma letra: `20260827_x.sql` e `20260827b_x.sql` viram
// `20260827143000_x.sql` e `20260827150000_x.sql`. Continua ordenando certo e o
// CLI enxerga as duas.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

// Dígitos puros + underscore + nome. É o que o CLI aceita.
const PADRAO = /^\d+_[^/]*\.sql$/;

// Os 10 arquivos que já estavam fora do padrão quando esta trava foi criada.
// Estão TODOS aplicados em produção, na mão, e ficam de fora da checagem de
// propósito: renomear faria o CLI vê-los como novos e tentar reaplicar — e
// 20260821c tem `UPDATE ... SET` (correção de dados pontual) que não pode rodar
// duas vezes. A lista é fechada: nome novo fora do padrão falha, mesmo parecido.
const HERANCA = new Set([
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
]);

const arquivos = readdirSync(DIR).filter((f) => f.endsWith('.sql'));
const invalidos = arquivos.filter((f) => !PADRAO.test(f) && !HERANCA.has(f));

if (invalidos.length) {
  console.error('\n❌ Migração com nome que o CLI do Supabase IGNORA:\n');
  for (const f of invalidos) console.error(`   supabase/migrations/${f}`);
  console.error(
    '\nO `supabase db push` pula esses arquivos em silêncio (exit 0). O deploy fica\n' +
    'verde e a migração NUNCA chega no banco — foi assim que financial_income e\n' +
    'cost_center ficaram fora de produção por 25 horas em 27/08/2026.\n\n' +
    'Formato aceito: <digitos>_nome.sql   (ex.: 20260828_minha_migracao.sql)\n' +
    'Duas no mesmo dia? Desempate pela HORA, nunca por letra:\n' +
    '   20260828143000_primeira.sql\n' +
    '   20260828150000_segunda.sql\n'
  );
  process.exit(1);
}

// ── SEGUNDA TRAVA: VERSÃO REPETIDA (06/09/2026) ───────────────────────────────
// O CLI identifica a migração pela VERSÃO — os dígitos antes do primeiro "_" —
// e no histórico do banco `version` é chave primária. Dois arquivos com o mesmo
// prefixo viram UMA versão só: registrar essa versão marca os dois como
// aplicados, mesmo que só um tenha rodado.
//
// Não é hipótese. Em 06/09/2026 a auditoria contra o banco de produção achou
// `20260730_concurso_checkin.sql` NUNCA aplicada — a coluna last_checkin não
// existia —, escondida atrás de `20260730_wallet_held_balance.sql`, que dividia
// a mesma versão. O check-in do concurso vinha vivendo só no localStorage,
// porque a API engole o erro do PATCH.
//
// Esta trava NÃO tem lista de herança, e isso é de propósito: as 8 colisões que
// existiam foram desfeitas no mesmo dia. Cada arquivo ganhou versão única e a
// sua própria linha no histórico do banco, então nenhum deles voltou pra fila.
// Colisão, aqui, é sempre erro.
const porVersao = new Map();
for (const f of arquivos) {
  const m = /^(\d+)_/.exec(f);
  if (!m) continue; // nome fora do padrão: já tratado na checagem de cima
  if (!porVersao.has(m[1])) porVersao.set(m[1], []);
  porVersao.get(m[1]).push(f);
}
const colisoes = [...porVersao].filter(([, fs]) => fs.length > 1);

if (colisoes.length) {
  console.error('\n❌ Duas migrações dividindo a MESMA versão:\n');
  for (const [v, fs] of colisoes) console.error(`   ${v} → ${fs.join('  ')}`);
  console.error(
    '\nO CLI e o histórico do banco identificam a migração pelos dígitos antes do\n' +
    'primeiro "_". Duas com o mesmo prefixo viram uma versão só: registrar essa\n' +
    'versão marca as duas como aplicadas, e a que não rodou some sem erro nenhum.\n' +
    'Foi assim que 20260730_concurso_checkin ficou 5 semanas fora do banco.\n\n' +
    'Desempate pela HORA, com 14 dígitos:\n' +
    '   20260730010000_primeira.sql\n' +
    '   20260730020000_segunda.sql\n'
  );
  process.exit(1);
}

console.log(`✅ ${arquivos.length} migrações conferidas — nenhuma será pulada pelo CLI.`);
console.log(`   ${porVersao.size} versões distintas, nenhuma colisão nova.`);
if (HERANCA.size) {
  console.log(`   (${HERANCA.size} de herança, já aplicadas à mão, fora da checagem)`);
}
