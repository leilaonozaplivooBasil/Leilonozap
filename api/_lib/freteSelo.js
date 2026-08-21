// freteSelo — O SELO DO FRETE (21/08/2026).
//
// ══════════════════════════════════════════════════════════════════════════════
// O PROBLEMA QUE ISTO RESOLVE
// ══════════════════════════════════════════════════════════════════════════════
// Até aqui, quanto de frete era financeiramente reservado num lance vinha do
// NAVEGADOR:
//     submitAtomicBid.js:168   const freteValor = ... parseFloat(body?.frete_valor)
// Qualquer chamada direta manda `frete_valor: 0` e arremata sem pagar frete. O
// bloqueio que entrou em AuctionRoom.jsx (commit 3b21010e) é UX — ajuda o cliente
// honesto e não segura ninguém que fale direto com a API.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE UM SELO, E NÃO RECOTAR DENTRO DO LANCE
// ══════════════════════════════════════════════════════════════════════════════
// O caminho óbvio seria o lance recotar o frete no servidor. Não dá:
//   • submitAtomicBid.js e reserveBidBalance.js são AUTOCONTIDOS por lei — um
//     import de 2 níveis já derrubou o lance em produção (ver o cabeçalho de
//     submitAtomicBid.js). Só `import crypto` é permitido lá dentro.
//   • cotar chama a API da Melhor Envio pela rede. Pôr isso no caminho do lance
//     é somar latência e um ponto de falha externo em cima de um leilão ao vivo,
//     com gente clicando no mesmo segundo.
//
// Então o servidor cota UMA vez (rota cotarFrete) e ASSINA o resultado. O
// navegador guarda o selo e devolve no lance. O lance só precisa CONFERIR a
// assinatura — `crypto.createHmac`, sem rede, sem import.
//
// É o mesmo desenho do crachá de sessão (api/_lib/sessao.js), pelo mesmo motivo:
// o dado se prova sozinho e não precisa de tabela nem de consulta.
//
// O QUE O SELO GARANTE
//   • o valor do frete foi calculado PELO SERVIDOR, não digitado pelo cliente;
//   • é daquele leilão, daquele usuário E daquele PRODUTO — selo de um não
//     serve no outro;
//   • venceu depois de 30 minutos, então cotação velha não vira desconto eterno.
//
// 🔴 BLOQUEADOR 3 (auditoria OpenAI, 21/08/2026) — POR QUE O `pid` ENTROU.
// Sem o product_id dentro do selo, a assinatura provava "o servidor calculou
// isto", mas não provava CALCULOU PARA O QUÊ. Um leilão de geladeira e um de
// caneta são leilões diferentes, então o campo `a` já separava os dois — mas se
// o leilão trocasse de produto, ou se a rota de cotação aceitasse o item vindo do
// corpo (era o caso, e é a outra metade deste bloqueador), o selo de um pacote
// leve valia para um pesado. Agora quem confere pode exigir o produto.
//
// O QUE ELE NÃO GARANTE: se o preço da transportadora mudar dentro dos 30
// minutos, vale o preço do selo. É a mesma tolerância de qualquer carrinho que
// congela o frete no checkout.
import crypto from 'crypto';

/** Validade do selo. Curta de propósito: cotação velha não pode virar desconto. */
export const SELO_VALIDADE_MS = 30 * 60 * 1000;

function chave() {
  return process.env.SESSAO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// prefixo próprio: mesmo compartilhando a chave com o crachá, um selo de frete
// nunca pode ser aceito como sessão nem vice-versa.
function assinar(texto) {
  return b64url(crypto.createHmac('sha256', chave()).update(`frete-v1|${texto}`).digest());
}

/**
 * Emite o selo de uma opção de frete já cotada pelo servidor.
 * @param {{auctionId:string, userId:string, freteId:string, valor:number, cep:string, empresa?:string, servico?:string, prazo?:number, productId?:string}} dados
 * @returns {string|null}
 */
export function emitirSelo({ auctionId, userId, freteId, valor, cep, empresa, servico, prazo, productId = null }) {
  if (!chave() || !auctionId || !userId) return null;
  const corpo = b64url(JSON.stringify({
    a: String(auctionId), u: String(userId), f: String(freteId || ''),
    v: Math.round((Number(valor) || 0) * 100),          // centavos: zero erro de float
    c: String(cep || ''), e: empresa || null, s: servico || null, p: prazo ?? null,
    pid: productId ? String(productId) : null,
    x: Date.now() + SELO_VALIDADE_MS,
  }));
  return `f1.${corpo}.${assinar(corpo)}`;
}

/**
 * Confere o selo. Devolve o frete que o SERVIDOR calculou, nunca o que o cliente disse.
 * @returns {{ok:boolean, motivo:string, frete:object|null}}
 */
export function conferirSelo(selo, { auctionId, userId, productId = null, cep = null } = {}) {
  try {
    if (!chave()) return { ok: false, motivo: 'sem_chave_no_servidor', frete: null };
    const txt = String(selo || '').trim();
    if (!txt) return { ok: false, motivo: 'sem_selo', frete: null };

    const p = txt.split('.');
    if (p.length !== 3 || p[0] !== 'f1') return { ok: false, motivo: 'formato', frete: null };

    const esperado = Buffer.from(assinar(p[1]), 'utf8');
    const veio = Buffer.from(p[2], 'utf8');
    if (esperado.length !== veio.length || !crypto.timingSafeEqual(esperado, veio)) {
      return { ok: false, motivo: 'assinatura', frete: null };
    }

    const d = JSON.parse(deB64url(p[1]).toString('utf8'));
    if (!(Number(d.x) > Date.now())) return { ok: false, motivo: 'vencido', frete: null };
    if (auctionId && String(d.a) !== String(auctionId)) return { ok: false, motivo: 'selo_de_outro_leilao', frete: null };
    if (userId && String(d.u) !== String(userId)) return { ok: false, motivo: 'selo_de_outra_pessoa', frete: null };

    // 🔴 BLOQUEADOR 3 — produto. Quem passa `productId` está dizendo "só aceito
    // selo cotado PARA ESTE produto". Selo antigo, emitido antes do campo
    // existir, não passa: `pid` vazio com produto exigido é recusa, não é
    // tolerância. Selo dura 30 minutos, então não há nada legítimo para poupar.
    if (productId && String(d.pid || '') !== String(productId)) {
      return { ok: false, motivo: d.pid ? 'selo_de_outro_produto' : 'selo_sem_produto', frete: null };
    }
    // CEP: mesma ideia. Cotar para uma cidade barata e mandar para outra é o
    // ataque óbvio contra frete assinado.
    if (cep && String(d.c || '').replace(/\D/g, '') !== String(cep).replace(/\D/g, '')) {
      return { ok: false, motivo: 'selo_de_outro_cep', frete: null };
    }

    return {
      ok: true, motivo: 'ok',
      frete: {
        id: d.f || null, valor: (Number(d.v) || 0) / 100, cep: d.c || null,
        empresa: d.e || null, servico: d.s || null, prazo: d.p ?? null,
        productId: d.pid || null,
      },
    };
  } catch (e) {
    return { ok: false, motivo: `erro:${e?.message}`, frete: null };
  }
}
