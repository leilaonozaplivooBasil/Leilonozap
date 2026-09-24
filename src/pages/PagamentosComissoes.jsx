import React, { useEffect, useMemo, useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { fmtBR } from '@/lib/money';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Search, Landmark, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import ComissaoUsuarioCard from '@/components/comissoes/ComissaoUsuarioCard';
import { AVISO_COMISSAO, LINK_APROVACAO } from '@/lib/comissaoSoConsulta';

// 🏦 PAGAMENTOS DE COMISSÕES — extrato por pessoa (23/09/2026 → 24/09/2026)
// Nasceu em 12/08 como "banco interno" pra pagar PIX na mão e marcar pago. O
// "marcar pago" nunca gravou (tabela fora do entityWrite), virou só-consulta
// em 23/09, e em 24/09 voltou a pagar — com débito atômico do saldo real, sem
// o furo de antes. Ver src/lib/comissaoSoConsulta.js pro histórico da decisão.
//
// 🔴 "A RECEBER" NÃO VEM MAIS DA SOMA DE commission_records (24/09/2026) — o
// que a pessoa PODE receber de verdade é `commission_balance` em app_users: a
// soma dos registros pendentes já tinha divergido dele pra quem estava com
// saque em andamento (o dinheiro sai de commission_balance na hora do pedido,
// mas o commission_record continuava "pendente"). Pagar em cima do número
// errado passaria por cima de dinheiro já reservado ou já pago. Os registros
// de commission_records continuam servindo pra mostrar QUAIS vendas geraram o
// saldo (a tabela de detalhe, ao expandir o cartão).
export default function PagamentosComissoes() {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [pagamentosManuais, setPagamentosManuais] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('a_pagar'); // a_pagar | pago | todos
  const [admin] = useState(() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } });

  const carregar = async () => {
    setLoading(true);
    try {
      const [comms, users, manuais] = await Promise.all([
        plataforma.entities.CommissionRecord.list('-created_date', 5000),
        plataforma.entities.AppUser.list(),
        plataforma.entities.ComissaoPagamentoManual.list('-created_at', 2000),
      ]);
      setCommissions(comms || []);
      setPagamentosManuais(manuais || []);
      const map = {};
      (users || []).forEach((u) => { map[u.id] = u; });
      setUsersById(map);
    } catch (e) {
      toast.error('Erro ao carregar comissões: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const manuaisByUser = useMemo(() => {
    const m = {};
    pagamentosManuais.forEach((p) => { (m[p.user_id] ||= []).push(p); });
    return m;
  }, [pagamentosManuais]);

  const grupos = useMemo(() => {
    const byUser = {};
    commissions.forEach((c) => {
      if (!byUser[c.user_id]) {
        const u = usersById[c.user_id];
        byUser[c.user_id] = {
          user_id: c.user_id,
          user_name: c.user_name || u?.full_name || 'Sem nome',
          kyc_status: u?.kyc_status || 'nao_iniciado',
          commissions: [],
          pendentes: [],
          // 🔴 fonte real, não a soma dos registros — ver o cabeçalho do arquivo.
          totalPendente: Math.max(0, Number(u?.commission_balance) || 0),
          totalPago: 0,
          pagamentosManuais: manuaisByUser[c.user_id] || [],
        };
      }
      const g = byUser[c.user_id];
      g.commissions.push(c);
      if (c.status === 'paid') g.totalPago += c.amount || 0;
      else if (c.status === 'pending' || c.status === 'confirmed') g.pendentes.push(c);
    });
    // o que já foi pago na mão também é "já pago" no extrato, mesmo sem
    // registro de commission_records marcado — é dinheiro que saiu de verdade.
    Object.values(byUser).forEach((g) => {
      g.totalPago += g.pagamentosManuais.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    });
    return Object.values(byUser).sort((a, b) => b.totalPendente - a.totalPendente);
  }, [commissions, usersById, manuaisByUser]);

  const filtrados = useMemo(() => {
    return grupos
      .filter((g) => {
        if (aba === 'a_pagar') return g.totalPendente > 0;
        if (aba === 'pago') return g.totalPago > 0;
        return true;
      })
      .filter((g) => !busca.trim() || (g.user_name || '').toLowerCase().includes(busca.trim().toLowerCase()));
  }, [grupos, aba, busca]);

  const totalGeralPendente = grupos.reduce((s, g) => s + g.totalPendente, 0);
  const totalGeralPago = grupos.reduce((s, g) => s + g.totalPago, 0);
  const pessoasAPagar = grupos.filter((g) => g.totalPendente > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando comissões…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Landmark className="w-7 h-7 text-green-400" />
          <h1 className="text-2xl font-black">Pagamentos de Comissões</h1>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Todas as comissões (leilão e loja virtual) organizadas por pessoa, como um extrato.
        </p>
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col md:flex-row md:items-center gap-3" data-teste="aviso-pagamento-manual">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-100 flex-1">{AVISO_COMISSAO}</p>
          <Link to={LINK_APROVACAO} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-3 py-2 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4" /> Aprovar KYC e saques
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-amber-900/50 rounded-xl p-4">
            <div className="text-xs text-amber-400">Total no saldo das pessoas</div>
            <div className="text-2xl font-black text-amber-400">R$ {fmtBR(totalGeralPendente)}</div>
          </div>
          <div className="bg-gray-900 border border-green-900/50 rounded-xl p-4">
            <div className="text-xs text-green-400">Já pago</div>
            <div className="text-2xl font-black text-green-400">R$ {fmtBR(totalGeralPago)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500">Pessoas com saldo a receber</div>
            <div className="text-2xl font-black">{pessoasAPagar}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {[
              { id: 'a_pagar', label: 'A receber' },
              { id: 'pago', label: 'Já pago' },
              { id: 'todos', label: 'Todos' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setAba(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold ${aba === t.id ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-2 flex-1 min-w-[220px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome"
              className="bg-transparent border-none text-sm h-9 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtrados.map((g) => (
            <ComissaoUsuarioCard key={g.user_id} grupo={g} admin={admin} onPago={carregar} />
          ))}
          {filtrados.length === 0 && (
            <div className="text-center text-gray-500 py-16">Nenhuma comissão encontrada com esse filtro.</div>
          )}
        </div>
      </div>
    </div>
  );
}