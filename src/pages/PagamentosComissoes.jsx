import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fmtBR } from '@/lib/money';
import { Input } from '@/components/ui/input';
import { Search, Landmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ComissaoUsuarioCard from '@/components/comissoes/ComissaoUsuarioCard';

// 🏦 PAGAMENTOS DE COMISSÕES — "banco interno" pra pagar manualmente (12/08/2026)
// Enquanto a integração com o banco/gateway automático não fecha, esta tela reúne
// todas as comissões (leilão + catálogo) por pessoa, mostra a chave PIX de cada uma
// e permite marcar como pago depois do PIX manual. Nada aqui envia dinheiro sozinho.
export default function PagamentosComissoes() {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('a_pagar'); // a_pagar | pago | todos

  const carregar = async () => {
    setLoading(true);
    try {
      const [comms, users] = await Promise.all([
        base44.entities.CommissionRecord.list('-created_date', 5000),
        base44.entities.AppUser.list(),
      ]);
      setCommissions(comms || []);
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

  const grupos = useMemo(() => {
    const byUser = {};
    commissions.forEach((c) => {
      if (!byUser[c.user_id]) {
        const u = usersById[c.user_id];
        byUser[c.user_id] = {
          user_id: c.user_id,
          user_name: c.user_name || u?.full_name || 'Sem nome',
          pix_key: u?.pix_key || '',
          pix_key_type: u?.pix_key_type || 'CPF',
          commissions: [],
          pendentes: [],
          totalPendente: 0,
          totalPago: 0,
        };
      }
      const g = byUser[c.user_id];
      g.commissions.push(c);
      if (c.status === 'paid') g.totalPago += c.amount || 0;
      else if (c.status === 'pending' || c.status === 'confirmed') {
        g.totalPendente += c.amount || 0;
        g.pendentes.push(c);
      }
    });
    return Object.values(byUser).sort((a, b) => b.totalPendente - a.totalPendente);
  }, [commissions, usersById]);

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

  const handleSalvarPix = async (userId, pixKey, pixType) => {
    try {
      await base44.entities.AppUser.update(userId, { pix_key: pixKey, pix_key_type: pixType });
      toast.success('Chave PIX salva');
      await carregar();
    } catch (e) {
      toast.error('Não foi possível salvar a chave PIX ainda. Fale com quem administra o banco de dados.');
    }
  };

  const handleMarcarPago = async (ids) => {
    try {
      await Promise.all(ids.map((id) => base44.entities.CommissionRecord.update(id, { status: 'paid' })));
      toast.success('Comissões marcadas como pagas');
      await carregar();
    } catch (e) {
      toast.error('Erro ao marcar como pago: ' + (e?.message || e));
    }
  };

  const handleMarcarPagoUm = async (id) => handleMarcarPago([id]);

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
        <p className="text-gray-400 text-sm mb-6">
          Todas as comissões (leilão e loja virtual) organizadas por pessoa, como um extrato bancário.
          Use enquanto o pagamento automático com o banco não está pronto: pague o PIX manualmente e
          marque como pago aqui.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-amber-900/50 rounded-xl p-4">
            <div className="text-xs text-amber-400">Total a pagar</div>
            <div className="text-2xl font-black text-amber-400">R$ {fmtBR(totalGeralPendente)}</div>
          </div>
          <div className="bg-gray-900 border border-green-900/50 rounded-xl p-4">
            <div className="text-xs text-green-400">Já pago</div>
            <div className="text-2xl font-black text-green-400">R$ {fmtBR(totalGeralPago)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500">Pessoas com saldo a pagar</div>
            <div className="text-2xl font-black">{pessoasAPagar}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {[
              { id: 'a_pagar', label: 'A pagar' },
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
            <ComissaoUsuarioCard
              key={g.user_id}
              grupo={g}
              onSalvarPix={handleSalvarPix}
              onMarcarPago={handleMarcarPago}
              onMarcarPagoUm={handleMarcarPagoUm}
            />
          ))}
          {filtrados.length === 0 && (
            <div className="text-center text-gray-500 py-16">Nenhuma comissão encontrada com esse filtro.</div>
          )}
        </div>
      </div>
    </div>
  );
}