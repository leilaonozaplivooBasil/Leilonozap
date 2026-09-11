#!/usr/bin/env node
// 📋 Monta a lista de quem vai receber a campanha.
//
//   node scripts/campanha/listar.mjs
//
// Precisa de duas variáveis de ambiente (as mesmas que a Vercel já usa):
//   SUPABASE_URL (ou VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY
//
// Grava em scripts/campanha/saida/:
//   publico.json  — o que o disparar.mjs lê
//   publico.csv   — a planilha, para conferir com o olho antes de disparar
//
// Este script NÃO envia nada. Ele só lê e escreve arquivo.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { juntarSemRepetir, separarParaDisparo, contarPorClasse } from './publico.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'saida');

const URL_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * De onde vêm os contatos. Cada linha vira `{nome,email,telefone}` pelo `mapa`.
 * Mexeu numa tabela? É aqui que se acrescenta — o resto do arquivo não muda.
 */
const FONTES = [
  {
    origem: 'cadastro', tabela: 'app_users',
    colunas: 'full_name,email,phone,won_auctions,total_bids',
    mapa: (r) => ({ nome: r.full_name, email: r.email, telefone: r.phone,
      compras: r.won_auctions, lances: r.total_bids }),
  },
  {
    origem: 'loja', tabela: 'catalog_sales',
    colunas: 'buyer_name,buyer_email,buyer_phone',
    mapa: (r) => ({ nome: r.buyer_name, email: r.buyer_email, telefone: r.buyer_phone, compras: 1 }),
  },
  {
    origem: 'concurso', tabela: 'concurso_participantes', colunas: 'nome,whatsapp',
    mapa: (r) => ({ nome: r.nome, telefone: r.whatsapp }),
  },
  {
    origem: 'crm', tabela: 'customers', colunas: 'full_name,email,phone',
    mapa: (r) => ({ nome: r.full_name, email: r.email, telefone: r.phone }),
  },
  {
    origem: 'vendedor', tabela: 'sellers', colunas: 'name,email,phone',
    mapa: (r) => ({ nome: r.name, email: r.email, telefone: r.phone }),
  },
  {
    origem: 'captacao', tabela: 'captacao_oportunidades',
    colunas: 'cliente_nome,cliente_email,cliente_telefone',
    mapa: (r) => ({ nome: r.cliente_nome, email: r.cliente_email, telefone: r.cliente_telefone }),
  },
  {
    origem: 'loja_parceira', tabela: 'stores', colunas: 'owner_name,store_name,email,phone',
    mapa: (r) => ({ nome: r.owner_name || r.store_name, email: r.email, telefone: r.phone }),
  },
];

async function buscarTudo(tabela, colunas) {
  const linhas = [];
  const passo = 1000;
  for (let de = 0; ; de += passo) {
    const r = await fetch(`${URL_BASE}/rest/v1/${tabela}?select=${encodeURIComponent(colunas)}`, {
      headers: {
        apikey: SR, Authorization: `Bearer ${SR}`,
        Range: `${de}-${de + passo - 1}`, 'Range-Unit': 'items',
      },
    });
    if (!r.ok) throw new Error(`${tabela}: HTTP ${r.status} — ${(await r.text()).slice(0, 160)}`);
    const lote = await r.json();
    linhas.push(...lote);
    if (lote.length < passo) return linhas;
  }
}

async function buscarDescadastrados() {
  const r = await fetch(`${URL_BASE}/rest/v1/marketing_descadastro?select=email,telefone`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  if (r.status === 404) {
    // A migração 20260911233000 ainda não subiu. Avisa alto: disparar sem a
    // tabela de descadastro é exatamente o que não pode acontecer duas vezes.
    console.warn('\n⚠️  A tabela marketing_descadastro não existe ainda.');
    console.warn('   Suba a migração 20260911233000_marketing_descadastro.sql antes de disparar.\n');
    return [];
  }
  if (!r.ok) throw new Error(`marketing_descadastro: HTTP ${r.status}`);
  const linhas = await r.json();
  return linhas.flatMap((l) => [l.email, l.telefone].filter(Boolean).map((v) => String(v).toLowerCase()));
}

function paraCsv(contatos) {
  const campo = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [['nome', 'email', 'telefone', 'classe', 'interno', 'origem', 'compras', 'lances'].join(';')];
  for (const c of contatos) {
    linhas.push([c.nome, c.email, c.telefone, c.classe, c.interno ? 'sim' : '',
      c.origem, c.compras, c.lances].map(campo).join(';'));
  }
  // BOM na frente para o Excel em português abrir com acento certo
  return `﻿${linhas.join('\r\n')}\r\n`;
}

async function principal() {
  if (!URL_BASE || !SR) {
    console.error('Faltou SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.');
    process.exit(1);
  }

  const brutos = [];
  for (const f of FONTES) {
    const linhas = await buscarTudo(f.tabela, f.colunas);
    for (const l of linhas) brutos.push({ ...f.mapa(l), origem: f.origem });
    console.log(`  ${f.tabela.padEnd(24)} ${String(linhas.length).padStart(5)} linhas`);
  }

  const contatos = juntarSemRepetir(brutos);
  const fora = await buscarDescadastrados();
  const grupos = separarParaDisparo(contatos, fora);

  fs.mkdirSync(SAIDA, { recursive: true });
  fs.writeFileSync(path.join(SAIDA, 'publico.json'), JSON.stringify({
    gerado_em: new Date().toISOString(),
    total: contatos.length,
    por_classe: contarPorClasse(contatos),
    descadastrados: grupos.descadastrados.length,
    email: grupos.email,
    sms: grupos.sms,
  }, null, 2));
  fs.writeFileSync(path.join(SAIDA, 'publico.csv'), paraCsv(contatos));

  console.log('\n──────────────────────────────────────────');
  console.log(`  contatos únicos ......... ${contatos.length}`);
  console.log(`  vão receber e-mail ...... ${grupos.email.length}`);
  console.log(`  têm telefone (SMS) ...... ${grupos.sms.length}`);
  console.log(`  barrados ................ ${grupos.barrados.length}`, contarPorClasse(grupos.barrados));
  console.log(`  pediram para sair ....... ${grupos.descadastrados.length}`);
  console.log('──────────────────────────────────────────');
  console.log(`\nArquivos em ${SAIDA}\n`);
}

principal().catch((e) => { console.error('\n✖', e.message, '\n'); process.exit(1); });
