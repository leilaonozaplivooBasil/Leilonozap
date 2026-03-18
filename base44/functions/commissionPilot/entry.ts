
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DIRECTOR_PLUS = new Set(['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador']);

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

async function findUserById(base44, id) {
    if (!id || typeof id !== 'string' || id.length < 20) return null;
    const rows = await base44.asServiceRole.entities.AppUser.filter({ id });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function findUserByReferralCode(base44, ref) {
    const rows = await base44.asServiceRole.entities.AppUser.filter({ referral_code: ref });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function getOrCreateSiteOfficial(base44) {
    const byEmail = await base44.asServiceRole.entities.AppUser.filter({ email: 'site@leilaonozap.com' });
    if (Array.isArray(byEmail) && byEmail.length) return byEmail[0];
    const possible = await base44.asServiceRole.entities.AppUser.filter({ full_name: 'Leilão NoZap - Site Oficial' });
    if (Array.isArray(possible) && possible.length) return possible[0];
    return null; // Should exist in prod
}

function hasRole(user, roleId) {
    if (!user) return false;
    const levels = Array.isArray(user.career_levels) ? user.career_levels : (user.career_levels ? [user.career_levels] : []);
    return levels.includes(roleId);
}

async function buildAncestorChain(base44, anchorUser) {
    const chain = [];
    const seen = new Set();
    let current = anchorUser;
    while (current && !seen.has(current.id)) {
        chain.push(current);
        seen.add(current.id);
        if (!current.referred_by_id) break;
        current = await findUserById(base44, current.referred_by_id);
    }
    return chain;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json().catch(() => ({}));
        const { sale_id, simulate_amount, simulate_licensee_id } = payload;

        if (!sale_id && !simulate_amount) {
            return Response.json({ error: 'Provide sale_id OR simulate_amount+simulate_licensee_id' }, { status: 400 });
        }

        let sale = null;
        let anchorUser = null;
        let isLicenseeSale = false;
        let totalAmount = 0;

        // Cenário 1: Venda Real
        if (sale_id) {
            const saleRows = await base44.asServiceRole.entities.CatalogSale.filter({ id: sale_id });
            sale = Array.isArray(saleRows) && saleRows.length ? saleRows[0] : null;
            if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

            totalAmount = Number((sale.total_amount ?? sale.sale_price ?? sale.amount ?? 0));

            // Resolve Âncora da Venda Real
            if (sale.licensee_id) {
                anchorUser = await findUserById(base44, sale.licensee_id);
                if (anchorUser) isLicenseeSale = true;
                else {
                    anchorUser = await findUserByReferralCode(base44, sale.licensee_id);
                    if (anchorUser) isLicenseeSale = true;
                }
            }
            if (!anchorUser && (sale.referral_code || sale.referred_by_code)) {
                anchorUser = await findUserByReferralCode(base44, sale.referral_code || sale.referred_by_code);
                if (anchorUser) isLicenseeSale = true;
            }
        }
        // Cenário 2: Simulação Pura
        else {
            totalAmount = Number(simulate_amount);
            if (simulate_licensee_id) {
                anchorUser = await findUserById(base44, simulate_licensee_id);
                if (!anchorUser) anchorUser = await findUserByReferralCode(base44, simulate_licensee_id);
                isLicenseeSale = !!anchorUser;
            }
        }

        if (!anchorUser) {
            anchorUser = await getOrCreateSiteOfficial(base44);
        }

        // --- LÓGICA DE CÁLCULO (IGUAL AO PROCESSADOR REAL) ---
        const chain = isLicenseeSale ? await buildAncestorChain(base44, anchorUser) : [anchorUser];
        const allUsers = await base44.asServiceRole.entities.AppUser.list();

        const trace = []; // Log detalhado de decisões
        trace.push(`🚀 Iniciando cálculo para venda de R$ ${totalAmount}`);
        trace.push(`👤 Âncora: ${anchorUser.full_name} (${anchorUser.email})`);
        trace.push(`🔗 Cadeia de Ancestrais: ${chain.map(u => `${u.full_name} (${u.career_levels?.join(',')})`).join(' -> ')}`);

        // Filtra Site Oficial para não contar como usuário normal em directors
        const allUsersFiltered = allUsers.filter(u => u.full_name !== 'Leilão NoZap - Site Oficial');

        const assignments = [];
        let companyPercent = 0;

        const anchorMaxRole = (() => {
            const roleHierarchy = ['licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 'distribuidor'];
            for (let i = roleHierarchy.length - 1; i >= 0; i--) {
                if (hasRole(anchorUser, roleHierarchy[i])) return roleHierarchy[i];
            }
            return null;
        })();

        trace.push(`🏆 Maior cargo do Âncora na hierarquia base: ${anchorMaxRole || 'Nenhum'}`);

        for (let i = 0; i < ROLE_ORDER.length; i++) {
            const step = ROLE_ORDER[i];
            trace.push(`\n--- Processando Nível: ${step.id} (${step.percent}%) ---`);

            if (DIRECTOR_PLUS.has(step.id)) {
                const eligible = allUsersFiltered.filter(u => hasRole(u, step.id));
                if (eligible.length > 0) {
                    const share = step.percent / eligible.length;
                    trace.push(`   👥 Rateio Diretor: ${eligible.length} usuários elegíveis. Cada um recebe ${share.toFixed(4)}%`);
                    for (const u of eligible) {
                        assignments.push({ role: step.id, user_id: u.id, user_name: u.full_name, percent: share, type: 'director_pool' });
                    }
                } else {
                    trace.push(`   🏢 Sem elegíveis para ${step.id}. Valor vai para a empresa.`);
                    companyPercent += step.percent;
                }
                continue;
            }

            const roleHierarchy = ['licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 'distribuidor'];
            const stepIndex = roleHierarchy.indexOf(step.id);
            const anchorMaxIndex = anchorMaxRole ? roleHierarchy.indexOf(anchorMaxRole) : -1;

            if (stepIndex >= 0 && stepIndex <= anchorMaxIndex) {
                trace.push(`   ⚓ Captura pelo Âncora: Cargo do âncora (${anchorMaxRole}) cobre este nível.`);
                assignments.push({ role: step.id, user_id: anchorUser.id, user_name: anchorUser.full_name, percent: step.percent, type: 'anchor_capture' });
            } else if (stepIndex > anchorMaxIndex) {
                trace.push(`   ⬆️ Busca Upline: Cargo do âncora inferior ao nível. Buscando ascendente...`);
                let assignedUser = null;
                for (const u of chain) {
                    if (u.id !== anchorUser.id && hasRole(u, step.id)) {
                        assignedUser = u;
                        trace.push(`      ✅ Encontrado: ${u.full_name} tem o cargo ${step.id}`);
                        break;
                    }
                }
                if (assignedUser) {
                    assignments.push({ role: step.id, user_id: assignedUser.id, user_name: assignedUser.full_name, percent: step.percent, type: 'upline_capture' });
                } else {
                    trace.push(`      ❌ Nenhum ascendente qualificado encontrado. Vai para empresa.`);
                    companyPercent += step.percent;
                }
            } else {
                trace.push(`   🏢 Âncora não qualificado e nível fora da hierarquia padrão. Vai para empresa.`);
                companyPercent += step.percent;
            }
        }

        if (companyPercent > 0.000001) {
            const site = await getOrCreateSiteOfficial(base44);
            if (site) {
                assignments.push({ role: 'company_rollup', user_id: site.id, user_name: site.full_name, percent: companyPercent, type: 'company_rollup' });
            }
            trace.push(`\n🏢 Total acumulado para a Empresa: ${companyPercent.toFixed(2)}%`);
        }

        // Consolida
        const expected = assignments.map(a => ({
            ...a,
            amount: +(totalAmount * (a.percent / 100)).toFixed(2)
        }));

        // Se for venda real, busca o que realmente aconteceu
        let actual = null;
        let comparison = null;
        if (sale_id) {
            const actualRecords = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id });
            actual = actualRecords.map(r => ({
                user_id: r.user_id,
                user_name: r.user_name,
                role: r.role,
                percent: r.percent,
                amount: r.amount
            }));

            // Comparação Simples (agrupada por usuário)
            // TODO: Implementar diff detalhado se necessário
        }

        return Response.json({
            success: true,
            simulation: {
                sale_id,
                total_amount: totalAmount,
                anchor_user: anchorUser ? { id: anchorUser.id, name: anchorUser.full_name, max_role: anchorMaxRole } : null,
                chain_length: chain.length,
                assignments: expected,
                total_distributed: expected.reduce((s, x) => s + x.amount, 0),
                trace: trace // Retorna o log detalhado
            },
            actual_records: actual
        });

    } catch (err) {
        return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
    }
});
