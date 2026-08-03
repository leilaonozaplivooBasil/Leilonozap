import React from 'react';
import { Gift, Users, Radio } from 'lucide-react';

// FEATURE 7 — Prêmio do dia ANTES do cadastro (tema claro).
// Mostra foto + nome + valor do prêmio pra criar desejo antes de pedir dados.
// Não faz fetch próprio: recebe a config que a página já carrega do /api/concurso.

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
    <section className="rounded-3xl overflow-hidden bg-white border border-nz-borda">
      <div className="grid md:grid-cols-2 gap-6 items-center p-5 sm:p-8">
        {/* Texto + CTA */}
        <div className="space-y-4 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nz-ouro-fundo border border-nz-ouro-claro">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nz-ouro-claro opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-nz-ouro-claro" />
            </span>
            <span className="text-nz-ouro text-[11px] font-black uppercase tracking-widest">Prêmio diário ativo</span>
          </div>

          <h2 className="font-black leading-tight text-nz-tinta" style={{ fontSize: 'clamp(1.4rem,4.5vw,2.1rem)' }}>
            Indique amigos e ganhe o <span className="text-nz-verde">prêmio de hoje</span>
          </h2>

          <p className="text-nz-tinta-fraca text-sm">
            {config.produto_desc ? `${config.produto_desc} ` : 'Quem traz mais gente pro grupo concorre. '}
            Sorteio hoje às <b className="text-nz-tinta">{hora}</b>.
          </p>

          <p className="text-nz-tinta-fraca text-xs flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-livoo-rosa shrink-0" />
            Para receber o produto, entre na live — <b className="text-nz-tinta">todo dia às 18h</b>
          </p>

          <div className="flex flex-wrap gap-3 items-stretch">
            {valor > 0 && (
              <div className="px-4 py-2.5 rounded-2xl bg-nz-ouro-fundo border border-nz-ouro-claro">
                <span className="block text-[10px] uppercase tracking-wide text-nz-tinta-fraca font-mono">Valor do prêmio</span>
                <span className="text-xl font-black text-nz-ouro">{money(valor)}</span>
              </div>
            )}
            <button
              onClick={cta}
              className="px-6 py-3 rounded-full font-black text-base text-white uppercase tracking-wide bg-nz-verde hover:bg-nz-verde-claro transition-colors active:scale-[.97]"
            >
              {registered ? 'Divulgar meu link →' : 'Participar grátis →'}
            </button>
          </div>

          {total > 0 && (
            <p className="text-[11px] text-nz-tinta-fraca flex items-center gap-1.5">
              <Users className="w-3 h-3" /> {total} pessoas já estão concorrendo
            </p>
          )}
        </div>

        {/* Card do produto — produto principal do sorteio */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-xs rounded-3xl p-5 bg-nz-cinza-fundo border border-nz-borda">
            <p className="text-[10px] font-bold uppercase tracking-wide text-nz-ouro mb-2 text-center">Produto principal do sorteio</p>
            <span className="absolute -top-3 -right-2 rotate-12 text-[11px] font-black px-3.5 py-1.5 rounded-full text-white bg-nz-verde">GRÁTIS</span>
            <div className="h-44 sm:h-52 md:h-60 grid place-items-center">
              {foto ? (
                <img src={foto} alt={nome} className="max-h-full max-w-full object-contain" />
              ) : (
                <Gift className="w-20 h-20 text-nz-ouro-claro" />
              )}
            </div>
            <div className="mt-4 text-center">
              <h3 className="font-extrabold text-lg leading-snug text-nz-tinta">{nome}</h3>
              <p className="text-xs text-nz-tinta-fraca mt-1">Sorteio hoje às {hora} · ao vivo</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}