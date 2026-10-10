import React, { useState, useEffect, useRef, useCallback } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check, X, Undo2, Pause } from 'lucide-react';

// 📝 REVISAR DESCRIÇÕES (10/10/2026) — a IA escreve RASCUNHO, o dono aprova.
// Regras e proteções: src/lib/descricaoDoProduto.js e api/functions/descricoesEmLote.js.
// Fluxo: ver quem precisa → gerar rascunhos (um por vez, devagar) → conferir → aprovar.
// Nada vai para a vitrine sem aprovar; cada aprovação guarda o texto anterior e tem "Desfazer".

const PAUSA_ENTRE_ITENS_MS = 3000;
const FALHAS_SEGUIDAS_PARA_PARAR = 3;
const TESTE = 10;

const NIVEL = { vazia: 'sem descrição', interna: 'só texto interno do lote', so_o_nome: 'só repete o nome', curta: 'descrição curta', boa: 'boa' };
const MOTIVO = {
  ia_indisponivel: 'A IA está indisponível agora (chave ou crédito).',
  ia_falhou: 'A IA não respondeu.',
  ia_sem_texto: 'A IA devolveu um texto inválido.',
  curto_demais: 'O texto saiu curto demais.', longo_demais: 'O texto saiu longo demais.',
  veio_html: 'O texto veio com código.', 'cita preço': 'O texto citava preço.', 'tem link': 'O texto tinha link.',
  'promete garantia': 'O texto prometia garantia.', 'fala de frete': 'O texto falava de frete.', 'fala de desconto': 'O texto falava de desconto.',
  'cita origem interna': 'O texto citava a origem do lote.', 'promete nota fiscal': 'O texto prometia nota fiscal.',
  chutou_estado: 'O texto afirmava um estado que o cadastro não confirma.',
  mudou_depois_do_rascunho: 'Alguém editou a descrição depois do rascunho — gere de novo.',
  nao_e_rascunho: 'Esse rascunho já foi decidido.', item_sumiu: 'O item não existe mais.', nao_gravou: 'Não consegui gravar.',
  sem_nome: 'O item não tem nome.', nao_encontrado: 'Item não encontrado.', erro: 'Erro inesperado.',
};
const motivoDe = (m) => MOTIVO[m] || String(m || 'erro');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// a banca de teste encurta a pausa (window.__pausaDescricoesMs); em produção é sempre PAUSA_ENTRE_ITENS_MS
const pausa = () => (typeof window !== 'undefined' && Number.isFinite(window.__pausaDescricoesMs) ? window.__pausaDescricoesMs : PAUSA_ENTRE_ITENS_MS);

