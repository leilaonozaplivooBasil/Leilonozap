import React from 'react';
import { Gavel } from 'lucide-react';
import { situacaoDoLeilaoDoBanner } from '@/lib/bannerDoLeilao';
import { rotuloDeData } from '@/lib/janelaDoBanner';

// 🏁 "Leilão ligado" de UM banner (08/10/2026). Dono: "quando o leilão de um produto encerrar,
// o banner dele já tem que sair". Escolhido o leilão, o banner sai sozinho no segundo em que ele
// acaba (a tela vigia o horário) e o banco o desliga de vez ao encerrar. Regras em
// src/lib/bannerDoLeilao.js.

export const AVISO_SEM_VINCULO = 'Ligar o banner a um leilão está indisponível: falta aplicar a atualização do banco.';

const COR = {
  leilao_no_ar: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  leilao_agendado: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  leilao_encerrou: 'text-gray-400 border-white/15 bg-white/5',
  leilao_sumiu: 'text-gray-400 border-white/15 bg-white/5',
  leilao_desconhecido: 'text-gray-300 border-white/15 bg-white/5',
};

const CAMPO = 'h-8 w-full rounded-md border border-white/10 bg-gray-800 px-2 text-xs text-gray-200 disabled:opacity-50';

/** A lista de leilões para escolher (a do próprio leilão já ligado entra mesmo se encerrado). */
export function SeletorDeLeilao({ valor, leiloes, mapa, onChange, desabilitado = false, dataCampo = 'leilao-do-banner' }) {
  const lista = Array.isArray(leiloes) ? leiloes : [];
  const atual = valor && !lista.some((l) => l.id === valor) ? mapa?.[valor] : null;
  return (
    <select
      value={valor || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={desabilitado}
      data-campo={dataCampo}
      className={CAMPO}
    >
      <option value="">Nenhum — fica até eu desligar</option>
      {valor && !lista.some((l) => l.id === valor) && (
        <option value={valor}>{atual?.title ? `(encerrado) ${atual.title}` : 'Leilão ligado (não está mais na lista)'}</option>
      )}
      {lista.map((l) => (
        <option key={l.id} value={l.id}>
          {String(l.title || l.id).trim()}{l.status === 'scheduled' ? ' · agendado' : ''}
        </option>
      ))}
    </select>
  );
}

export default function LeilaoDoBanner({ banner, leiloes, mapa, agoraMs, suporta = true, onSalvar }) {
  const id = String(banner?.auction_id || '').trim();
  const leilao = id ? (id in (mapa || {}) ? mapa[id] : undefined) : undefined;
  const s = situacaoDoLeilaoDoBanner(banner, leilao, agoraMs);
  const fim = leilao && leilao.status === 'active' && leilao.end_time ? rotuloDeData(leilao.end_time) : '';

  if (!suporta) {
    return (
      <div className="px-2.5 pb-2.5 bg-gray-900/60" data-teste="leilao-do-banner">
        <p className="text-[11px] text-amber-300/90">{AVISO_SEM_VINCULO}</p>
      </div>
    );
  }

  return (
    <div className="px-2.5 pb-2.5 bg-gray-900/60" data-teste="leilao-do-banner">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300 mb-1">
        <Gavel className="w-3.5 h-3.5 text-cyan-300" /> Leilão ligado
      </label>
      <SeletorDeLeilao valor={id} leiloes={leiloes} mapa={mapa} onChange={(v) => onSalvar(v || null)} />
      {s && (
        <p data-estado-leilao={s.estado} className={`mt-1.5 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${COR[s.estado]}`}>
          {s.texto}{fim ? ` (${fim})` : ''}
        </p>
      )}
      {!id && <p className="mt-1 text-[10px] text-gray-500">Escolha o leilão deste produto e o banner sai sozinho quando ele encerrar.</p>}
    </div>
  );
}
