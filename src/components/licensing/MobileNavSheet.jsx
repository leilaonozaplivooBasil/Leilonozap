import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, X, Search, Check } from 'lucide-react';
import { getLicensingGroups } from '@/lib/licensingTabs';

// 📱 NAVEGAÇÃO DO PAINEL DE ALAVANCAGEM NO CELULAR (13/08/2026)
//
// Antes era uma barra que rolava pro lado: a pessoa não via tudo, não sabia
// quantas seções existiam e precisava "caçar" arrastando. Agora funciona como no
// desktop: um botão único mostra onde você está e abre um painel com TUDO
// organizado por grupos — igual à lateral do computador.
//
// Mesma FONTE ÚNICA do desktop (@/lib/licensingTabs): nenhuma lista duplicada.
// Nada de lógica de negócio aqui — só navegação visual.
export default function MobileNavSheet({ user, activeTab, onTabChange }) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const grupos = useMemo(() => getLicensingGroups(user), [user]);

  // Seção atual (para o rótulo do botão): a aba ativa dentro dos grupos
  const atual = useMemo(() => {
    for (const g of grupos) {
      const hit = g.items.find((i) => i.type === 'tab' && i.value === activeTab);
      if (hit) return hit;
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
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(termo)) }))
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

  const AtualIcon = atual?.icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full min-h-[52px] flex items-center gap-3 rounded-xl border border-nz-borda bg-white px-3.5 py-2.5 shadow-sm text-left active:bg-nz-verde-fundo"
      >
        {AtualIcon && (
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-nz-verde-fundo">
            <AtualIcon className="h-4 w-4 text-nz-verde" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-nz-tinta">{atual?.label}</span>
          <span className="block text-[11px] text-nz-tinta-fraca">Toque para navegar</span>
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-nz-tinta-fraca" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[130] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />

          <div className="relative flex max-h-[85vh] flex-col rounded-t-2xl border-t border-nz-borda bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-nz-borda px-4 py-3">
              <span className="flex-1 text-sm font-bold text-nz-tinta">Navegar no painel</span>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-nz-tinta-fraca active:bg-nz-cinza-fundo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-nz-borda px-4 py-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nz-tinta-fraca" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar seção…"
                  className="h-11 w-full rounded-lg border border-nz-borda bg-white pl-9 pr-3 text-sm text-nz-tinta outline-none focus:border-nz-verde"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
              {gruposFiltrados.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-nz-tinta-fraca">Nada encontrado.</p>
              )}

              {gruposFiltrados.map((grupo) => (
                <div key={grupo.title} className="mb-2">
                  <p className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-nz-tinta-fraca">
                    {grupo.title}
                  </p>
                  {grupo.items.map((item) => {
                    const Icon = item.icon;
                    const ativo = item.type === 'tab' && item.value === activeTab;
                    return (
                      <button
                        key={item.type === 'tab' ? item.value : item.to}
                        type="button"
                        onClick={() => escolher(item)}
                        className={`mb-0.5 flex w-full min-h-[48px] items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                          ativo ? 'bg-nz-verde-fundo text-nz-verde' : 'text-nz-tinta active:bg-nz-cinza-fundo'
                        }`}
                      >
                        <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${ativo ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`} />
                        <span className={`min-w-0 flex-1 truncate text-sm ${ativo ? 'font-bold' : 'font-medium'}`}>
                          {item.label}
                        </span>
                        {ativo && <Check className="h-4 w-4 flex-shrink-0 text-nz-verde" />}
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