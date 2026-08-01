/**
 * CommissionAuditRules.js
 *
 * Regras de Ouro para Auditoria de Comissões.
 * Executa no cliente (navegador) consumindo dados exportados da API Segura.
 *
 * ⚠️ ATUALIZADO EM 01/08/2026 — plano oficial de 30% (validado 22/07/2026).
 * Antes este arquivo auditava contra o plano ANTIGO de 26% e com ids-fantasia
 * (kit_start, plano_lider, plano_lojista, licenciado_catalogo…), o que fazia a
 * auditoria validar contra a regra errada e nunca detectar vazamento de cadeia.
 *
 * PLANO: 30% por venda = 20% CADEIA (telescópica) + 10% TOPO (governança/gestão).
 */

import { fmtBR } from '@/lib/money';

// ── CADEIA 20% — % de VENDA DIRETA por nível (o upline recebe o REBATE: a
//    diferença entre o % dele e o maior % já pago abaixo dele na cadeia).
const NIVEIS = [
    { id: 'influenciador', pct: 5.0 },
    { id: 'vendedor', pct: 10.0 },
    { id: 'licenciado', pct: 13.0 },
    { id: 'parceiro', pct: 15.0 },
    { id: 'ponto_retirada', pct: 16.0 },
    { id: 'loja_fisica', pct: 19.0 },
    { id: 'distribuidor', pct: 20.0 }
];
const CADEIA_TETO = 20.0;

// ── TOPO 10% — individual (percentual cheio pra cada detentor) e pool (dividido).
const TOPO = [
    { id: 'ceo', pct: 3.0, pool: false },
    { id: 'livoo_live', pct: 2.0, pool: false },
    { id: 'embaixador', pct: 1.0, pool: false },
    { id: 'conselheiro', pct: 1.0, pool: true },
    { id: 'fundador', pct: 1.0, pool: true },
    { id: 'diretoria_operacao', pct: 0.5, pool: true },
    { id: 'diretoria_executiva', pct: 0.5, pool: true }
];
// Executivo (1%): NÃO é pool — só sobre a própria estrutura (cadeia da venda).
const EXECUTIVO = { id: 'executivo_conta', pct: 1.0 };

// cargos antigos que significam o mesmo cargo do plano novo
const ALIAS = {
    licenciado: ['licenciado', 'licenciado_catalogo'],
    influenciador: ['influenciador', 'influencer', 'licenciado_aplicativo'],
    executivo_conta: ['executivo_conta', 'executivo'],
    diretoria_operacao: ['diretoria_operacao', 'diretor'],
    diretoria_executiva: ['diretoria_executiva', 'diretoria']
};

const hasRole = (user, role) => {
    const meus = Array.isArray(user?.career_levels) ? user.career_levels : [];
    return (ALIAS[role] || [role]).some((r) => meus.includes(r));
};

// Busca usuário no array em memória
const findUser = (users, id) => users.find(u => u.id === id || u.referral_code === id);

// Constrói cadeia de ancestrais usando o array de usuários baixado
const buildAncestorChain = (users, anchorUser) => {
    const chain = [];
    const seen = new Set();
    let current = anchorUser;
    let depth = 0;

    while (current && !seen.has(current.id) && depth < 50) {
        chain.push(current);
        seen.add(current.id);
        if (!current.referred_by_id) break;
        const parent = findUser(users, current.referred_by_id);
        if (!parent) break; // Upline não encontrado no dump
        current = parent;
        depth++;
    }
    return chain;
};

// nível de rede mais alto que a pessoa ocupa
const nivelDe = (user) => {
    let melhor = null;
    for (const n of NIVEIS) if (hasRole(user, n.id) && (!melhor || n.pct > melhor.pct)) melhor = n;
    return melhor;
};

export const calculateExpectedCommission = (sale, allUsers) => {
    const trace = [];
    const assignments = [];
    let companyPercent = 0;

    const totalAmount = parseFloat(sale.total_amount || 0);
    const anchorUser = sale.licensee_id ? findUser(allUsers, sale.licensee_id) : null;
    const push = (role, user, percent, type) => {
        assignments.push({
            role, user_id: user.id, user_name: user.full_name,
            percent, amount: (totalAmount * percent) / 100, type
        });
    };

    trace.push(`🚀 Auditando venda ${String(sale.id).slice(0, 8)}… Valor: R$ ${fmtBR(totalAmount)}`);

    // Site Oficial não entra nos pools de governança
    const elegiveis = allUsers.filter(u => u.full_name !== 'Leilão NoZap - Site Oficial');

    // ── TOPO 10% — pago SEMPRE, pelo cargo (inclusive em venda orgânica).
    for (const step of TOPO) {
        const donos = elegiveis.filter(u => hasRole(u, step.id));
        if (!donos.length) { companyPercent += step.pct; continue; }
        const share = step.pool ? step.pct / donos.length : step.pct;
        donos.forEach(u => push(step.id, u, share, step.pool ? 'topo_pool' : 'topo_individual'));
    }

    // ── CADEIA 20% — telescópica, a partir do âncora (quem vendeu).
    const chain = anchorUser ? buildAncestorChain(allUsers, anchorUser) : [];
    if (!chain.length) {
        trace.push('⚠️ Venda sem vendedor vinculado (orgânica) — cadeia 20% + executivo 1% ficam com a empresa.');
        companyPercent += CADEIA_TETO + EXECUTIVO.pct;
        return {
            total_distributed: assignments.reduce((a, c) => a + c.amount, 0),
            assignments, company_rollup: companyPercent, trace
        };
    }

    trace.push(`👤 Âncora: ${anchorUser.full_name}`);
    trace.push(`🔗 Cadeia: ${chain.map(u => u.full_name).join(' > ')}`);

    // Executivo (1%): o mais próximo do cliente na cadeia. Sem executivo → empresa.
    const exec = chain.find(u => hasRole(u, EXECUTIVO.id));
    if (exec) push(EXECUTIVO.id, exec, EXECUTIVO.pct, 'estrutura_executivo');
    else companyPercent += EXECUTIVO.pct;

    let pisoPago = 0;
    let pctCadeia = 0;
    for (const u of chain) {
        if (pctCadeia >= CADEIA_TETO - 0.0001) break;
        const nivel = nivelDe(u);
        if (!nivel) continue;
        const rebate = nivel.pct - pisoPago;
        if (rebate <= 0) continue;
        const fatia = Math.min(rebate, CADEIA_TETO - pctCadeia);
        push(nivel.id, u, fatia, pisoPago === 0 ? 'venda_direta' : 'rebate');
        trace.push(`  ${pisoPago === 0 ? 'venda direta' : 'rebate'} · ${u.full_name} (${nivel.id}) → ${fatia.toFixed(2)}%`);
        pisoPago = nivel.pct;
        pctCadeia += fatia;
    }
    if (pctCadeia < CADEIA_TETO) companyPercent += CADEIA_TETO - pctCadeia;
    trace.push(`🔭 Cadeia distribuída: ${pctCadeia.toFixed(2)}% de ${CADEIA_TETO}%`);

    return {
        total_distributed: assignments.reduce((acc, curr) => acc + curr.amount, 0),
        assignments,
        company_rollup: companyPercent,
        trace
    };
};