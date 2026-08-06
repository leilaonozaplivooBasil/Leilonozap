import React from 'react';
import { Wallet, Package, DollarSign, Plus } from 'lucide-react';

// 👤 Cabeçalho + cartões do Painel do Parceiro, em preto/dourado institucional.
// ⚠️ Só mostra valores REAIS já apurados. Nada de estimativa/projeção.
export default function ParceiroPainelResumo({
  user,
  totalAportado,
  lucroApurado,
  comprasAtivas,
  planoAtual,
  onContratarPlano,
  onVerCompras,
}) {
  const inicial = user?.full_name?.charAt(0) || 'P';
  const brl = (v) => `R$ ${(v || 0).toLocaleString('pt-BR')}`;

  return (
    <>
      <section className="mb-6 border border-pc-borda bg-pc-preto-2 p-5 sm:p-8">
        <div className="border-b border-pc-borda pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">E-mail</p>
              <p className="mt-1 font-semibold text-pc-tinta">{user?.email}</p>
            </div>
            {user?.last_dashboard_access && (
              <div className="sm:text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Último acesso</p>
                <p className="mt-1 font-semibold text-pc-tinta">
                  {new Date(user.last_dashboard_access).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
          {planoAtual && (
            <p className="mt-3 inline-block border border-pc-ouro px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-pc-ouro">
              {planoAtual}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-pc-ouro text-3xl font-bold text-pc-ouro">
            {inicial}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-pc-tinta sm:text-4xl">
              {user?.full_name || 'Parceiro Comercial'}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-pc-ouro">Parceiro Comercial</p>
          </div>
          <button
            type="button"
            onClick={onContratarPlano}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 border border-pc-ouro px-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto sm:w-auto"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Contratar novo plano
          </button>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-pc-borda bg-pc-preto-2 p-5">
          <Wallet className="h-5 w-5 text-pc-ouro" strokeWidth={1.5} />
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Capital aportado</p>
          <p className="mt-1 text-2xl font-bold text-pc-tinta">{brl(totalAportado)}</p>
        </div>

        <div className="border border-pc-borda bg-pc-preto-2 p-5">
          <DollarSign className="h-5 w-5 text-pc-ouro" strokeWidth={1.5} />
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-pc-ouro">
            Resultado compartilhado recebido
          </p>
          <p className="mt-1 text-2xl font-bold text-pc-tinta">{brl(lucroApurado)}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-pc-tinta-fraca">
            Cota sobre o lucro líquido apurado (Cláusula 7.1).
          </p>
        </div>

        <button
          type="button"
          onClick={onVerCompras}
          className="border border-pc-borda bg-pc-preto-2 p-5 text-left transition-colors hover:border-pc-ouro"
        >
          <Package className="h-5 w-5 text-pc-ouro" strokeWidth={1.5} />
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Operações ativas</p>
          <p className="mt-1 text-2xl font-bold text-pc-tinta">{comprasAtivas}</p>
        </button>
      </div>
    </>
  );
}