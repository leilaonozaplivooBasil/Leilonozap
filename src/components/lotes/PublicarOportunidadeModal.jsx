import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

// 🌟 Publicação de um lote analisado nas "Oportunidades do Dia" do Parceiro.
// UI + validação apenas: quem grava é o Analisador (mesmo caminho de escrita já usado).
export default function PublicarOportunidadeModal({
  lote,
  custoTotal,
  freteSugerido,
  economiaPct,
  salvando,
  onConfirmar,
  onFechar,
}) {
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [lance, setLance] = useState(String(Math.round(custoTotal || 0)));
  const [frete, setFrete] = useState(String(Math.round(freteSugerido || 0)));
  const [vagas, setVagas] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');

  const confirmar = () => {
    if (!data || !horario) {
      setErro('Informe a data E o horário do leilão — o parceiro precisa ver a hora exata.');
      return;
    }
    const quando = new Date(`${data}T${horario}:00`);
    if (isNaN(quando.getTime())) {
      setErro('Data ou horário inválidos.');
      return;
    }
    setErro('');
    onConfirmar({
      data_leilao: quando.toISOString(),
      lance_entrada: Number(lance) || 0,
      frete_oportunidade: Number(frete) || 0,
      vagas: Number(vagas) || 0,
      observacao_parceiro: observacao.trim() || null,
    });
  };

  const campo =
    'w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-amber-500';
  const rotulo = 'text-xs font-semibold text-gray-400 uppercase tracking-widest';

  return (
    <div className="fixed inset-0 z-[130] flex items-stretch justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div className="relative flex h-full w-full flex-col border-gray-700 bg-[#161b22] sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl sm:border">
        <div
          className="flex items-start justify-between gap-3 border-b border-gray-700 px-5 py-4"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <Sparkles size={18} className="text-amber-400" /> Publicar nas Oportunidades do Dia
            </h3>
            <p className="mt-0.5 truncate text-xs text-gray-400">{lote?.nomeLote}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* resumo só leitura */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-gray-700 bg-gray-900/70 p-3 text-center">
            <div>
              <p className="text-[10px] uppercase text-gray-500">Itens</p>
              <p className="text-sm font-bold text-white">{lote?.quantidadeTotal || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500">Valor mercado</p>
              <p className="text-sm font-bold text-emerald-400">{brl(lote?.valorMercadoTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500">Economia</p>
              <p className="text-sm font-bold text-amber-400">
                {economiaPct != null ? `${economiaPct.toFixed(1).replace('.', ',')}%` : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={rotulo}>Data do leilão *</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
            </div>
            <div className="space-y-1.5">
              <label className={rotulo}>Horário do leilão *</label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={rotulo}>Lance de entrada (R$)</label>
              <input
                type="number"
                value={lance}
                onChange={(e) => setLance(e.target.value)}
                className={campo}
              />
              <p className="text-[11px] text-gray-500">Sugerido: {brl(custoTotal)}</p>
            </div>
            <div className="space-y-1.5">
              <label className={rotulo}>Frete (R$)</label>
              <input
                type="number"
                value={frete}
                onChange={(e) => setFrete(e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={rotulo}>Vagas (opcional)</label>
            <input
              type="number"
              value={vagas}
              onChange={(e) => setVagas(e.target.value)}
              placeholder="Deixe vazio para sem limite"
              className={campo}
            />
          </div>

          <div className="space-y-1.5">
            <label className={rotulo}>Observação para o parceiro (opcional)</label>
            <textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: retirada em Fco. da Rocha, lote completo com nota."
              className={campo}
            />
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-xl border border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{erro}</p>
            </div>
          )}
        </div>

        <div
          className="flex gap-3 border-t border-gray-700 px-5 py-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onFechar}
            className="min-h-[44px] flex-1 rounded-xl border border-gray-600 text-sm font-bold text-gray-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={confirmar}
            className="min-h-[44px] flex-1 rounded-xl bg-amber-600 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-60"
          >
            {salvando ? 'Publicando...' : 'Publicar oportunidade'}
          </button>
        </div>
      </div>
    </div>
  );
}