import React from 'react';
import { Gift, Users, Radio } from 'lucide-react';

// FEATURE 7 — Prêmio do dia ANTES do cadastro.
// Mostra foto + nome + valor do prêmio no topo da página pra criar desejo antes de pedir dados.
// Não faz fetch próprio: recebe a config que a página já carrega (e repolla a cada 15s) do /api/concurso.
// Só aparece quando o admin configurou um produto no painel (produto_nome).

const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// Horário do sorteio = horário da live (18h). O sorteio acontece na live.
function horarioSorteio(config) {
  const raw = String(config?.live_horario || '').trim();
  if (!raw) return '18h';
  const m = raw.match(/(\d{1,2})(?::(\d{2}))?\s*h?/);
  if (!m) return raw;
  return m[2] && m[2] !== '00' ? `${m[1]}h${m[2]}` : `${m[1]}h`;
}

export default function HeroDailyPrize({ config, registered, total, onShare }) {
  // Prioridade: produto_principal (objeto novo) → produto_nome/foto/valor (campos antigos) → 1º produto do dia.
  const diaArr = Array.isArray(config?.produtos_dia) ? config.produtos_dia : [];
  const primeiroDia = diaArr[0];
  const pp = config?.produto_principal || {};
  const nome = pp.nome || config?.produto_nome || primeiroDia?.nome || '';
  const foto = pp.foto || config?.produto_foto || primeiroDia?.foto || '';
  const valor = pp.valor || config?.produto_valor || primeiroDia?.valor || 0;
  if (!nome) return null;
  const hora = horarioSorteio(config);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const cta = () => {
    if (registered && onShare) { onShare(); return; }
    scrollTo(registered ? 'meu-painel' : 'cadastro-form');
  };

  return (
    <section className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(245,196,81,.35)', background: 'linear-gradient(160deg, rgba(245,196,81,.10), rgba(34,197,94,.05) 40%, rgba(0,0,0,.25))' }}>
      <div className="grid md:grid-cols-2 gap-6 items-center p-5 sm:p-8">
        {/* Texto + CTA */}
        <div className="space-y-4 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,196,81,.12)', border: '1px solid rgba(245,196,81,.4)' }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
            </span>
            <span className="text-yellow-300 text-[11px] font-black uppercase tracking-widest">Prêmio diário ativo</span>
          </div>

          <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(1.4rem,4.5vw,2.1rem)' }}>
            Indique amigos e ganhe o{' '}
            <span style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>prêmio de hoje</span>
          </h2>

          <p className="text-green-100/85 text-sm">
            {config.produto_desc ? `${config.produto_desc} ` : 'Quem traz mais gente pro grupo concorre. '}
            Sorteio hoje às <b className="text-white">{hora}</b>.
          </p>

          <p className="text-green-100/75 text-xs flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            Para receber o produto, entre na live — <b className="text-white">todo dia às 18h</b>
          </p>

          <div className="flex flex-wrap gap-3 items-stretch">
            {valor > 0 && (
              <div className="px-4 py-2.5 rounded-2xl" style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.12)' }}>
                <span className="block text-[10px] uppercase tracking-wide text-green-300/70 font-mono">Valor do prêmio</span>
                <span className="text-xl font-black text-yellow-300">{money(valor)}</span>
              </div>
            )}
            <button
              onClick={cta}
              className="px-6 py-3 rounded-2xl font-black text-base text-[#052e16] uppercase tracking-wide transition-transform active:scale-[.97] hover:scale-[1.02]"
              style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)', boxShadow: '0 10px 30px rgba(34,197,94,.25)' }}
            >
              {registered ? 'Divulgar meu link →' : 'Participar grátis →'}
            </button>
          </div>

          {total > 0 && (
            <p className="text-[11px] text-green-300/60 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> {total} pessoas já estão concorrendo
            </p>
          )}
        </div>

        {/* Card do produto — produto principal do sorteio */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-xs rounded-3xl p-5 transition-transform hover:scale-[1.02]" style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(245,196,81,.3)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-yellow-300/80 mb-2 text-center">Produto principal do sorteio</p>
            <span className="absolute -top-3 -right-2 rotate-12 text-[11px] font-black px-3.5 py-1.5 rounded-full text-[#052e16]" style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)' }}>GRÁTIS</span>
            <div className="h-52 sm:h-60 grid place-items-center">
              {foto ? (
                <img src={foto} alt={nome} className="max-h-full max-w-full object-contain drop-shadow-2xl" />
              ) : (
                <Gift className="w-20 h-20 text-yellow-300/70" />
              )}
            </div>
            <div className="mt-4 text-center">
              <h3 className="font-extrabold text-lg leading-snug">{nome}</h3>
              <p className="text-xs text-green-300/70 mt-1">Sorteio hoje às {hora} · ao vivo</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}