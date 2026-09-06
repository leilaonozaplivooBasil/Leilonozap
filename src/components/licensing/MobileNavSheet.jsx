import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, X, Search, Check, Store } from 'lucide-react';
import { getLicensingGroups, chaveDoItem, entradaFlutuante } from '@/lib/licensingTabs';
import MarcaOuIcone from '@/components/common/MarcaOuIcone';

// 📱 NAVEGAÇÃO DO PAINEL DE ALAVANCAGEM NO CELULAR (13/08/2026 · reorganizado 18/08/2026
// · visual "tech" 18/08/2026)
//
// Mesma FONTE ÚNICA do desktop (@/lib/licensingTabs): nenhuma lista duplicada.
//
// A lateral do desktop (NavegacaoLateralGlobal) condensa "Operação" e qualquer
// aba com sub-seções (ex: "Central de Vendas") num ícone único que abre um menu
// flutuante — e esconde itens que já são alcançados de dentro de outra tela
// (Comprar Estoque, Meus Arremates). Essa MESMA organização é replicada aqui:
// como não há hover no celular, o item único expande inline (acordeão) em vez
// de abrir um flutuante. Nada de lógica de negócio — só espelha o agrupamento.
//
// 🖤 VISUAL: mesma identidade escura da barra do topo (--nz-preto-barra) com
// acento verde neon — não mais um dropdown branco "genérico".
const ITENS_OCULTOS = ['/painel/comprar-estoque', '/MyWinnings'];
const chaveDe = chaveDoItem;

// 🎓 DOIS VESTUÁRIOS, UM COMPONENTE (06/09/2026). Ordem do dono, olhando o
// cartão "LOJA & VENDAS · toque para navegar" e o modal que ele abre dentro
// da Top College: "ela precisa ter a identidade visual da Top College".
// Fora da faculdade NADA muda — ESTILO_PADRAO é, string por string, o que o
// componente sempre teve (verde neon da barra). Dentro dela entra o
// ESTILO_TOP_COLLEGE: sem caixa em volta (a "borda infinita" que vale pra
// faculdade inteira), gradiente azul→magenta no lugar do verde, Sora nas
// letras e as duas marcas assinando o topo do modal.
const ESTILO_PADRAO = {
  gatilho: 'w-full min-h-[56px] flex items-center gap-3 rounded-xl border border-nz-verde/25 bg-nz-preto-barra px-3.5 py-2.5 shadow-[0_4px_18px_rgba(0,0,0,0.25)] text-left active:opacity-90',
  caixaGatilho: { background: 'linear-gradient(135deg, rgba(46,157,99,0.28), rgba(27,122,72,0.14))', boxShadow: '0 0 0 1px rgba(46,157,99,0.35)' },
  iconeGatilho: 'h-[18px] w-[18px] text-nz-verde-claro',
  chevronGatilho: 'h-4 w-4 flex-shrink-0 text-nz-verde-claro',
  fonte: undefined,
  folha: 'relative flex max-h-[85vh] flex-col rounded-t-2xl bg-nz-preto-barra shadow-2xl',
  folhaEstilo: { borderTop: '1px solid rgba(46,157,99,0.35)', boxShadow: '0 -12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(46,157,99,0.12)' },
  buscaIcone: 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nz-verde-claro',
  buscaFoco: 'focus:border-nz-verde-claro/60',
  tituloGrupo: 'flex items-center gap-2 px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-nz-verde-claro/70',
  bolinha: 'h-1 w-1 rounded-full bg-nz-verde-claro/70',
  bolinhaEstilo: undefined,
  ativoFundo: 'bg-nz-verde/15',
  ativoSombra: { boxShadow: '0 0 0 1px rgba(46,157,99,0.35)' },
  caixaAtiva: 'linear-gradient(135deg, rgba(46,157,99,0.35), rgba(27,122,72,0.18))',
  iconeAtivo: 'text-nz-verde-claro',
  textoAtivo: 'text-nz-verde-claro',
  trilho: 'ml-4 mb-1 mt-1 border-l border-nz-verde/25 pl-3',
  check: 'h-4 w-4 flex-shrink-0 text-nz-verde-claro',
};
const GRADIENTE_TC = 'linear-gradient(135deg, var(--topcollege-azul, #3B6FF6), var(--topcollege-magenta, #E62E8B))';
const ESTILO_TOP_COLLEGE = {
  gatilho: 'w-full min-h-[56px] flex items-center gap-3 border-b border-white/10 px-1 py-2.5 text-left active:opacity-90',
  caixaGatilho: { background: GRADIENTE_TC, boxShadow: '0 6px 18px rgba(59,111,246,0.28)' },
  iconeGatilho: 'h-[18px] w-[18px] text-white',
  chevronGatilho: 'h-4 w-4 flex-shrink-0 text-white/60',
  fonte: { fontFamily: 'Sora, sans-serif' },
  folha: 'relative flex max-h-[85vh] flex-col rounded-t-2xl shadow-2xl',
  folhaEstilo: { background: 'var(--xeos-preto, #00020C)', boxShadow: '0 -12px 40px rgba(0,0,0,0.65)' },
  buscaIcone: 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50',
  buscaFoco: 'focus:border-white/40',
  tituloGrupo: 'flex items-center gap-2 px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40',
  bolinha: 'h-1 w-1 rounded-full',
  bolinhaEstilo: { background: GRADIENTE_TC },
  ativoFundo: 'bg-white/10',
  ativoSombra: { boxShadow: 'inset 3px 0 0 var(--topcollege-magenta, #E62E8B)' },
  caixaAtiva: GRADIENTE_TC,
  iconeAtivo: 'text-white',
  textoAtivo: 'text-white',
  trilho: 'ml-4 mb-1 mt-1 border-l border-white/15 pl-3',
  check: 'h-4 w-4 flex-shrink-0 text-white',
};

