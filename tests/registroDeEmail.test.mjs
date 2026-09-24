/**
 * 📧 O REGISTRO DE E-MAILS ENVIADOS.
 *
 * Levantamento de 19/09/2026: a plataforma mandava e-mail há meses e não
 * guardava nada. Sem registro não há resposta para "essa pessoa recebeu o
 * código?" nem para uma reclamação de spam.
 *
 * 🔴 A PARTE PERIGOSA É O QUE *NÃO* PODE SER GRAVADO. O assunto do código de
 * login é literalmente "483920 é seu código — Leilão NoZap": gravar o assunto
 * cru seria guardar a senha de uso único em texto puro, ao lado do e-mail da
 * pessoa. É isso que a maior parte destes testes protege.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';
import { limparAssunto, idDaBrevo, TIPOS } from '../api/_lib/registroDeEmail.js';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = (p) => readFileSync(path.join(RAIZ, p), 'utf8');

// ── o que não pode passar ────────────────────────────────────────────────────

test('🔴 o código de 6 dígitos NÃO sobrevive no assunto', () => {
  // o assunto real do sendEmailCode
  const limpo = limparAssunto('483920 é seu código — Leilão NoZap');
  assert.ok(!/483920/.test(limpo), `o código vazou: "${limpo}"`);
  assert.match(limpo, /é seu código/, 'mas o assunto continua legível para conferência');
});

test('🔴 token de redefinição NÃO sobrevive no assunto', () => {
  const limpo = limparAssunto('Acesso: https://leilaonozap.net/ResetPassword?token=a1b2c3d4e5f6a7b8c9d0e1f2');
  assert.ok(!/a1b2c3d4e5f6a7b8c9d0e1f2/.test(limpo), `o token vazou: "${limpo}"`);
});

test('qualquer sequência longa de dígitos é tampada — CPF, telefone, valor', () => {
  for (const perigo of ['12345678901', '21984072064', '1234', '999999']) {
    const limpo = limparAssunto(`Assunto ${perigo} fim`);
    assert.ok(!limpo.includes(perigo), `"${perigo}" passou: "${limpo}"`);
  }
});

test('assunto sem segredo passa inteiro', () => {
  assert.equal(limparAssunto('Sua senha de acesso'), 'Sua senha de acesso');
  assert.equal(limparAssunto('Campanha — leilão fechando'), 'Campanha — leilão fechando');
  // número curto é informação, não segredo
  assert.equal(limparAssunto('Leilão 24h'), 'Leilão 24h');
});

test('entrada podre não derruba nem vira "undefined"', () => {
  assert.equal(limparAssunto(null), '');
  assert.equal(limparAssunto(undefined), '');
  assert.ok(limparAssunto('x'.repeat(500)).length <= 200, 'assunto tem teto');
});

test('🔴 o sendEmailCode NÃO manda o assunto de verdade para o registro', () => {
  // Segunda rede: mesmo com o limpador, a função manda um rótulo fixo.
  const fn = semComentarios(ler('api/functions/sendEmailCode.js'));
  assert.match(fn, /registrarEmail\(\{[^}]*assunto: `Código de \$\{purpose\}`/s,
    'o registro precisa usar rótulo fixo, não o assunto com o código');
  assert.ok(!/registrarEmail\([^)]*subject/s.test(fn), 'o assunto real não pode ir ao registro');
});

// ── o que precisa acontecer ──────────────────────────────────────────────────

test('as três rotas de e-mail registram o que mandam', () => {
  for (const arq of ['api/functions/sendEmailCode.js',
                     'api/functions/sendWelcomeArrematante.js',
                     'api/functions/adminSetPassword.js']) {
    const fn = semComentarios(ler(arq));
    assert.match(fn, /registrarEmail/, `${arq} manda e-mail e não registra`);
  }
});

test('registra tanto o que saiu quanto o que foi RECUSADO', () => {
  // Registro que só guarda sucesso não serve para investigar reclamação.
  for (const arq of ['api/functions/sendEmailCode.js', 'api/functions/sendWelcomeArrematante.js']) {
    const fn = semComentarios(ler(arq));
    assert.match(fn, /ok: false/, `${arq}: falha não é registrada`);
    assert.match(fn, /ok: true/, `${arq}: sucesso não é registrado`);
  }
});

test('a campanha também cai no registro do banco, não só no arquivo local', () => {
  const script = semComentarios(ler('scripts/campanha/disparar.mjs'));
  assert.match(script, /registrarEmail/, 'a campanha é o maior volume e precisa registrar');
  assert.match(script, /tipo: 'campanha'/);
  // e o await tem que existir: processo de linha de comando morre rápido demais
  assert.match(script, /await anotar\('email'/, 'sem await, o processo encerra antes de gravar');
});

test('tipo desconhecido não suja a tabela', () => {
  assert.ok(TIPOS.includes('outro'));
  assert.ok(TIPOS.includes('codigo_acesso'));
});

test('o id da Brevo é lido sem quebrar com corpo estranho', () => {
  assert.equal(idDaBrevo({ messageId: '<abc@brevo>' }), '<abc@brevo>');
  assert.equal(idDaBrevo({ messageIds: ['<x@brevo>'] }), '<x@brevo>');
  assert.equal(idDaBrevo(null), null);
  assert.equal(idDaBrevo({}), null);
});

// ── a tabela ─────────────────────────────────────────────────────────────────

test('🔐 a tabela NÃO é legível pela chave pública', () => {
  // A convenção daqui é `USING (true)`, que libera leitura para o anônimo.
  // Aqui seria entregar a lista de e-mail de todo cliente a quem abrir o site.
  const sql = ler('supabase/migrations/20260920041812_registro_de_emails.sql');
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON public\.emails_enviados FROM anon, authenticated/);
  assert.ok(!/CREATE POLICY/.test(sql), 'qualquer política aqui abre a lista de e-mails');
});

test('a tabela não tem coluna para o corpo da mensagem', () => {
  const sql = semComentarios(ler('supabase/migrations/20260920041812_registro_de_emails.sql'));
  for (const proibida of ['corpo', 'html', 'body', 'senha', 'token', 'codigo']) {
    assert.ok(!new RegExp(`^\\s+${proibida}\\s`, 'mi').test(sql), `coluna "${proibida}" não pode existir`);
  }
  assert.match(sql, /status\s+text NOT NULL CHECK \(status IN \('enviado', 'recusado'\)\)/);
});
