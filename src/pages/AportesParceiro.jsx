import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Wallet } from 'lucide-react';
import AportesResumo from '@/components/aportes/AportesResumo';
import AportesFiltros from '@/components/aportes/AportesFiltros';
import AporteCard from '@/components/aportes/AporteCard';
import AportesTabela from '@/components/aportes/AportesTabela';
import { statusDoAporte, conferirNoMercadoPago } from '@/components/aportes/aporteUtils';

// EXTRATO DE APORTES DO PARCEIRO DE COMPRA — tela de LEITURA (espelho do Mercado Pago).
// Lê os aportes que o sistema JÁ registra no momento em que o PIX é gerado.
// Não cria, não altera valor, não mexe em comissão. A única escrita possível é a
// conciliação por linha, que reaproveita a rota de conferência já existente.
export default function AportesParceiro() {
  const [aportes, setAportes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [status, setStatus] = useState('todos');
  const [periodo, setPeriodo] = useState('todos');
  const [conferindoId, setConferindoId] = useState(null);
  const [divergentes, setDivergentes] = useState({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    const lista = await base44.entities.CatalogSale.filter({ kind: 'partner_plan' }, '-created_date', 300);
    setAportes(Array.isArray(lista) ? lista : []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Voltar pro app / trocar de aba recarrega — dado financeiro não pode ficar velho na tela.
  useEffect(() => {
    const revalidar = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', revalidar);
    window.addEventListener('focus', revalidar);
    return () => {
      document.removeEventListener('visibilitychange', revalidar);
      window.removeEventListener('focus', revalidar);
    };
  }, [carregar]);

  const divergenteDe = useCallback((a) => divergentes[a.id] === true, [divergentes]);

  const handleConferir = async (aporte) => {
    setConferindoId(aporte.id);
    try {
      const r = await conferirNoMercadoPago(aporte.mp_payment_id);
      if (r?.is_paid) {
        setDivergentes((p) => ({ ...p, [aporte.id]: true }));
        toast.success('Pago no Mercado Pago! Confirmação disparada — atualizando extrato.');
        await carregar();
      } else if (r?.is_rejected) {
        toast.error(`Cobrança recusada no Mercado Pago (${r.status_detail || r.status}).`);
      } else {
        toast.info('Ainda não consta como pago no Mercado Pago.');
      }
    } catch (e) {
      toast.error('Não foi possível conferir agora. Tente novamente.');
    } finally {
      setConferindoId(null);
    }
  };

  const filtrados = useMemo(() => {
    const limite = periodo === 'todos' ? 0 : Date.now() - Number(periodo) * 864e5;
    return aportes.filter((a) => {
      if (limite && new Date(a.created_date || 0).getTime() < limite) return false;
      if (status !== 'todos' && statusDoAporte(a) !== status) return false;
      return true;
    });
  }, [aportes, status, periodo]);

  const totais = useMemo(() => {
    const noPeriodo = periodo === 'todos'
      ? aportes
      : aportes.filter((a) => new Date(a.created_date || 0).getTime() >= Date.now() - Number(periodo) * 864e5);
    const pagos = noPeriodo.filter((a) => statusDoAporte(a) === 'pago');
    const pendentes = noPeriodo.filter((a) => statusDoAporte(a) === 'pendente');
    return {
      totalPago: pagos.reduce((s, a) => s + (Number(a.total_amount) || 0), 0),
      qtdPago: pagos.length,
      totalPendente: pendentes.reduce((s, a) => s + (Number(a.total_amount) || 0), 0),
      qtdPendente: pendentes.length,
      qtdDivergente: Object.values(divergentes).filter(Boolean).length,
    };
  }, [aportes, periodo, divergentes]);

  return (
    <div className="min-h-screen bg-pc-preto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-pc-ouro/30 bg-pc-ouro/10 p-2.5">
              <Wallet className="h-5 w-5 text-pc-ouro" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-pc-tinta sm:text-2xl">Extrato de Aportes</h1>
              <p className="text-xs text-pc-tinta-fraca">Parceiro de Compra — espelho do Mercado Pago</p>
            </div>
          </div>
          <button
            type="button"
            onClick={carregar}
            disabled={carregando}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-pc-borda bg-pc-preto-2 px-4 text-sm font-semibold text-pc-tinta disabled:opacity-60"
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </button>
        </div>

        <AportesResumo {...totais} />
        <AportesFiltros status={status} periodo={periodo} onStatus={setStatus} onPeriodo={setPeriodo} />

        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-pc-tinta-fraca">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando aportes...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-xl border border-pc-borda bg-pc-preto-2 py-16 text-center">
            <p className="text-sm font-semibold text-pc-tinta">Nenhum aporte neste filtro</p>
            <p className="mt-1 text-xs text-pc-tinta-fraca">Ajuste o status ou o período para ver outros registros.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
              {filtrados.map((a) => (
                <AporteCard
                  key={a.id}
                  aporte={a}
                  status={statusDoAporte(a)}
                  divergente={divergenteDe(a)}
                  conferindo={conferindoId === a.id}
                  onConferir={() => handleConferir(a)}
                />
              ))}
            </div>
            <div className="hidden lg:block">
              <AportesTabela
                aportes={filtrados}
                statusDe={statusDoAporte}
                divergenteDe={divergenteDe}
                conferindoId={conferindoId}
                onConferir={handleConferir}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}