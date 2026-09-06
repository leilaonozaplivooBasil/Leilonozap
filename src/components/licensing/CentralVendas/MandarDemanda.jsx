import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { nomeBonito } from '@/lib/relatorioExecutivo';

// 📤 MANDAR UMA DEMANDA — a linha única de "demanda pra alguém" (dono, 06/09/2026:
// "o que tiver duplicado, junta — exemplo: enviar demanda").
//
// Antes eram duas linhas iguais escritas duas vezes: a "demanda que surgiu na
// hora" do Encontro e o "mandar uma demanda" do Painel Corporativo. Agora é
// este componente nos dois lugares. Ele só DESENHA e avisa (onMandar); quem
// grava é o pai — no Encontro a demanda sai ligada ao encontro (origem
// `encontro`), no painel sai do CEO ou de um diretor.

const campo = 'rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] text-white outline-none focus:border-white/40';

export default function MandarDemanda({ valor, onChange, onMandar, time = [], prazoPadrao, placeholder = 'mandar uma demanda…', legenda = null, opcaoVazia = null, rotuloBotao = 'mandar', desabilitado = false, prefixoTeste = 'nova-demanda', testeCaixa = 'mandar-demanda', testeBotao = null }) {
  const muda = (parte) => onChange({ ...valor, ...parte });
  const pronto = !!valor.titulo?.trim() && (!!valor.pessoa || !opcaoVazia);
  return (
    <div className="mt-2 rounded-lg border border-dashed border-white/15 px-2.5 py-2 flex items-center gap-2 flex-wrap" data-teste={testeCaixa}>
      <Send className="w-3 h-3 text-white/40 shrink-0" />
      {legenda && <span className="text-[10px] text-white/35">{legenda}</span>}
      <Input value={valor.titulo || ''} onChange={(ev) => muda({ titulo: ev.target.value })} onKeyDown={(ev) => { if (ev.key === 'Enter' && pronto && !desabilitado) onMandar(); }} placeholder={placeholder} className="h-7 flex-1 min-w-[180px] border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste={`${prefixoTeste}-titulo`} />
      <select value={valor.pessoa || ''} onChange={(ev) => muda({ pessoa: ev.target.value })} className={campo} data-teste={`${prefixoTeste}-pessoa`}>
        {opcaoVazia && <option value="">{opcaoVazia}</option>}
        {time.map((p) => <option key={p.id} value={p.id}>{nomeBonito(p.nome)}{p.funcaoCurta ? ` · ${p.funcaoCurta}` : ''}</option>)}
      </select>
      <input type="date" value={valor.prazo || prazoPadrao || ''} onChange={(ev) => muda({ prazo: ev.target.value })} className={campo} data-teste={`${prefixoTeste}-prazo`} />
      <Button size="sm" onClick={onMandar} disabled={desabilitado || !pronto} className="bg-white/10 hover:bg-white/20 text-white h-7 text-[11px]" data-teste={testeBotao || `${prefixoTeste}-mandar`}>{rotuloBotao}</Button>
    </div>
  );
}
