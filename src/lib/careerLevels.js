/**
 * careerLevels.js — FONTE ÚNICA dos níveis de carreira no front.
 *
 * Espelha a tabela `career_levels` do Supabase (id, nome, ordem, bloco,
 * adesao_valor em centavos, venda_direta_pct). Mantém aqui a lista para uso
 * síncrono na UI; a tabela do banco continua sendo a autoridade do backend.
 *
 * ⚠️ Antes existiam listas-fantasia divergentes (licenciado_catalogo, kit_start,
 *    plano_lider, trainee, etc.) espalhadas por NetworkOverview e TreeHierarchy —
 *    ids que NÃO existem no banco. Este módulo substitui todas elas.
 *
 * As classes de cor são strings LITERAIS de propósito (Tailwind faz purge de
 * classes construídas dinamicamente — não trocar por template string).
 */

const mk = (id, name, bloco, ordem, adesao_valor, venda_direta_pct, color, textColor, borderColor) => ({
  id, name, bloco, ordem, adesao_valor, venda_direta_pct, color, textColor, borderColor,
});

// Ordenado por `ordem` (bloco rede 1-8, depois bloco diretor 101-110).
export const CAREER_LEVELS = [
  // ── Bloco REDE (carreira linear) ───────────────────────────────
  mk('usuario',            'Usuário',            'rede', 1,       0,   0, 'bg-slate-500',   'text-slate-400',   'border-slate-500'),
  mk('influenciador',      'Influenciador',      'rede', 2,       0,   5, 'bg-green-500',   'text-green-400',   'border-green-500'),
  mk('vendedor',           'Vendedor',           'rede', 3,       0,  10, 'bg-emerald-500', 'text-emerald-400', 'border-emerald-500'),
  mk('licenciado',         'Licenciado',         'rede', 4,    5000,  13, 'bg-teal-500',    'text-teal-400',    'border-teal-500'),
  mk('parceiro',           'Parceiro',           'rede', 5,   20000,  15, 'bg-cyan-500',    'text-cyan-400',    'border-cyan-500'),
  mk('ponto_retirada',     'Ponto de Retirada',  'rede', 6,   50000,  16, 'bg-sky-500',     'text-sky-400',     'border-sky-500'),
  mk('loja_fisica',        'Loja Física',        'rede', 7,  350000,  19, 'bg-blue-500',    'text-blue-400',    'border-blue-500'),
  mk('distribuidor',       'Distribuidor',       'rede', 8, 4000000,  20, 'bg-indigo-500',  'text-indigo-400',  'border-indigo-500'),
  // ── Bloco DIRETOR (liderança) ──────────────────────────────────
  mk('trainee_diretor',    'Trainee',            'diretor', 101, 30000, 10, 'bg-violet-500',  'text-violet-400',  'border-violet-500'),
  mk('executivo_conta',    'Executivo de Conta', 'diretor', 102,     0, 20, 'bg-purple-500',  'text-purple-400',  'border-purple-500'),
  mk('diretor_operacional','Diretor Operacional','diretor', 103,     0,  0, 'bg-fuchsia-500', 'text-fuchsia-400', 'border-fuchsia-500'),
  mk('diretoria_executiva','Diretoria Executiva','diretor', 104,     0,  0, 'bg-pink-500',    'text-pink-400',    'border-pink-500'),
  mk('ceo',                'CEO',                'diretor', 105,     0, 20, 'bg-rose-500',    'text-rose-400',    'border-rose-500'),
  mk('socio',              'Sócio',              'diretor', 108,     0, 20, 'bg-amber-500',   'text-amber-400',   'border-amber-500'),
  mk('fundador',           'Fundador',           'diretor', 110,     0, 20, 'bg-yellow-500',  'text-yellow-400',  'border-yellow-500'),
];

const DEFAULT_LEVEL = CAREER_LEVELS[0];

const BY_ID = CAREER_LEVELS.reduce((m, l) => { m[l.id] = l; return m; }, {});

/** Config completa de um nível (com fallback pra Usuário). */
export const getLevel = (id) => BY_ID[id] || DEFAULT_LEVEL;

/** Só a classe de fundo (usada pelo TreeHierarchy). */
export const levelColor = (id) => (BY_ID[id] || DEFAULT_LEVEL).color;

/** Nome amigável. */
export const levelName = (id) => (BY_ID[id] || DEFAULT_LEVEL).name;
