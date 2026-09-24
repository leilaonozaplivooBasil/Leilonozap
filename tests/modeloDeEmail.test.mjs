// ✉️ O MODELO DOS E-MAILS (24/09/2026).
//
// Dono: "esse e-mail precisa ir mais profissional e com a nossa identidade
// visual… e também uma clean no corpo do e-mail."
//
// O que se prova aqui:
//   1. o modelo é o dos transacionais bem feitos: fundo claro, um cartão,
//      a logo em cima, um título, um botão, rodapé discreto;
//   2. ele chega inteiro em cliente de e-mail: tabela (não flex), PNG (não
//      WebP), largura 560 e nada de fundo escuro;
//   3. tudo que vem de fora é escapado — o nome do produto é texto do banco;
//   4. os QUATRO remetentes da plataforma usam o mesmo modelo — identidade
//      é uma só, não uma por arquivo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modeloDeEmail, p, blocoDeCodigo, tabelaDeDados, linkCopiavel, LOGO_URL, CORES } from '../api/_lib/modeloDeEmail.js';
import { montarAviso } from '../api/_lib/textosDosAvisos.js';
import { emailHtml } from '../api/functions/sendEmailCode.js';
import { corpoDoEmail } from '../api/functions/sendWelcomeArrematante.js';
import { emailSenhaDefinida } from '../api/functions/adminSetPassword.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const BASE = { titulo: 'Título', corpo: [p('Oi.')], botao: { rotulo: 'Ir', url: 'https://x/ir' } };

