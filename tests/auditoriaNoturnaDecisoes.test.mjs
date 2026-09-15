// 🌙 AUDITORIA (16/09/2026) — lote 5: decisões resolvidas com evidência.
// Dono: "resolve tudo que precisa resolver de maneira diligente".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentarios = (s) => s.replace(/^\s*\/\/.*$/gm, '');

test('D1: contato oficial numa fonte só — nenhum "no-reply@" oferecido como canal de dúvidas', () => {
  const lib = ler('../src/lib/contatoOficial.js');
  assert.match(lib, /export const EMAIL_CONTATO = 'contato@leilaonozap\.net';/);
  assert.match(lib, /export const ENDERECO_SEDE = 'Av\. das Américas, 19\.005, Torre 1, Sala 1106/);
  for (const f of ['../src/pages/TermsOfUse.jsx', '../src/components/common/LegalTermsModal.jsx', '../src/pages/PrivacyPolicy.jsx', '../src/components/common/PrivacyPolicyModal.jsx', '../src/pages/OrderTracking.jsx', '../src/components/common/Footer.jsx']) {
    const s = semComentarios(ler(f));
    assert.ok(!/no-reply@leilaonozap|relacionamento@leilaonozap|Av\. das Américas, 3500/.test(s), `${f} ainda tem contato antigo`);
    assert.match(s, /from '@\/lib\/contatoOficial'/, `${f} precisa importar da lib`);
  }
});

test('D2: teto de desconto único (80% — máximo real do catálogo é 80,6%)', () => {
  for (const f of ['../index.html', '../vite.config.js', '../src/Layout.jsx', '../src/pages/portal/PortalArrematante.jsx', '../src/components/recepcao/HeroRecepcao.jsx', '../src/pages/CatalogProductDetails.jsx', '../src/components/licensees/LicenseeShareModal.jsx']) {
    const s = ler(f);
    assert.ok(!/at[ée] (60|70|90)% de desconto/i.test(s) && !/Descontos de até 90%|Até 90% de desconto/.test(s), `${f} ainda anuncia outro teto`);
  }
});

test('D3: banner com "Frete Grátis" na arte saiu da rotação e o rail não promete frete grátis', () => {
  const s = ler('../src/components/loja/LojaShopeeHeader.jsx');
  assert.ok(!/banner3Desk|banner3Mob/.test(s));
  assert.ok(!/label: 'Frete Grátis'/.test(s));
  assert.match(s, /label: 'Frete', onClick: \(\) => toast\('🚚 O frete é calculado no carrinho pelo seu CEP\.'\)/);
});

test('D4: devolução com escopo — leilão sem devolução, Loja Virtual com 7 dias (CDC art. 49)', () => {
  const t = ler('../src/pages/TermsOfUse.jsx');
  assert.match(t, /5\. Devolução e arrependimento/);
  assert.match(t, /Nas compras da Loja Virtual<\/strong> vale o direito de arrependimento do art\. 49/);
  assert.match(ler('../src/components/common/WelcomeModal.jsx'), /Sem Devolução nos leilões/);
  assert.match(ler('../src/components/common/TermsModal.jsx'), /Sem Devolução nos leilões/);
  assert.match(ler('../src/pages/ComoFunciona.jsx'), /garantia legal \(não a de fábrica/);
});

test('D5: "Comprar agora" usa o mesmo checkout do carrinho (frete real, PIX ou cartão)', () => {
  for (const f of ['../src/components/catalog/ProductDetailsModal.jsx', '../src/pages/CatalogProductDetails.jsx']) {
    const s = ler(f);
    assert.match(s, /const irParaCheckout = \(\) => \{\s*\n\s*adicionarAoCarrinho\(\);\s*\n\s*navigate\(createPageUrl\("Cart"\)\);/, f);
    assert.ok(!/createPageUrl\("CatalogCheckout2"\)/.test(s), `${f} ainda manda pro checkout antigo`);
  }
});

test('D6: wa.me com DDI normalizado num helper só', () => {
  const lib = ler('../src/lib/whatsappOficial.js');
  assert.match(lib, /export function linkWhatsAppNumero\(numero, texto = ''\)/);
  for (const f of ['../src/pages/PedidosDistribuidor.jsx', '../src/components/loja/LojaCheckout.jsx', '../src/components/concurso/AdminInsights.jsx', '../src/pages/PainelDistribuidor.jsx', '../src/lib/contatoParceiro.js', '../src/pages/CRM.jsx']) {
    const s = ler(f);
    assert.ok(!/wa\.me\/55\$\{/.test(s) && !/wa\.me\/\$\{seller\.phone\}/.test(s), `${f} ainda monta wa.me na mão`);
    assert.match(s, /linkWhatsAppNumero\(/, f);
  }
});

test('D7: servidor — webhook não reprocessa venda cancelada já estornada', () => {
  const s = ler('../api/functions/mpWebhook.js');
  assert.match(s, /status=in\.\(cancelado,estornado\)&limit=1/);
  assert.match(s, /cancelada_com_estorno: true/);
});

test('D8: servidor — cargo da adesão sai da venda PAGA e o saldo é consumido com CAS antes das vendas', () => {
  const s = ler('../api/functions/finalizeSellerOrder.js');
  assert.ok(!/const cargo = role === 'licenciado'/.test(s));
  assert.match(s, /kind=eq\.seller_adhesion&status=in\.\(paid,pago,entregue\)/);
  assert.match(s, /seller_credit_balance=eq\.\$\{balance\}`, \{\s*\n\s*method: 'PATCH'/);
  const iCAS = s.indexOf('seller_credit_balance=eq.${balance}');
  const iVenda = s.indexOf("await sb('catalog_sales'");
  assert.ok(iCAS > 0 && iVenda > iCAS, 'o CAS precisa vir ANTES de criar as vendas');
});

test('D9: servidor — cargo de governança nunca nasce por cadastro; depósito/reposição nunca têm o comprador como vendedor', () => {
  assert.match(ler('../api/functions/createLicensee.js'), /if \(NIVEIS_GOVERNANCA\.includes\(level\)\) return/);
  for (const f of ['../api/functions/createOperationDeposit.js', '../api/functions/createSupplyOrder.js']) {
    const s = ler(f);
    assert.ok(!/seller_id: u\.id \}\)|seller_id: loja\.id \}\)/.test(s), `${f} ainda usa o comprador como vendedor`);
    assert.match(s, /referral_code=eq\.leilaonozap/, f);
  }
});

test('D10: limite de tentativas em código por e-mail e login; cadastro não revela qual dado bateu', () => {
  assert.match(ler('../api/_lib/rateLimit.js'), /export async function estourouLimite\(chave, max, janelaSeg\)/);
  assert.match(ler('../api/functions/sendEmailCode.js'), /estourouLimite\(`codigo:\$\{email\}`, 5, 900\)/);
  assert.match(ler('../api/functions/login.js'), /estourouLimite\(`login:\$\{email\}`, 12, 900\)/);
  const r = ler('../api/functions/publicRegister.js');
  assert.ok(!/why = 'CPF já cadastrado\.'/.test(r));
  assert.match(r, /Já existe um cadastro com esses dados/);
});
