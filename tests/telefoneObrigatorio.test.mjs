// 📱 Telefone WhatsApp obrigatório no cadastro (27/09/2026) — dono: "se não é, deve ser".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { telefoneBR } from '../src/lib/telefoneBR.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('☎️ a régua: celular com DDD válido passa; vazio, curto ou sem o 9 não passa', () => {
  assert.equal(telefoneBR('(21) 99999-9999')?.nacional, '21999999999');
  assert.equal(telefoneBR('+55 11 98888-7777')?.nacional, '11988887777');
  assert.equal(telefoneBR(''), null);
  assert.equal(telefoneBR('2199'), null);
  assert.equal(telefoneBR('00 99999-9999'), null, 'DDD inválido');
});

test('🔒 as três rotas de cadastro exigem telefone válido no servidor', () => {
  for (const f of ['publicRegister', 'registerNetworkUser', 'registerSeller']) {
    const S = ler(`../api/functions/${f}.js`);
    assert.match(S, /import \{ telefoneBR \} from '\.\.\/\.\.\/src\/lib\/telefoneBR\.js';/, f);
    assert.match(S, /const tel = telefoneBR\(body\?\.phone\);\n\s*const phone = tel \? tel\.nacional : '';/, f);
    assert.match(S, /if \(!phone\) return res\.status\(400\)\.json\(\{ success: false, error: 'Telefone\/WhatsApp é obrigatório/, f);
    assert.doesNotMatch(S, /phone: phone \|\| null/, `${f}: ainda grava telefone nulo`);
  }
});

test('🖥️ as telas de cadastro exigem o telefone antes de enviar', () => {
  assert.match(ler('../src/components/common/GuestRegistrationModal.jsx'), /!phone/);
  assert.match(ler('../src/components/licensing/LicenseeRegistrationModal.jsx'), /!phone/);
  assert.match(ler('../src/pages/Register.jsx'), /!phone/);
  assert.match(ler('../src/pages/CadastroInvestidor.jsx'), /!phone/);
  assert.match(ler('../src/pages/StoreRegistration.jsx'), /!formData\.phone/);
  const C = ler('../src/pages/Cadastro.jsx');
  assert.match(C, /if \(!telefoneValido\(form\.phone\)\)/);
});