export default function MobileNavSheet({ user, activeTab, onTabChange, topCollege = false }) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [grupoExpandido, setGrupoExpandido] = useState(null);

  // Mesma transformação da lateral do desktop: grupo "Operação" e qualquer aba
  // com subItens viram UM item de grupo (expande pra mostrar os destinos).
  const grupos = useMemo(() => {
    return getLicensingGroups(user)
      .map((grupo) => {
        // 🎓 DIR-57 — mesma regra do desktop, agora vinda do dado (`colapsar`)
        // em vez de um `if` no nome do grupo: um item só não vira acordeão.
        if (grupo.colapsar) {
          const visiveis = grupo.items.filter((item) => !ITENS_OCULTOS.includes(chaveDe(item)));
          if (visiveis.length > 1) {
            const subItens = visiveis.map((item) => entradaFlutuante(item, onTabChange));
            return { ...grupo, items: [{ type: 'group', ...grupo.colapsar, subItens }] };
          }
        }
        const items = grupo.items
          .filter((item) => !ITENS_OCULTOS.includes(chaveDe(item)))
          .map((item) => {
            if (item.type === 'tab' && Array.isArray(item.subItens) && item.subItens.length) {
              // 🐛 CORREÇÃO: os subItens (ex: Loja & Vendas) só traziam `value`
              // — sem `to` nem `onClick` os botões não navegavam pra lugar nenhum.
              // Hoje a montagem é a MESMA função do desktop (entradaFlutuante).
              const subItens = item.subItens.map((sub) => (
                entradaFlutuante({ ...sub, type: 'tab', value: item.value, catalogTab: sub.value }, onTabChange)
              ));
              return { type: 'group', chave: `tab:${item.value}`, label: item.label, icon: item.icon, subItens, tabValue: item.value };
            }
            return item;
          });
        return { ...grupo, items };
      })
      .filter((g) => g.items.length > 0);
  }, [user]);

  // Seção atual (para o rótulo do botão): a aba ativa dentro dos grupos, olhando
  // também dentro dos itens de grupo (ex: Central de Vendas está "dentro" dele).
  const atual = useMemo(() => {
    for (const g of grupos) {
      for (const item of g.items) {
        if (item.type === 'tab' && item.value === activeTab) return item;
        if (item.type === 'group' && item.tabValue === activeTab) return item;
      }
    }
    return grupos[0]?.items[0];
  }, [grupos, activeTab]);

  // Esc fecha o painel
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto]);

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return grupos;
    return grupos
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          i.label.toLowerCase().includes(termo) ||
          (i.subItens || []).some((s) => s.label.toLowerCase().includes(termo))
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [grupos, busca]);

  const escolher = (item) => {
    setAberto(false);
    setBusca('');
    if (item.type === 'tab') {
      onTabChange?.(item.value);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(item.to);
    }
  };

  const escolherSub = (sub) => {
    setAberto(false);
    setBusca('');
    if (sub.to) {
      navigate(sub.to);
    } else {
      sub.onClick?.();
    }
  };

  const AtualIcon = atual?.icon;
  const est = topCollege ? ESTILO_TOP_COLLEGE : ESTILO_PADRAO;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={est.gatilho}
        style={est.fonte}
        data-vestuario={topCollege ? 'top-college' : 'padrao'}
      >
        {AtualIcon && (
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={est.caixaGatilho}
          >
            <MarcaOuIcone marca={atual?.marca} icone={AtualIcon} className={est.iconeGatilho} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold uppercase tracking-wide text-white">{atual?.label}</span>
          <span className="block text-[10.5px] font-medium uppercase tracking-wider text-white/40">Toque para navegar</span>
        </span>
        <ChevronDown className={est.chevronGatilho} />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[130] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAberto(false)} />

          <div
            className={est.folha}
            style={{ ...est.folhaEstilo, ...(est.fonte || {}) }}
          >
            {/* 🎓 na Top College o fio do topo é o gradiente da faculdade */}
            {topCollege && <div aria-hidden="true" className="h-[2px] w-full rounded-t-2xl" style={{ background: GRADIENTE_TC }} />}
            <div className="mx-auto mt-2 h-1 w-10 flex-shrink-0 rounded-full bg-white/15" />

            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
              {topCollege ? (
                /* as duas marcas assinam o modal, como assinam a faixa da faculdade */
                <span className="flex flex-1 items-center gap-2.5">
                  <img src="/marca/topcollege.webp" alt="Top College" className="h-5 w-auto" draggable="false" />
                  <span aria-hidden="true" className="h-5 w-px bg-white/20" />
                  <img src="/marca/marca-xeos-lockup.webp" alt="X-eos" className="h-3.5 w-auto" draggable="false" />
                </span>
              ) : (
                <span className="flex-1 text-sm font-bold uppercase tracking-wide text-white">Navegar no Painel</span>
              )}
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 active:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-white/10 px-4 py-2.5">
              <div className="relative">
                <Search className={est.buscaIcone} />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="BUSCAR SEÇÃO..."
                  className={`h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm font-medium uppercase tracking-wide text-white placeholder:text-white/30 outline-none ${est.buscaFoco}`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
              {gruposFiltrados.length === 0 && (
                <p className="px-3 py-6 text-center text-sm font-medium text-white/40">Nada encontrado.</p>
              )}

              {gruposFiltrados.map((grupo) => (
                <div key={grupo.title} className="mb-3">
                  <p className={est.tituloGrupo}>
                    <span className={est.bolinha} style={est.bolinhaEstilo} />
                    {grupo.title}
                  </p>
                  {grupo.items.map((item) => {
                    const Icon = item.icon;

                    // Item de grupo (Operação / Central de Vendas): expande inline
                    // pra mostrar os destinos — mesma organização do menu flutuante do desktop.
                    if (item.type === 'group') {
                      const expandido = grupoExpandido === item.chave;
                      const ativo = !!item.tabValue && item.tabValue === activeTab;
                      const destacado = ativo || expandido;
                      return (
                        <div key={item.chave} className="mb-1">
                          <button
                            type="button"
                            onClick={() => setGrupoExpandido(expandido ? null : item.chave)}
                            className={`flex w-full min-h-[52px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                              destacado ? est.ativoFundo : 'active:bg-white/5'
                            }`}
                            style={destacado ? est.ativoSombra : undefined}
                          >
                            <span
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                              style={{ background: destacado ? est.caixaAtiva : 'rgba(255,255,255,0.06)' }}
                            >
                              <MarcaOuIcone marca={item.marca} icone={Icon} className={`h-[17px] w-[17px] ${destacado ? est.iconeAtivo : 'text-white/50'}`} />
                            </span>
                            <span className={`min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide ${destacado ? est.textoAtivo : 'text-white/85'}`}>
                              {item.label}
                            </span>
                            <ChevronDown className={`h-4 w-4 flex-shrink-0 text-white/40 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                          </button>
                          {expandido && (
                            <div className={est.trilho}>
                              {item.subItens.map((sub) => {
                                const IconSub = sub.icon;
                                return (
                                  <button
                                    key={sub.label}
                                    type="button"
                                    onClick={() => escolherSub(sub)}
                                    className="mb-0.5 flex w-full min-h-[46px] items-center gap-2.5 rounded-lg px-3 py-2 text-left active:bg-white/5"
                                  >
                                    {/* 🎓 DIR-59 — mesma regra do desktop: item com
                                        `marcaCompleta` mostra a LOGO no lugar do texto. */}
                                    {sub.marcaCompleta ? (
                                      <img src={sub.marcaCompleta} alt={sub.label} className="h-11 w-auto object-contain" draggable="false" />
                                    ) : (
                                      <>
                                        {(sub.marca || IconSub) && (
                                          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white/5">
                                            <MarcaOuIcone marca={sub.marca} icone={IconSub} className="h-3.5 w-3.5 text-white/50" />
                                          </span>
                                        )}
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide text-white/75">{sub.label}</span>
                                      </>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const ativo = item.type === 'tab' && item.value === activeTab;
                    return (
                      <button
                        key={item.type === 'tab' ? item.value : item.to}
                        type="button"
                        onClick={() => escolher(item)}
                        className={`mb-1 flex w-full min-h-[52px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          ativo ? est.ativoFundo : 'active:bg-white/5'
                        }`}
                        style={ativo ? est.ativoSombra : undefined}
                      >
                        <span
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ background: ativo ? est.caixaAtiva : 'rgba(255,255,255,0.06)' }}
                        >
                          <MarcaOuIcone marca={item.marca} icone={Icon} className={`h-[17px] w-[17px] ${ativo ? est.iconeAtivo : 'text-white/50'}`} />
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide ${ativo ? est.textoAtivo : 'text-white/85'}`}>
                          {item.label}
                        </span>
                        {ativo && <Check className={est.check} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}