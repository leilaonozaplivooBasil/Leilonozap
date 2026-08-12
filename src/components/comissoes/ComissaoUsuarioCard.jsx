import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtBR } from '@/lib/money';
import { copyLink } from '@/lib/clipboard';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Copy, Check, Save, Landmark } from 'lucide-react';

// 🏦 Cartão de uma pessoa no "banco de comissões": mostra quanto ela tem a
// receber, a chave PIX pra pagar rápido, e permite marcar como pago (tudo ou
// item por item) enquanto o pagamento é manual.
export default function ComissaoUsuarioCard({ grupo, onSalvarPix, onMarcarPago, onMarcarPagoUm }) {
  const [aberto, setAberto] = useState(false);
  const [pixKey, setPixKey] = useState(grupo.pix_key || '');
  const [pixType, setPixType] = useState(grupo.pix_key_type || 'CPF');
  const [salvandoPix, setSalvandoPix] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [marcandoTodos, setMarcandoTodos] = useState(false);

  const handleCopiar = async () => {
    const ok = await copyLink(pixKey);
    if (ok) {
      setCopiado(true);
      toast.success('Chave PIX copiada');
      setTimeout(() => setCopiado(false), 1500);
    } else {
      toast.error('Não foi possível copiar');
    }
  };

  const handleSalvarPix = async () => {
    setSalvandoPix(true);
    await onSalvarPix(grupo.user_id, pixKey, pixType);
    setSalvandoPix(false);
  };

  const handleMarcarTodos = async () => {
    setMarcandoTodos(true);
    await onMarcarPago(grupo.pendentes.map((c) => c.id));
    setMarcandoTodos(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[180px]">
          <div className="font-semibold text-white">{grupo.user_name || 'Sem nome'}</div>
          <div className="text-xs text-gray-500">{grupo.user_id}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">A pagar</div>
          <div className="text-lg font-black text-amber-400">R$ {fmtBR(grupo.totalPendente)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Já pago</div>
          <div className="text-sm font-bold text-green-400">R$ {fmtBR(grupo.totalPago)}</div>
        </div>

        {grupo.totalPendente > 0 && (
          <Button
            onClick={handleMarcarTodos}
            disabled={marcandoTodos}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            {marcandoTodos ? 'Marcando...' : 'Marcar tudo como pago'}
          </Button>
        )}

        <button onClick={() => setAberto(!aberto)} className="text-gray-400 hover:text-white p-2">
          {aberto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {aberto && (
        <div className="border-t border-gray-800 p-4 space-y-4 bg-gray-950/40">
          {/* Chave PIX */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1 text-gray-400 text-xs uppercase font-bold mr-1">
              <Landmark className="w-3.5 h-3.5" /> PIX
            </div>
            <select
              value={pixType}
              onChange={(e) => setPixType(e.target.value)}
              className="h-9 px-2 rounded-md border border-gray-700 bg-gray-800 text-white text-sm"
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="PHONE">Telefone</option>
              <option value="RANDOM">Aleatória</option>
            </select>
            <Input
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Chave PIX desta pessoa"
              className="bg-gray-800 border-gray-700 text-white flex-1 min-w-[200px]"
            />
            <Button onClick={handleSalvarPix} disabled={salvandoPix} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-1" /> {salvandoPix ? 'Salvando...' : 'Salvar'}
            </Button>
            {pixKey && (
              <Button onClick={handleCopiar} size="sm" variant="outline" className="border-gray-600 text-gray-300">
                {copiado ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} Copiar
              </Button>
            )}
          </div>

          {/* Lista de comissões */}
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">Papel</th>
                  <th className="text-left px-3 py-2">Produto/Venda</th>
                  <th className="text-right px-3 py-2">%</th>
                  <th className="text-right px-3 py-2">Valor</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {grupo.commissions.map((c) => (
                  <tr key={c.id} className="border-t border-gray-800">
                    <td className="px-3 py-2 text-gray-300">{c.role}</td>
                    <td className="px-3 py-2 text-gray-400">{c.product_title || c.sale_id?.slice(0, 8) || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{c.percent}%</td>
                    <td className="px-3 py-2 text-right font-bold text-white">R$ {fmtBR(c.amount)}</td>
                    <td className="px-3 py-2">
                      {c.status === 'paid' ? (
                        <span className="text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded">Pago</span>
                      ) : c.status === 'canceled' ? (
                        <span className="text-gray-500 text-xs font-bold bg-gray-500/10 px-2 py-1 rounded">Cancelado</span>
                      ) : (
                        <span className="text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-1 rounded">
                          {c.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(c.status === 'pending' || c.status === 'confirmed') && (
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 h-7 text-xs" onClick={() => onMarcarPagoUm(c.id)}>
                          Marcar pago
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}