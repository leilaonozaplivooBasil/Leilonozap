/**
 * 📧 O E-MAIL DE ACESSO QUE NUNCA SAÍA — e a tela que dizia que tinha saído.
 *
 * 19/09/2026, levantamento do disparador. As telas de cadastro de Arrematante e
 * de Investidor chamavam `sendWelcomeArrematante` desde sempre; a rota NUNCA
 * existiu na Vercel (404 em produção, conferido). A chamada morria num `catch`
 * que só escrevia no console e a tela seguia exibindo "E-mail enviado com link
 * de acesso". A pessoa ficava sem o link — e sem conseguir entrar.
 *
 * O que estes testes travam:
 *   1. a rota EXISTE (era literalmente o bug);
 *   2. o link é montado NO SERVIDOR, nunca recebido pronto do cliente —
 *      senão é phishing assinado com o nosso domínio;
 *   3. a função exige admin;
 *   4. a tela só afirma "enviado" quando o servidor confirmou.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';
import { corpoDoEmail } from '../api/functions/sendWelcomeArrematante.js';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = (p) => readFileSync(path.join(RAIZ, p), 'utf8');

const MODAIS = [
  'src/components/crm/CadastroArrematanteModal.jsx',
  'src/components/crm/CadastroInvestidorModal.jsx',
];

test('🔴 a rota de e-mail de acesso EXISTE na Vercel', () => {
  // O site chama `@/functions/sendWelcomeArrematante`, que faz POST em
  // /api/functions/sendWelcomeArrematante. Sem este arquivo, é 404.
  assert.ok(
    existsSync(path.join(RAIZ, 'api/functions/sendWelcomeArrematante.js')),
    'a função sumiu — o e-mail de acesso volta a ser 404 em produção',
  );
});

test('🔐 o link NÃO vem do cliente: o servidor lê o token no banco', () => {
  const fn = semComentarios(ler('api/functions/sendWelcomeArrematante.js'));
  // o token sai de app_users, na consulta do servidor
  assert.match(fn, /password_reset_token/, 'o servidor precisa ler o token do banco');
  assert.match(fn, /const link = `\$\{SITE\}\/ResetPassword\?token=/, 'o endereço é montado aqui, com base fixa');
  // e o corpo da requisição NÃO pode mandar o destino do botão
  assert.ok(!/body\.resetLink|body\?\.resetLink/.test(fn),
    'voltou a aceitar resetLink do cliente — é phishing com o nosso domínio');
});

test('🔐 só admin dispara este e-mail', () => {
  const fn = semComentarios(ler('api/functions/sendWelcomeArrematante.js'));
  assert.match(fn, /exigirSessao/, 'sem crachá de sessão');
  assert.match(fn, /\['admin', 'super_admin'\]\.includes\(ator\.role\)/, 'sem conferência de cargo');
});

test('o e-mail leva o link e o remetente é o de ACESSO, não o de campanha', () => {
  const html = corpoDoEmail({
    primeiroNome: 'Ana', rotulo: 'Investidor', cor: '#34d399',
    link: 'https://leilaonozap.net/ResetPassword?token=abc',
  });
  assert.match(html, /Ana/);
  assert.match(html, /ResetPassword\?token=abc/);
  // aparece duas vezes de propósito: botão e endereço copiável
  assert.equal((html.match(/ResetPassword\?token=abc/g) || []).length, 2);

  const fn = semComentarios(ler('api/functions/sendWelcomeArrematante.js'));
  assert.match(fn, /no-reply@leilaonozap\.com/, 'e-mail de acesso sai pelo no-reply');
  assert.ok(!/ofertas@leilaonozap\.com/.test(fn),
    'nunca pelo remetente da campanha: reclamação lá não pode derrubar o acesso');
});

test('🔴 a tela só diz "enviado" quando o servidor confirmou', () => {
  for (const caminho of MODAIS) {
    const tela = semComentarios(ler(caminho));
    // a frase antiga, incondicional, não pode voltar
    assert.ok(!/sendEmail && <p[^>]*>E-mail enviado/.test(tela),
      `${caminho}: a frase voltou a depender só da caixa marcada`);
    // agora depende da resposta
    assert.match(tela, /setAvisoDoEmail\(r\?\.success \? 'enviado' : 'falhou'\)/, caminho);
    assert.match(tela, /avisoDoEmail === 'enviado'/, caminho);
    assert.match(tela, /avisoDoEmail === 'falhou'/, `${caminho}: falta avisar quando NÃO saiu`);
  }
});

test('📭 o disparador em massa morto saiu do ar', () => {
  // A tela prometia disparo e a rota não existia (404 em produção).
  assert.ok(!existsSync(path.join(RAIZ, 'src/components/admin/MessageDispatcher.jsx')),
    'o MessageDispatcher voltou');
  assert.ok(!existsSync(path.join(RAIZ, 'src/functions/sendBulkMessages.js')),
    'o atalho para a rota inexistente voltou');
  // ⚠️ SEM OS COMENTÁRIOS: a primeira versão deste teste reprovou porque o
  // comentário que EXPLICA a remoção cita "Disparar Mensagens". O teste estava
  // acusando a própria documentação.
  const tela = semComentarios(ler('src/pages/NetworkOverview.jsx'));
  assert.ok(!/<MessageDispatcher/.test(tela), 'o modal voltou a ser montado');
  assert.ok(!/Disparar Mensagens/.test(tela), 'o botão voltou');
});

test('o caminho vivo de disparo continua de pé', () => {
  // Tirar o morto não pode levar o bom junto.
  for (const arq of ['scripts/campanha/disparar.mjs', 'scripts/campanha/publico.mjs',
                     'scripts/campanha/modelo.mjs', 'api/functions/descadastrar.js']) {
    assert.ok(existsSync(path.join(RAIZ, arq)), `${arq} sumiu`);
  }
});
