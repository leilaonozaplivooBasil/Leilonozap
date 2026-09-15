#!/usr/bin/env node
// 🚦 Quem mais está mexendo nos mesmos arquivos que eu?
//
// ── POR QUE ISTO EXISTE (15/09/2026) ─────────────────────────────────────────
// Hoje três migrações foram aplicadas na produção por outro chat, sem arquivo
// neste repositório: `auditoria_escrow_so_venda_de_verdade`, `auditoria_rate_limit`
// e `auditoria_app_users_colunas_publicas`. A última revogou o acesso da chave
// publicável à tabela app_users, e o login por e-mail parou de funcionar — porque
// o plataformaAdapter lê com `select('*')`, e `select *` não passa em tabela com
// privilégio por coluna.
//
// Ninguém agiu de má-fé. O que faltou foi um lugar onde desse pra VER que duas
// frentes estavam mexendo na mesma coisa antes de uma delas mesclar.
//
// Este script responde exatamente isso: pega os arquivos que o meu ramo mexeu
// desde que saiu do main, e cruza com os de todo outro ramo `claude/*` publicado.
// Arquivo que aparece em dois ramos é conflito esperando acontecer.
//
// LIMITE HONESTO: isto enxerga GIT, não o banco. Mudança aplicada direto no
// Supabase (como as três de hoje) não deixa rastro em ramo nenhum — por isso o
// aviso do fim é incondicional, e não depende do que o script achou.
import { execSync } from 'node:child_process';

const git = (cmd, silencioso = false) => {
  try { return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: silencioso ? ['pipe', 'pipe', 'ignore'] : undefined }).trim(); }
  catch { return null; }
};

const BASE = process.env.RAMO_BASE || 'origin/main';
const atual = git('rev-parse --abbrev-ref HEAD');

// Best-effort: sem rede, seguimos com o que já está em cache local.
git('fetch origin --quiet', true);

const arquivosDe = (ramo) => {
  const base = git(`merge-base ${BASE} ${ramo}`, true);
  if (!base) return null;
  const saida = git(`diff --name-only ${base} ${ramo}`, true);
  return saida ? saida.split('\n').filter(Boolean) : [];
};

const meus = arquivosDe(atual);
if (meus === null) {
  console.log(`Não consegui comparar "${atual}" com ${BASE}. Rode com RAMO_BASE=<ramo> se a base for outra.`);
  process.exit(0);
}

const outros = (git('branch -r --list "origin/claude/*"', true) || '')
  .split('\n').map((l) => l.trim()).filter(Boolean)
  .filter((r) => r !== `origin/${atual}` && !r.includes('->'));

console.log(`\n🚦 Ramo atual: ${atual}  (${meus.length} arquivo(s) mexido(s) desde ${BASE})\n`);

let houveColisao = false;
for (const ramo of outros) {
  const deles = arquivosDe(ramo);
  if (!deles) continue;
  const comuns = meus.filter((f) => deles.includes(f));
  if (!comuns.length) continue;
  houveColisao = true;
  console.log(`⚠️  ${ramo} mexe em ${comuns.length} arquivo(s) que eu também mexo:`);
  for (const f of comuns) console.log(`      ${f}`);
  console.log('');
}

if (!houveColisao) {
  console.log(`✅ Nenhum outro ramo claude/* publicado mexe nos meus arquivos (${outros.length} ramo(s) conferido(s)).\n`);
}

// 🔴 INCONDICIONAL. O script vê git; o outro chat pode estar aplicando SQL
// direto no banco, e isso não aparece em ramo nenhum.
console.log('──────────────────────────────────────────────────────────────');
console.log('🔴 ANTES DE MESCLAR: avise o outro chat.');
console.log('   Git não enxerga mudança aplicada direto no Supabase.');
console.log('   Confira também as migrações registradas no banco que não têm');
console.log('   arquivo aqui — foi assim que o login quebrou em 15/09.');
console.log('──────────────────────────────────────────────────────────────\n');

if (process.argv.includes('--estrito') && houveColisao) process.exit(1);
