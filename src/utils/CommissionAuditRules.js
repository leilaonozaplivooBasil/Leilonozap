/**
 * CommissionAuditRules.js
 * 
 * Regras de Ouro para Auditoria de Comissões.
 * Executa no cliente (navegador) consumindo dados exportados da API Segura.
 */

import { fmtBR } from '@/lib/money';

const ROLE_ORDER = [
    { id: 'licenciado_catalogo', percent: 13.0 },
    { id: 'trainee', percent: 0.5 },
    { id: 'executivo', percent: 0.5 },
    { id: 'kit_start', percent: 1.0 },
    { id: 'plano_lider', percent: 1.0 },
    { id: 'plano_lojista', percent: 3.0 },
    { id: 'distribuidor', percent: 1.0 },
    { id: 'diretor', percent: 0.5 },
    { id: 'diretoria', percent: 0.5 },
    { id: 'ceo', percent: 3.0 },
    { id: 'conselheiro', percent: 1.0 },
    { id: 'fundador', percent: 1.0 }
];

const DIRECTOR_PLUS = new Set(['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador']);

const hasRole = (user, role) => {
    if (!user || !user.career_levels) return false;
    return user.career_levels.includes(role);
};

// Busca usuário no array em memória
const findUser = (users, id) => users.find(u => u.id === id || u.referral_code === id);

// Constrói cadeia de ancestrais usando o array de usuários baixado
const buildAncestorChain = (users, anchorUser) => {
    const chain = [];
    const seen = new Set();
    let current = anchorUser;

    // Safety break para evitar loop infinito
    let depth = 0;

    while (current && !seen.has(current.id) && depth < 50) {
        chain.push(current);
        seen.add(current.id);

        if (!current.referred_by_id) break;

        const parent = findUser(users, current.referred_by_id);
        if (parent) {
            current = parent;
        } else {
            break; // Upline não encontrado no dump
        }
        depth++;
    }
    return chain;
};

export const calculateExpectedCommission = (sale, allUsers) => {
    const trace = [];
    const assignments = [];
    let companyPercent = 0;

    // 1. Identifica o Vendedor (Licenciado)
    // No dump 'sales', temos licensee_id. Se for venda da loja (sem licensee), não tem âncora?
    // Regra: Se tem licensee_id, ele é o âncora.

    let anchorUser = null;
    if (sale.licensee_id) {
        anchorUser = findUser(allUsers, sale.licensee_id);
    }

    if (!anchorUser) {
        trace.push(`⚠️ Venda sem licenciado vinculado (Orgânica? ou erro de dados?). Tudo para empresa.`);
        // Se não tem âncora, tudo vai para empresa (simplificação da regra para auditoria)
        // Na prática, vendas orgânicas não geram comissão Multinível, só lucro loja.
        return {
            total_distributed: 0,
            assignments: [],
            trace,
            company_rollup: 26.0
        };
    }

    const totalAmount = parseFloat(sale.total_amount || 0);
    trace.push(`🚀 Auditando Venda ${sale.id.slice(0, 8)}... Valor: R$ ${fmtBR(totalAmount)}`);
    trace.push(`👤 Âncora: ${anchorUser.full_name} (${anchorUser.email})`);

    // 2. Constrói cadeia
    const chain = buildAncestorChain(allUsers, anchorUser);
    trace.push(`🔗 Cadeia: ${chain.map(u => u.full_name).join(' > ')}`);

    // 3. Filtra Site Oficial do Pool de Diretores
    const allUsersFiltered = allUsers.filter(u => u.full_name !== 'Leilão NoZap - Site Oficial');

    // 4. Determina Cargo Máximo do Âncora
    const roleHierarchy = ['licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 'distribuidor'];
    let anchorMaxRole = null;
    for (let i = roleHierarchy.length - 1; i >= 0; i--) {
        if (hasRole(anchorUser, roleHierarchy[i])) {
            anchorMaxRole = roleHierarchy[i];
            break;
        }
    }

    // 5. Loop de Distribuição
    for (const step of ROLE_ORDER) {
        // trace.push(`Checking ${step.id}...`);

        // Caso: Diretor+ (Pool)
        if (DIRECTOR_PLUS.has(step.id)) {
            const eligible = allUsersFiltered.filter(u => hasRole(u, step.id));
            if (eligible.length > 0) {
                const share = step.percent / eligible.length;
                eligible.forEach(u => {
                    assignments.push({
                        role: step.id,
                        user_id: u.id,
                        user_name: u.full_name,
                        percent: share,
                        amount: (totalAmount * share) / 100,
                        type: 'director_pool'
                    });
                });
            } else {
                companyPercent += step.percent;
            }
            continue;
        }

        // Caso: Multinível (Hierarquia)
        const stepIndex = roleHierarchy.indexOf(step.id);
        const anchorMaxIndex = anchorMaxRole ? roleHierarchy.indexOf(anchorMaxRole) : -1;

        if (stepIndex >= 0 && stepIndex <= anchorMaxIndex) {
            // Âncora captura
            assignments.push({
                role: step.id,
                user_id: anchorUser.id,
                user_name: anchorUser.full_name,
                percent: step.percent,
                amount: (totalAmount * step.percent) / 100,
                type: 'anchor_capture'
            });
        } else if (stepIndex > anchorMaxIndex) {
            // Busca Upline
            let assignedUser = null;
            for (const u of chain) {
                if (u.id !== anchorUser.id && hasRole(u, step.id)) {
                    assignedUser = u;
                    break;
                }
            }

            if (assignedUser) {
                assignments.push({
                    role: step.id,
                    user_id: assignedUser.id,
                    user_name: assignedUser.full_name,
                    percent: step.percent,
                    amount: (totalAmount * step.percent) / 100,
                    type: 'upline_capture'
                });
            } else {
                companyPercent += step.percent;
            }
        } else {
            // Nível fora da hierarquia (ex: erro de config ou caso especial)
            companyPercent += step.percent;
        }
    }

    return {
        total_distributed: assignments.reduce((acc, curr) => acc + curr.amount, 0),
        assignments,
        company_rollup: companyPercent,
        trace
    };
};