#!/usr/bin/env node
// 🚀 O disparo. E-mail pela Brevo, SMS pela Brevo.
//
//   # 1. sempre comece assim — não manda nada, só mostra o que mandaria
//   node scripts/campanha/disparar.mjs
//
//   # 2. um e-mail só, para você mesmo, e abra no celular antes de liberar
//   node scripts/campanha/disparar.mjs --teste=voce@exemplo.com --enviar
//
//   # 3. o disparo de verdade, em lotes. O --lote é obrigatório de propósito.
//   node scripts/campanha/disparar.mjs --canal=email --lote=100 --enviar
//
// Variáveis de ambiente:
//   BREVO_API_KEY                 (a mesma que o sendEmailCode.js já usa)
//   CAMPANHA_SECRET               (opcional; cai na service role se faltar)
//   SUPABASE_SERVICE_ROLE_KEY     (para ler os leilões e assinar o descadastro)
//   SUPABASE_URL / VITE_SUPABASE_URL
//
// 🔴 TRÊS TRAVAS, de propósito:
//   • sem --enviar, nada sai;
//   • sem --lote=N, nada sai (ninguém dispara 677 e-mails por engano);
//   • quem já recebeu fica gravado em saida/enviados.jsonl e não recebe de novo,
//     mesmo que você rode o comando duas vezes.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { montarMensagem, urlDeDescadastro } from './modelo.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'saida');
const PUBLICO = path.join(SAIDA, 'publico.json');
const JA_FOI = path.join(SAIDA, 'enviados.jsonl');

const URL_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO = process.env.BREVO_API_KEY;
const SEGREDO = process.env.CAMPANHA_SECRET || SR;

// ⚠️ Remetente PRÓPRIO da campanha, separado do no-reply@ que manda código de
// login. Mesmo domínio (o DKIM é do leilaonozap.com), mas caixa diferente: se a
// campanha levar reclamação, o estrago fica concentrado neste endereço e não no
// e-mail que as pessoas precisam receber para conseguir entrar na plataforma.
const DE = { name: 'Leilão NoZap', email: 'ofertas@leilaonozap.com' };
const RESPONDER = { name: 'Leilão NoZap', email: 'relacionamento@leilaonozap.com' };
const REMETENTE_SMS = 'LeilaoNoZap'.slice(0, 11); // operadora corta em 11 caracteres

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));

const ENVIAR = args.enviar === true;
const CANAL = String(args.canal || 'email');          // email | sms | ambos
const LOTE = Number(args.lote) || 0;
const POR_MINUTO = Number(args['por-minuto']) || 60;  // ritmo do envio
const TESTE = typeof args.teste === 'string' ? args.teste.toLowerCase() : '';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function assinar(valor) {
  return crypto.createHmac('sha256', String(SEGREDO))
    .update(String(valor).trim().toLowerCase()).digest('hex').slice(0, 24);
}

/** Os leilões que entram na mensagem: o que fecha primeiro é o destaque. */
async function buscarLeiloes() {
  const qs = 'select=id,title,current_price,end_time,image_urls'
    + '&status=eq.active&order=end_time.asc&limit=4';
  const r = await fetch(`${URL_BASE}/rest/v1/auctions?${qs}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  if (!r.ok) throw new Error(`auctions: HTTP ${r.status}`);
  const linhas = await r.json();
  const agora = Date.now();
  const vivos = linhas
    .filter((a) => new Date(a.end_time).getTime() > agora)
    .map((a) => ({ ...a, capa: Array.isArray(a.image_urls) ? a.image_urls[0] : null }));
  if (!vivos.length) throw new Error('Nenhum leilão ativo com prazo no futuro. Não há o que divulgar.');
  return { destaque: vivos[0], outros: vivos.slice(1, 4) };
}

function jaRecebeu() {
  if (!fs.existsSync(JA_FOI)) return new Set();
  return new Set(fs.readFileSync(JA_FOI, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l).alvo; } catch { return null; } })
    .filter(Boolean));
}

function anotar(canal, alvo, ok, detalhe) {
  fs.mkdirSync(SAIDA, { recursive: true });
  fs.appendFileSync(JA_FOI, `${JSON.stringify({
    quando: new Date().toISOString(), canal, alvo, ok, detalhe: detalhe || '',
  })}\n`);
}

async function mandarEmail(contato, msg, linkSaida) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': BREVO, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: DE,
      to: [{ email: contato.email, name: contato.nome || undefined }],
      replyTo: RESPONDER,
      subject: msg.assunto,
      htmlContent: msg.html,
      textContent: msg.texto,
      // Cabeçalho que o Gmail/Outlook leem para mostrar o botão nativo de
      // "cancelar inscrição". Campanha sem ele cai em promoções — ou em spam.
      headers: {
        'List-Unsubscribe': `<${linkSaida}>, <mailto:${RESPONDER.email}?subject=SAIR>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: ['campanha-leilao'],
    }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0, 180)}`);
  return (await r.json())?.messageId || 'ok';
}

async function mandarSms(contato, sms) {
  const r = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': BREVO, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: REMETENTE_SMS,
      recipient: contato.telefone.replace('+', ''),
      content: sms.texto,
      type: 'marketing',
      tag: 'campanha-leilao',
    }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0, 180)}`);
  return (await r.json())?.messageId || 'ok';
}

