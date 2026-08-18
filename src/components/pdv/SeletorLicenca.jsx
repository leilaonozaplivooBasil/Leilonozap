import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { User as UserIcon, Trash2, Loader2, BadgePercent } from 'lucide-react';

// Seletor "Para qual escritório vai a comissão?" do balcão.
// Mostra o PRÓPRIO operador (compra de si mesmo), a árvore inteira abaixo dele e,
// ao digitar, qualquer pessoa cadastrada em outras estruturas — no balcão a linha
// não muda nada: o comprador leva a comissão da licença dele e o balcão o restante.
// O percentual mostrado aqui é só espelho — quem calcula de verdade é o servidor.
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Escada da rede, do menor para o maior — espelho da mesma lista do servidor
// (api/_lib/networkChain.js). Aqui serve só para MOSTRAR o degrau na tela; o
// percentual de cada cargo continua vindo do banco (career_levels).
const REDE = ['usuario', 'influenciador', 'vendedor', 'licenciado', 'parceiro', 'ponto_retirada', 'loja_fisica', 'distribuidor'];

export default function SeletorLicenca({ ownerId, comprador, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [levels, setLevels] = useState({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [u, l] = await Promise.all([
        supabase.from('app_users').select('id,full_name,email,career_levels,primary_career_level,recruited_by_id,referred_by_id').range(0, 4999),
        supabase.from('career_levels').select('id,nome,venda_direta_pct'),
      ]);
      if (!vivo) return;
      setUsers(Array.isArray(u.data) ? u.data : []);
      const map = {};
      (Array.isArray(l.data) ? l.data : []).forEach((x) => { map[x.id] = x; });
      setLevels(map);
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, []);

  // 🪜 REGRA DO DEGRAU (espelho da regra do servidor): o teto é o cargo DESTE balcão, e
  // quem compra tendo cargo igual ou maior é atendido como o degrau imediatamente abaixo
  // dele — assim a casa nunca fica com 0%. Aqui é só a vitrine; quem paga é o servidor.
  const { tetoPct, degrauPct } = useMemo(() => {
    const dono = users.find((u) => String(u.id) === String(ownerId));
    const cargos = [...(Array.isArray(dono?.career_levels) ? dono.career_levels : []), dono?.primary_career_level].filter(Boolean);
    let melhorId = null; let melhorPct = 0;
    cargos.forEach((c) => {
      if (!REDE.includes(c)) return;
      const pct = Number(levels[c]?.venda_direta_pct || 0);
      if (melhorId === null || pct > melhorPct) { melhorId = c; melhorPct = pct; }
    });
    const i = REDE.indexOf(melhorId);
    return { tetoPct: melhorPct, degrauPct: i > 0 ? Number(levels[REDE[i - 1]]?.venda_direta_pct || 0) : 0 };
  }, [users, ownerId, levels]);

  // melhor licença de VENDA da pessoa (maior percentual só entre os cargos da
  // escada REDE que ela tem). ⚠️ Cargo institucional (executivo de conta, CEO,
  // diretoria, sócio, fundador) NÃO conta aqui — mesmo tendo venda_direta_pct alto
  // na tabela, ele não é uma licença de venda. Sem este filtro, uma vendedora
  // licenciada (13%) que também é executiva de conta (20%, cargo administrativo)
  // aparecia com 20% na lista — o servidor já calculava certo (13%); só a etiqueta
  // da tela estava errada. Mesmo filtro do cálculo do teto (REDE, acima) e do
  // servidor (api/_lib/networkChain.js → bestSellingLevel).
  const enfeitar = useMemo(() => (u) => {
    const cargos = [...(Array.isArray(u.career_levels) ? u.career_levels : []), u.primary_career_level].filter(Boolean);
    let melhor = null;
    cargos.forEach((c) => {
      if (!REDE.includes(c)) return;
      const lv = levels[c];
      if (lv && (!melhor || (Number(lv.venda_direta_pct) || 0) > (Number(melhor.venda_direta_pct) || 0))) melhor = lv;
    });
    const bruto = Number(melhor?.venda_direta_pct) || 0;
    // comprando de si mesmo o balcão leva o teto inteiro — o degrau não se aplica
    const aplicaDegrau = tetoPct > 0 && bruto >= tetoPct && String(u.id) !== String(ownerId);
    const efetivo = aplicaDegrau ? Math.min(bruto, degrauPct) : bruto;
    return {
      id: u.id, full_name: u.full_name, email: u.email,
      nivel: melhor?.id || 'usuario', nivel_nome: melhor?.nome || 'Usuário',
      comissao_pct: efetivo, comissao_pct_licenca: bruto, degrau: aplicaDegrau && efetivo !== bruto,
    };
  }, [levels, tetoPct, degrauPct, ownerId]);

  // árvore abaixo do balcão (recrutou OU indicou, em qualquer profundidade)
  const { rede, outras } = useMemo(() => {
    if (!users.length) return { rede: [], outras: [] };
    const filhos = {};
    const porId = {};
    users.forEach((u) => {
      porId[u.id] = u;
      const pai = u.recruited_by_id || u.referred_by_id;
      if (pai) (filhos[pai] = filhos[pai] || []).push(u);
    });
    const daRede = new Set();
    const fila = [...(filhos[ownerId] || [])];
    while (fila.length) {
      const u = fila.shift();
      if (daRede.has(u.id)) continue;
      daRede.add(u.id);
      (filhos[u.id] || []).forEach((f) => { if (!daRede.has(f.id)) fila.push(f); });
    }
    const termo = norm(q);
    const casa = (u) => !termo || norm(u.full_name).includes(termo) || norm(u.email).includes(termo)
      || norm(enfeitar(u).nivel_nome).includes(termo);
    const ordenar = (a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR', { sensitivity: 'base' });

    const estruturaDe = (u) => {
      let node = u;
      for (let i = 0; i < 12; i++) {
        const paiId = node.recruited_by_id || node.referred_by_id;
        if (!paiId || !porId[paiId]) break;
        node = porId[paiId];
      }
      return node?.id === u.id ? null : node?.full_name || null;
    };

    // 👤 o próprio operador entra no topo: ele também compra no próprio balcão
    const eu = users.find((u) => String(u.id) === String(ownerId));
    const euItem = eu && casa(eu) ? { ...enfeitar(eu), euMesmo: true } : null;
    const minha = [
      ...(euItem ? [euItem] : []),
      ...users.filter((u) => daRede.has(u.id) && casa(u)).map(enfeitar).sort(ordenar).slice(0, 400),
    ];
    // fora da rede só aparece quando digita — senão vira lista infinita no balcão
    const fora = termo
      ? users.filter((u) => u.id !== ownerId && !daRede.has(u.id) && casa(u))
        .sort(ordenar).slice(0, 40).map((u) => ({ ...enfeitar(u), estrutura: estruturaDe(u) }))
      : [];
    return { rede: minha, outras: fora };
  }, [users, ownerId, q, enfeitar]);

  if (comprador) {
    return (
      <div className="mb-3">
        <label className="text-[11px] text-gray-500 flex items-center gap-1.5 mb-1"><UserIcon className="w-3 h-3" /> Para qual escritório vai a comissão?</label>
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
          <span className="text-sm text-green-800 truncate">
            {comprador.euMesmo ? 'Eu mesmo — ' : ''}{comprador.full_name}
            <span className="text-[10px] text-green-700/80"> · {comprador.nivel_nome} · {comprador.comissao_pct}% de comissão</span>
          </span>
          <button onClick={onClear} className="text-gray-500 hover:text-red-500 min-h-[44px] px-2"><Trash2 className="w-4 h-4" /></button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          Preço cheio no balcão. {comprador.comissao_pct}% volta como comissão pro escritório virtual dele; o restante do teto fica neste balcão.
          {comprador.degrau && ` Como o cargo dele (${comprador.comissao_pct_licenca}%) alcança o deste balcão, ele é atendido um degrau abaixo — assim a casa não fica sem comissão.`}
        </p>
      </div>
    );
  }

  const Linha = ({ p, deOutra }) => (
    <button
      onClick={() => { onSelect(deOutra ? p : { ...p, estrutura: null }); setQ(''); }}
      className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-nz-cinza-fundo text-sm border-b border-nz-borda last:border-0 flex items-center justify-between gap-2"
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{p.euMesmo ? `Eu mesmo — ${p.full_name || p.email}` : (p.full_name || p.email)}</div>
        <div className="text-[10px] text-gray-500 truncate">{p.euMesmo ? 'comissão volta pro meu escritório' : p.email}{deOutra && p.estrutura ? ` · estrutura de ${p.estrutura}` : ''}</div>
      </div>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-700 font-bold shrink-0 flex items-center gap-1">
        <BadgePercent className="w-3 h-3" />{p.comissao_pct}%
        {p.degrau && <span className="text-[9px] font-normal text-gray-500 line-through">{p.comissao_pct_licenca}%</span>}
      </span>
    </button>
  );

  return (
    <div className="mb-3">
      <label className="text-[11px] text-gray-500 flex items-center gap-1.5 mb-1"><UserIcon className="w-3 h-3" /> Para qual escritório vai a comissão? — opcional</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar qualquer cadastro por nome, e-mail ou cargo…"
        className="w-full bg-white border border-nz-borda rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 mb-1"
      />
      <div className="border border-nz-borda rounded-lg max-h-64 overflow-y-auto bg-white">
        {carregando && <div className="px-3 py-3 text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Carregando os cadastros…</div>}
        {!carregando && !rede.length && !outras.length && (
          <div className="px-3 py-3 text-xs text-gray-500">Nenhum cadastro com esse nome.</div>
        )}
        {rede.length > 0 && <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 bg-nz-cinza-fundo">Minha rede</div>}
        {rede.map((p) => <Linha key={p.id} p={p} />)}
        {outras.length > 0 && <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-orange-600 bg-nz-fogo-fundo">Outras estruturas</div>}
        {outras.map((p) => <Linha key={p.id} p={p} deOutra />)}
      </div>
      {/* 🧭 Texto corrigido em 18/08/2026: dizia "a venda fica na casa", o que ficou
          impreciso depois da regra "quem vende recebe". Sem seleção a venda é de quem
          está operando e a comissão sobe pela rede DELE. O texto antigo podia levar o
          vendedor a escolher um escritório sem precisar e entregar a própria comissão. */}
      <p className="text-[10px] text-gray-500 mt-1">Sem seleção, a venda é sua e a comissão sobe pela sua rede.</p>
    </div>
  );
}