export default function RevisaoDeDescricoes() {
  const [usuario, setUsuario] = useState(null);
  const [alvo, setAlvo] = useState('produtos');
  const [fila, setFila] = useState(null);
  const [contagem, setContagem] = useState(null);
  const [total, setTotal] = useState(0);
  const [rascunhos, setRascunhos] = useState([]);
  const [editados, setEditados] = useState({});
  const [aprovadas, setAprovadas] = useState([]);
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, de: 0, erros: [] });
  const parar = useRef(false);

  useEffect(() => { plataforma.auth.me().then(setUsuario).catch(() => setUsuario(null)); }, []);

  const chamar = useCallback(async (corpo) => {
    const r = await plataforma.functions.invoke('descricoesEmLote', { ...corpo, actorId: usuario?.id });
    return r || { ok: false, motivo: 'erro' };
  }, [usuario?.id]);

  const carregar = useCallback(async () => {
    if (!usuario?.id) return;
    const [f, r] = await Promise.all([chamar({ action: 'fila', alvo }), chamar({ action: 'rascunhos', alvo })]);
    if (f.ok) { setFila(f.fila); setContagem(f.contagem); setTotal(f.total); } else toast.error('Não consegui ler a fila.');
    if (r.ok) setRascunhos(r.rascunhos);
  }, [usuario?.id, alvo, chamar]);

  useEffect(() => { setFila(null); setRascunhos([]); setAprovadas([]); carregar(); }, [carregar]);

  const gerarLote = async (limite) => {
    const alvos = (fila || []).filter((i) => !i.tem_rascunho).slice(0, limite);
    if (!alvos.length) { toast.info('Nada para gerar: todos já têm rascunho.'); return; }
    parar.current = false;
    setRodando(true);
    setProgresso({ feitos: 0, de: alvos.length, erros: [] });
    let seguidas = 0;
    for (let i = 0; i < alvos.length; i += 1) {
      if (parar.current) break;
      const it = alvos[i];
      let r;
      try { r = await chamar({ action: 'gerar', alvo, id: it.id }); } catch { r = { ok: false, motivo: 'erro' }; }
      if (r.ok) {
        seguidas = 0;
        setRascunhos((lista) => [r.rascunho, ...lista.filter((x) => x.alvo_id !== it.id)]);
        setFila((lista) => (lista || []).map((x) => (x.id === it.id ? { ...x, tem_rascunho: true } : x)));
        setProgresso((p) => ({ ...p, feitos: p.feitos + 1 }));
      } else {
        seguidas += 1;
        setProgresso((p) => ({ ...p, feitos: p.feitos + 1, erros: [...p.erros, { nome: it.nome, motivo: motivoDe(r.motivo) }] }));
        // sem IA: não adianta insistir; falhas seguidas: algo está errado — para e avisa
        if (r.motivo === 'ia_indisponivel' || seguidas >= FALHAS_SEGUIDAS_PARA_PARAR) {
          toast.error(r.motivo === 'ia_indisponivel' ? motivoDe(r.motivo) : 'Parei: falhou várias vezes seguidas. Confira a IA e continue depois.');
          break;
        }
      }
      if (i < alvos.length - 1) await espera(pausa());
    }
    setRodando(false);
  };

  const decidir = async (acao, ids) => {
    const textos = Object.fromEntries(ids.filter((id) => typeof editados[id] === 'string').map((id) => [id, editados[id]]));
    const r = await chamar({ action: acao, ids, ...(acao === 'aprovar' ? { textos } : {}) });
    if (!r.ok) { toast.error('Não consegui concluir.'); return; }
    if (acao === 'aprovar') {
      const ok = (r.resultado || []).filter((x) => x.ok).map((x) => x.id);
      (r.resultado || []).filter((x) => !x.ok).forEach((x) => toast.error(motivoDe(x.motivo)));
      setAprovadas((a) => [...a, ...rascunhos.filter((d) => ok.includes(d.id))]);
      setRascunhos((l) => l.filter((d) => !ok.includes(d.id)));
      if (ok.length) toast.success(ok.length === 1 ? 'Descrição aprovada e no ar.' : `${ok.length} descrições aprovadas e no ar.`);
    } else {
      setRascunhos((l) => l.filter((d) => !ids.includes(d.id)));
    }
    carregar();
  };

  const desfazer = async (d) => {
    const r = await chamar({ action: 'desfazer', id: d.id });
    if (r.ok) { setAprovadas((a) => a.filter((x) => x.id !== d.id)); toast.success('Voltou a descrição anterior.'); carregar(); } else toast.error(motivoDe(r.motivo));
  };

  if (!usuario) return <div className="p-8 text-gray-500">Carregando…</div>;

  const pendentes = (fila || []).filter((i) => !i.tem_rascunho).length;

  return (
    <div className="min-h-screen bg-slate-50"><div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5" data-teste="revisao-de-descricoes">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-600" /> Revisar descrições</h1>
        <p className="text-sm text-gray-600 mt-1">A IA escreve um rascunho a partir do nome, das fotos e dos dados do cadastro. <b>Nada vai para a vitrine sem a sua aprovação</b>, e cada aprovação pode ser desfeita.</p>
      </div>

      <div className="flex gap-2">
        {[['produtos', 'Loja'], ['leiloes', 'Leilões']].map(([v, r]) => (
          <button key={v} type="button" onClick={() => !rodando && setAlvo(v)} data-teste={`aba-${v}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${alvo === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300'}`}>{r}</button>
        ))}
      </div>

      {contagem && (
        <div className="rounded-xl border border-gray-200 bg-white p-4" data-teste="resumo">
          <p className="text-sm text-gray-700 mb-2"><b>{total}</b> {alvo === 'produtos' ? 'produtos na loja' : 'leilões no ar ou agendados'}:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(NIVEL).map(([k, rot]) => (
              <span key={k} data-nivel={k} className={`px-2 py-1 rounded-md border ${k === 'boa' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>{contagem[k] || 0} · {rot}</span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3" data-teste="comandos">
        <p className="text-sm text-gray-700"><b>{pendentes}</b> para gerar. Um por vez, com pausa de {PAUSA_ENTRE_ITENS_MS / 1000}s entre eles; para sozinho se a IA falhar {FALHAS_SEGUIDAS_PARA_PARAR} vezes seguidas.</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={rodando || !pendentes} onClick={() => gerarLote(TESTE)} variant="outline" data-teste="gerar-teste">Testar com {TESTE} (só rascunhos)</Button>
          <Button disabled={rodando || !pendentes} onClick={() => gerarLote(Infinity)} className="bg-emerald-600 hover:bg-emerald-700" data-teste="gerar-todos">Gerar todos, um por um</Button>
          {rodando && <Button variant="outline" onClick={() => { parar.current = true; }} data-teste="pausar"><Pause className="w-4 h-4 mr-1" /> Pausar</Button>}
        </div>
        {(rodando || progresso.de > 0) && (
          <div data-teste="progresso">
            <div className="h-2 rounded bg-gray-200 overflow-hidden"><div className="h-2 bg-emerald-500 transition-all" style={{ width: `${progresso.de ? Math.round((progresso.feitos / progresso.de) * 100) : 0}%` }} /></div>
            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">{rodando && <Loader2 className="w-3 h-3 animate-spin" />}{progresso.feitos} de {progresso.de}{progresso.erros.length ? ` · ${progresso.erros.length} sem rascunho` : ''}</p>
            {progresso.erros.slice(-5).map((e, i) => <p key={i} className="text-xs text-amber-800">• {e.nome}: {e.motivo}</p>)}
          </div>
        )}
      </div>

      {rascunhos.length > 0 && (
        <div className="space-y-3" data-teste="rascunhos">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-gray-900">Para você conferir ({rascunhos.length})</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decidir('aprovar', rascunhos.map((d) => d.id))} className="bg-emerald-600 hover:bg-emerald-700" data-teste="aprovar-todos"><Check className="w-4 h-4 mr-1" /> Aprovar todos</Button>
            </div>
          </div>
          {rascunhos.map((d) => (
            <div key={d.id} data-rascunho={d.alvo_id} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-gray-900 text-sm">{d.nome}</p>
                <span className="text-[11px] text-gray-500">antes: {NIVEL[d.nivel_anterior] || '—'} · {d.fotos} foto{d.fotos === 1 ? '' : 's'} lida{d.fotos === 1 ? '' : 's'}</span>
              </div>
              {d.anterior ? <p className="text-xs text-gray-500 line-clamp-2">Hoje: {d.anterior}</p> : null}
              <Textarea value={editados[d.id] ?? d.texto} onChange={(e) => setEditados((m) => ({ ...m, [d.id]: e.target.value }))} rows={5} className="text-sm" data-campo="texto" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decidir('aprovar', [d.id])} className="bg-emerald-600 hover:bg-emerald-700" data-teste="aprovar"><Check className="w-4 h-4 mr-1" /> Aprovar</Button>
                <Button size="sm" variant="outline" onClick={() => decidir('rejeitar', [d.id])} data-teste="rejeitar"><X className="w-4 h-4 mr-1" /> Rejeitar</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aprovadas.length > 0 && (
        <div className="space-y-2" data-teste="aprovadas">
          <h2 className="font-bold text-gray-900">Aprovadas agora ({aprovadas.length})</h2>
          {aprovadas.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              <span className="text-emerald-900 truncate">{d.nome}</span>
              <Button size="sm" variant="outline" onClick={() => desfazer(d)} data-teste="desfazer"><Undo2 className="w-4 h-4 mr-1" /> Desfazer</Button>
            </div>
          ))}
        </div>
      )}

      {fila && fila.length > 0 && (
        <details className="rounded-xl border border-gray-200 bg-white p-3">
          <summary className="text-sm font-semibold text-gray-800 cursor-pointer">Ver a fila ({fila.length})</summary>
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {fila.map((i) => (
              <li key={i.id} className="py-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-gray-800">{i.nome}</span>
                <span className="text-[11px] text-gray-500 whitespace-nowrap">{NIVEL[i.nivel]}{i.tem_rascunho ? ' · rascunho pronto' : ''}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
    </div>
  );
}