test('a estrutura: cartão branco de 560 em fundo claro, logo em cima, título, botão e rodapé', () => {
  const h = modeloDeEmail(BASE);
  assert.match(h, /^<!DOCTYPE html>/);
  assert.match(h, /<body style="margin:0;padding:0;background:#F2F4F3/);
  assert.match(h, /width="560"[^>]*max-width:560px;background:#ffffff/);
  assert.match(h, /<img src="https:\/\/leilaonozap\.net\/brand\/logo-email\.png" alt="Leilão NoZap" width="220"/);
  assert.match(h, /<h1 style="[^"]*color:#0B2D4F[^"]*">Título<\/h1>/);
  assert.match(h, /background:#1B7F4B[^>]*><a href="https:\/\/x\/ir"[^>]*>Ir<\/a>/);
  assert.match(h, /<b style="color:#0B2D4F">Leilão NoZap<\/b> · <a href="https:\/\/leilaonozap\.net"/);
  assert.match(h, /Dúvida\? É só responder este e-mail\./);
  // a ordem: logo → título → corpo → botão → rodapé
  const ordem = ['logo-email.png', '<h1', 'Oi.', 'https://x/ir', 'Dúvida?'].map((x) => h.indexOf(x));
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, 'a ordem das peças mudou');
});

test('🔴 chega inteiro no cliente de e-mail: tabela, PNG, sem fundo escuro, sem flex/grid', () => {
  const h = modeloDeEmail(BASE);
  assert.match(h, /<table role="presentation"/);
  assert.doesNotMatch(h, /display:\s*(flex|grid)/);
  assert.doesNotMatch(h, /\.webp/, 'Outlook do Windows não mostra WebP');
  assert.doesNotMatch(h, /#0d1f17|#0a0f0d|#12241c/i, 'sobrou o fundo escuro antigo');
  assert.match(LOGO_URL, /\.png$/);
  assert.equal(CORES.verde, '#1B7F4B');
});

test('o que vem de fora é escapado — título, corpo, botão, rodapé e link de sair', () => {
  const h = modeloDeEmail({
    titulo: '<b>PS5</b> & cia', corpo: [p('<script>x</script>')],
    botao: { rotulo: '"Ir"', url: 'https://x/?a=1&b=2' },
    motivo: 'porque <você> deu lance', sair: { url: 'https://x/sair?u=1&t=2', rotulo: 'Sair <já>' },
    preheader: '<pre>',
  });
  assert.match(h, /&lt;b&gt;PS5&lt;\/b&gt; &amp; cia<\/h1>/);
  assert.doesNotMatch(h, /<script>/);
  assert.match(h, /&quot;Ir&quot;/);
  assert.match(h, /href="https:\/\/x\/\?a=1&amp;b=2"/);
  assert.match(h, /porque &lt;você&gt; deu lance/);
  assert.match(h, /href="https:\/\/x\/sair\?u=1&amp;t=2"[^>]*>Sair &lt;já&gt;<\/a>/);
  assert.match(h, /&lt;pre&gt;/);
});

test('as peças do corpo: código, quadro de dados, link copiável e botão secundário', () => {
  assert.match(blocoDeCodigo('482913'), /letter-spacing:8px;color:#0B2D4F">482913</);
  const t = tabelaDeDados([['E-mail', 'a@b.c'], ['Senha', 'x<1>']]);
  assert.match(t, /E-mail<\/td><td[^>]*>a@b\.c<\/td>/);
  assert.match(t, /x&lt;1&gt;/);
  assert.match(linkCopiavel('https://x/y'), /copie este endereço[\s\S]*https:\/\/x\/y/);
  const h = modeloDeEmail({ ...BASE, botaoSecundario: { rotulo: 'Trocar', url: 'https://x/trocar' }, depoisDoBotao: [linkCopiavel('https://x/ir')], avisoFinal: 'vale 24h' });
  assert.match(h, /background:#ffffff;border:1px solid #1B7F4B"><a href="https:\/\/x\/trocar"/);
  assert.ok(h.indexOf('copie este endereço') > h.indexOf('https://x/trocar'), 'o link copiável vai DEPOIS dos botões');
  assert.ok(h.indexOf('vale 24h') > h.indexOf('copie este endereço'));
});

test('sem botão, sem sair, sem motivo: nada quebrado, nada vazio no HTML', () => {
  const h = modeloDeEmail({ titulo: 'Só', corpo: [] });
  assert.doesNotMatch(h, /undefined|null|\[object/);
  assert.doesNotMatch(h, /<a href=""/);
});

test('🔴 os QUATRO remetentes usam o mesmo modelo — a identidade é uma só', () => {
  const aviso = montarAviso('superado', { nome: 'Ana', produto: 'PS5', valorAtual: 100, termina: '2026-09-24T18:00:00Z', leilaoId: 'L1', linkSair: 'https://x/sair' });
  const codigo = emailHtml('482913', 'reset');
  const boasVindas = corpoDoEmail({ primeiroNome: 'Ana', rotulo: 'Investidor', cor: '#34d399', link: 'https://x/ResetPassword?token=abc' });
  const senha = emailSenhaDefinida({ nome: 'Ana Souza', email: 'ana@x.com', senha: 'S3nh4' });
  for (const [nome, h] of [['aviso', aviso.html], ['código', codigo], ['boas-vindas', boasVindas], ['senha', senha]]) {
    assert.match(h, /logo-email\.png/, `${nome}: sem a logo`);
    assert.match(h, /background:#F2F4F3/, `${nome}: sem o fundo claro`);
    assert.match(h, /Dúvida\? É só responder este e-mail\./, `${nome}: sem o rodapé`);
    assert.doesNotMatch(h, /#0d1f17|#0a0f0d|#12241c/i, `${nome}: ainda no fundo escuro`);
  }
  // e cada um traz o que é seu
  assert.match(aviso.html, /Cobriram seu lance em PS5<\/h1>/);
  assert.match(aviso.html, /Não quero mais receber avisos de leilão\./);
  assert.match(codigo, /482913/); assert.match(codigo, /Redefinir sua senha/);
  assert.equal((boasVindas.match(/ResetPassword\?token=abc/g) || []).length, 2);
  assert.match(senha, /S3nh4/); assert.match(senha, /Trocar minha senha/);
  // e nenhum dos quatro arquivos guarda um HTML próprio de e-mail
  for (const f of ['../api/_lib/textosDosAvisos.js', '../api/functions/sendEmailCode.js', '../api/functions/sendWelcomeArrematante.js', '../api/functions/adminSetPassword.js']) {
    const s = semComentarios(ler(f));
    assert.match(s, /from '(\.\.\/_lib|\.)\/modeloDeEmail\.js'/, `${f} não importa o modelo`);
    assert.doesNotMatch(s, /<table role="presentation"|<div style="font-family/, `${f} ainda monta HTML por conta própria`);
  }
});