/** Pergunta à Brevo se a conta tem crédito de SMS antes de tentar mandar. */
async function creditoDeSms() {
  const r = await fetch('https://api.brevo.com/v3/account', { headers: { accept: 'application/json', 'api-key': BREVO } });
  if (!r.ok) return null;
  const conta = await r.json();
  const sms = (conta?.plan || []).find((p) => String(p.type).toLowerCase().includes('sms'));
  return sms ? Number(sms.credits) || 0 : 0;
}

async function principal() {
  if (!fs.existsSync(PUBLICO)) {
    console.error('Não achei saida/publico.json. Rode antes:  node scripts/campanha/listar.mjs');
    process.exit(1);
  }
  if (ENVIAR && !BREVO) { console.error('Faltou BREVO_API_KEY.'); process.exit(1); }
  if (ENVIAR && !TESTE && !LOTE) {
    console.error('Envio de verdade exige --lote=N. Ex.: --lote=100');
    process.exit(1);
  }

  const publico = JSON.parse(fs.readFileSync(PUBLICO, 'utf8'));
  const { destaque, outros } = await buscarLeiloes();

  let alvosEmail = CANAL === 'sms' ? [] : publico.email;
  let alvosSms = CANAL === 'email' ? [] : publico.sms;

  if (TESTE) {
    alvosEmail = [{ nome: 'Teste', email: TESTE, telefone: '', classe: 'ok' }];
    alvosSms = [];
  } else {
    const feitos = jaRecebeu();
    alvosEmail = alvosEmail.filter((c) => !feitos.has(c.email));
    alvosSms = alvosSms.filter((c) => !feitos.has(c.telefone));
    if (LOTE) { alvosEmail = alvosEmail.slice(0, LOTE); alvosSms = alvosSms.slice(0, LOTE); }
  }

  const exemplo = montarMensagem({
    contato: alvosEmail[0] || alvosSms[0] || { nome: '' },
    destaque, outros,
    linkSaida: urlDeDescadastro('exemplo@exemplo.com', assinar('exemplo@exemplo.com')),
  });

  console.log('\n══════════ PLANO DO DISPARO ══════════');
  console.log(`  destaque .......... ${destaque.title}`);
  console.log(`  mais lotes ........ ${outros.length}`);
  console.log(`  assunto ........... ${exemplo.assunto}  (${exemplo.assunto.length} caracteres)`);
  console.log(`  SMS ............... ${exemplo.sms.tamanho} caracteres, ${exemplo.sms.partes} parte(s)`);
  console.log(`  e-mails a enviar .. ${alvosEmail.length}`);
  console.log(`  SMS a enviar ...... ${alvosSms.length}`);
  console.log(`  ritmo ............. ${POR_MINUTO}/minuto`);
  console.log(`  modo .............. ${ENVIAR ? '🔴 ENVIANDO DE VERDADE' : '🟢 ensaio (nada sai)'}`);
  console.log('══════════════════════════════════════\n');

  if (alvosSms.length && ENVIAR) {
    const credito = await creditoDeSms();
    if (credito !== null && credito < alvosSms.length) {
      console.warn(`⚠️  Crédito de SMS na Brevo: ${credito}. Precisa de ${alvosSms.length}.`);
      console.warn('   Compre crédito e registre o remetente para o Brasil, ou rode com --canal=email.\n');
      alvosSms = [];
    }
  }

  if (!ENVIAR) {
    fs.mkdirSync(SAIDA, { recursive: true });
    fs.writeFileSync(path.join(SAIDA, 'previa.html'), exemplo.html);
    fs.writeFileSync(path.join(SAIDA, 'previa.txt'), `${exemplo.assunto}\n\n${exemplo.texto}\n\n---\nSMS:\n${exemplo.sms.texto}`);
    console.log(`Prévia gravada em ${path.join(SAIDA, 'previa.html')}`);
    console.log('Abra no navegador. Gostou? Repita com --teste=seu@email --enviar\n');
    return;
  }

  const intervalo = Math.max(0, Math.round(60000 / POR_MINUTO));
  let ok = 0; let erro = 0;

  for (const c of alvosEmail) {
    const linkSaida = urlDeDescadastro(c.email, assinar(c.email));
    const msg = montarMensagem({ contato: c, destaque, outros, linkSaida });
    try {
      const id = await mandarEmail(c, msg, linkSaida);
      if (!TESTE) anotar('email', c.email, true, id);
      ok++;
    } catch (e) {
      if (!TESTE) anotar('email', c.email, false, e.message);
      erro++;
      console.error(`  ✖ ${c.email}: ${e.message}`);
    }
    if ((ok + erro) % 25 === 0) console.log(`  ... ${ok + erro}/${alvosEmail.length}`);
    await espera(intervalo);
  }

  for (const c of alvosSms) {
    const msg = montarMensagem({ contato: c, destaque, outros, linkSaida: '' });
    try {
      const id = await mandarSms(c, msg.sms);
      anotar('sms', c.telefone, true, id);
      ok++;
    } catch (e) {
      anotar('sms', c.telefone, false, e.message);
      erro++;
      console.error(`  ✖ ${c.telefone}: ${e.message}`);
    }
    await espera(intervalo);
  }

  console.log(`\n✔ enviados: ${ok}   ✖ falhas: ${erro}`);
  console.log(`Registro em ${JA_FOI}\n`);
}

principal().catch((e) => { console.error('\n✖', e.message, '\n'); process.exit(1); });
