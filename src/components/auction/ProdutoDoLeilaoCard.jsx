import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Package, Loader2, Link as LinkIcon, Save, Download, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import CampoDeVideo from '@/components/catalog/CampoDeVideo';
import { videosValidos } from '@/lib/videoDoProduto';
import { normalizarMedidas, caixaDoFrete, resumoDaCaixa, textoDoCampo, rotulo, CAMPOS_MEDIDA, ORIGENS_MEDIDA } from '@/lib/medidasDoProduto';
import { trazerFotosParaNosso } from '@/lib/fotosParaNosso';

/**
 * ProdutoDoLeilaoCard — produto, medidas e vídeo DENTRO do editor do leilão.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUE ESTE CARD EXISTE (08/10/2026, DIR-207)
 * ══════════════════════════════════════════════════════════════════════════
 * Dono: "inseri vídeo que não está disponível quando clico no botão editar".
 * O editor do leilão (EditAuction) grava SÓ em `auctions`. Mas o vídeo, as
 * medidas e o peso vivem em `products`, ligados por `auctions.product_id` —
 * é de lá que a sala do leilão lê o vídeo (useVideoDoLote) e que o frete lê
 * a caixa (api/_lib/frete.js). Quem abria "Editar" não via nada disso, e o
 * frete cotava a caixa padrão (0,3 kg · 16×11×4) em silêncio: medido antes,
 * 7 leilões ativos sem produto e 43 com produto sem medida.
 *
 * Este card fala com UMA rota, `salvarProdutoDoLeilao`, que lê e grava o
 * produto do leilão (e o CRIA e vincula quando o leilão nasceu sem produto).
 * A régua do que é medida válida é src/lib/medidasDoProduto.js — a mesma da
 * gestão de produtos e do servidor. Aqui é só a tela.
 *
 * 🔴 NUNCA mexe em preço. Importar pelo link traz descrição, medidas e fotos;
 * preço de leilão com lance é sagrado.
 *
 * O pai chama `ref.current.salvarSePendente()` ANTES de gravar o leilão: se
 * a pessoa só mexeu nas medidas e clicou "Salvar Alterações", nada se perde.
 * E a falha aqui NUNCA bloqueia o salvar do leilão — volta {ok:false, erro}.
 */

// 🎨 Mesmos tokens visuais do editor (podem vir por props; estes são o padrão).
const CARD_STYLE_PADRAO = { background: 'linear-gradient(160deg, rgba(26,34,48,0.92) 0%, rgba(16,21,30,0.97) 60%)', boxShadow: '0 10px 36px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' };
const INPUT_CLS_PADRAO = 'bg-[#0d1117]/80 border-white/10 text-white h-11 rounded-xl focus:border-amber-500/60 focus-visible:ring-1 focus-visible:ring-amber-500/30 transition-colors';
const LABEL_CLS_PADRAO = 'text-[10px] uppercase tracking-widest text-slate-500 font-bold';

const CAMPOS_VAZIOS = Object.freeze({ peso: '', altura: '', largura: '', comprimento: '' });

/** actor_id = quem está logado (mesma leitura que AddCatalogProduct faz). */
function quemSouEu() {
  try { return JSON.parse(localStorage.getItem('currentUser') || 'null')?.id || null; } catch { return null; }
}

/** Texto dos 4 campos a partir do produto gravado (null → ''). */
function camposDoProduto(produto) {
  const c = { ...CAMPOS_VAZIOS };
  for (const k of CAMPOS_MEDIDA) c[k] = textoDoCampo(produto?.[k]);
  return c;
}

function dataCurta(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch { return ''; }
}

// A rota pode não existir ainda (adapter devolve {ok:false, error:'not_implemented'}).
function recadoDoServidor(d) {
  const e = d?.error;
  if (e === 'not_implemented' || e === 'network_or_not_implemented') return 'A rota do servidor não respondeu. Tente de novo em instantes.';
  return e || 'O servidor recusou a gravação.';
}

const ProdutoDoLeilaoCard = forwardRef(function ProdutoDoLeilaoCard(
  { auctionId, auction, titulo = '', descricaoAtual = '', imageUrls = [], onDescricao, onFotos, onProdutoVinculado, cardStyle, inputCls, labelCls },
  ref,
) {
  const CARD_STYLE = cardStyle || CARD_STYLE_PADRAO;
  const INPUT_CLS = inputCls || INPUT_CLS_PADRAO;
  const LABEL_CLS = labelCls || LABEL_CLS_PADRAO;

  const [carregando, setCarregando] = useState(true);
  const [produto, setProduto] = useState(null);
  const [campos, setCampos] = useState(CAMPOS_VAZIOS);
  const [origem, setOrigem] = useState(null);          // 'manual' | 'pagina' | 'estimativa_ia' | null
  const [medidasEm, setMedidasEm] = useState(null);
  const [videoUrls, setVideoUrls] = useState([]);
  const [pendente, setPendente] = useState(false);     // mexeu em medida/vídeo e ainda não gravou
  const [salvando, setSalvando] = useState(false);
  const [avisosServidor, setAvisosServidor] = useState([]);

  // Importar pelo link
  const [urlImport, setUrlImport] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [sel, setSel] = useState({ descricao: false, medidas: false, fotos: false });
  const [aplicando, setAplicando] = useState(false);

  // product_id do leilão fica num ref: o efeito de carga depende SÓ do auctionId.
  // Se dependesse de auction.product_id, o vínculo criado no salvar disparava
  // uma recarga por cima do que a pessoa estava digitando.
  const productIdRef = useRef(auction?.product_id || null);
  useEffect(() => { productIdRef.current = auction?.product_id || null; }, [auction?.product_id]);

  const aplicarProduto = useCallback((p) => {
    setProduto(p || null);
    setCampos(camposDoProduto(p));
    setOrigem(p?.medidas_origem || null);
    setMedidasEm(p?.medidas_em || null);
    setVideoUrls(Array.isArray(p?.video_urls) ? p.video_urls.filter(Boolean) : []);
    setPendente(false);
  }, []);

  // (f) Carrega com acao 'ler'. Se a rota falhar, cai para Product.filter (como
  // useVideoDoLote) para ao menos MOSTRAR o que está gravado.
  useEffect(() => {
    if (!auctionId) { setCarregando(false); return undefined; }
    let vivo = true;
    (async () => {
      setCarregando(true);
      let p = null;
      let leu = false;
      try {
        const r = await plataforma.functions.invoke('salvarProdutoDoLeilao', { actor_id: quemSouEu(), auction_id: auctionId, acao: 'ler' });
        const d = r?.data || r;
        if (d?.ok) { leu = true; p = d.produto || null; }
      } catch { /* cai no plano B abaixo */ }
      if (!leu && productIdRef.current) {
        try {
          const achados = await plataforma.entities.Product.filter({ id: productIdRef.current });
          p = Array.isArray(achados) ? achados[0] || null : null;
        } catch { p = null; }
      }
      if (!vivo) return;
      aplicarProduto(p);
      setUrlImport((atual) => atual || p?.source_url || auction?.source_url || '');
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [auctionId, aplicarProduto]);

  // Avisos de faixa AO VIVO e a caixa que o frete vai usar com o que está digitado.
  const { avisos } = normalizarMedidas(campos);
  const caixa = caixaDoFrete(campos);

  const mudarCampo = (campo, valor) => {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
    setOrigem('manual');   // digitou → é medida informada à mão, seja qual fosse a origem antes
    setPendente(true);
    setAvisosServidor([]);
  };

  const mudarVideo = (lista) => {
    setVideoUrls(Array.isArray(lista) ? lista : []);
    setPendente(true);
    setAvisosServidor([]);
  };

  // (e) Grava em products via acao 'salvar'. Só medidas, origem e vídeo — NUNCA preço.
  // `gravar` recebe os campos e a origem por parâmetro (o botão de 1 clique grava
  // o que acabou de importar sem esperar o estado do React); `salvar` é o botão.
  const gravar = useCallback(async (camposX, origemX) => {
    if (!auctionId) return { ok: false, erro: 'Leilão sem id.' };
    const actor = quemSouEu();
    if (!actor) return { ok: false, erro: 'Sessão não encontrada — entre de novo.' };
    setSalvando(true);
    setAvisosServidor([]);
    try {
      const { valores, avisos: foraDaFaixa } = normalizarMedidas(camposX);
      // 🔴 08/10/2026 DIR-207 — medida fora da faixa NÃO vai ao servidor como
      // null: a régua descarta o número, o servidor gravaria "sem medida", a
      // tela diria "Produto salvo" e o campo continuaria mostrando 1500. É o
      // "salvou mas não salvou" em outra roupa. Mesma regra da gestão de
      // produtos: com aviso na tela, nada é gravado até a pessoa corrigir.
      if (foraDaFaixa.length) {
        setAvisosServidor(['Nada foi salvo: corrija as medidas fora da faixa.', ...foraDaFaixa]);
        return { ok: false, erro: foraDaFaixa.join(' ') };
      }
      const r = await plataforma.functions.invoke('salvarProdutoDoLeilao', {
        actor_id: actor,
        auction_id: auctionId,
        acao: 'salvar',
        medidas: valores,
        medidas_origem: origemX || 'manual',
        video_urls: videosValidos(videoUrls),
      });
      const d = r?.data || r;
      if (!d?.ok) {
        const lista = Array.isArray(d?.avisos) && d.avisos.length ? d.avisos : [recadoDoServidor(d)];
        setAvisosServidor(lista);
        return { ok: false, erro: lista.join(' ') };
      }
      const p = d.produto || { ...(produto || {}), id: d.product_id, ...valores, medidas_origem: origemX || 'manual', video_urls: videosValidos(videoUrls) };
      setProduto(p);
      setOrigem(p.medidas_origem || origemX || 'manual');
      setMedidasEm(p.medidas_em || new Date().toISOString());
      setPendente(false);
      if (d.criado && d.product_id) onProdutoVinculado?.(d.product_id);
      toast({ title: d.criado ? 'Produto criado e vinculado ao leilão' : 'Produto salvo', description: 'Medidas e vídeo gravados.', duration: 1500 });
      // o servidor gravou, mas avisa (ex.: link de vídeo recusado) — a pessoa precisa ver
      if (Array.isArray(d.avisos) && d.avisos.length) toast({ title: 'Salvo com avisos', description: d.avisos.join(' '), duration: 2500 });
      return { ok: true };
    } catch (e) {
      console.error('Erro ao salvar produto do leilão:', e);
      const erro = e?.message || 'Falha ao gravar o produto.';
      setAvisosServidor([erro]);
      return { ok: false, erro };
    } finally {
      setSalvando(false);
    }
  }, [auctionId, videoUrls, produto, onProdutoVinculado]);
  const salvar = useCallback(() => gravar(campos, origem), [gravar, campos, origem]);

  // ⚡ ATUALIZAR MEDIDAS PARA O FRETE — 1 CLIQUE (dono, 08/10/2026: "um botão de
  // atualizar medidas dentro do editar para puxar e escrever as medidas certas
  // para entrega via Melhor Envio"). Puxa pelo link do produto (o colado, o do
  // produto ou o do leilão); sem link, a IA estima pelo nome. Grava NA HORA no
  // produto, com a origem: 'pagina' (lido da ficha) ou 'estimativa_ia'
  // (conferir). Fora da faixa não grava: fica no campo com o aviso.
  const [atualizando, setAtualizando] = useState(false);
  const atualizarMedidasUmClique = async () => {
    const u = (urlImport || produto?.source_url || auction?.source_url || '').trim();
    if (!u && !(titulo || '').trim()) {
      toast({ title: 'Sem link e sem título', description: 'Cole o link do produto ou preencha o título.', variant: 'destructive', duration: 2500 });
      return;
    }
    setAtualizando(true);
    setAvisosServidor([]);
    try {
      const r = await plataforma.functions.invoke('importarProdutoPeloLink', { actor_id: quemSouEu(), url: /^https?:\/\//i.test(u) ? u : '', titulo });
      const d = r?.data || r;
      if (!d?.ok) {
        toast({ title: 'Não consegui puxar as medidas', description: recadoDoServidor(d), variant: 'destructive', duration: 2500 });
        return;
      }
      const novos = { ...CAMPOS_VAZIOS };
      for (const c of CAMPOS_MEDIDA) novos[c] = textoDoCampo(d.medidas?.[c]);
      if (!CAMPOS_MEDIDA.some((c) => novos[c] !== '')) {
        toast({ title: 'Nenhuma medida encontrada', description: d.observacao || 'A página não trouxe peso nem medidas. Preencha à mão.', variant: 'destructive', duration: 3000 });
        return;
      }
      const nova = d.fonte === 'pagina' ? 'pagina' : 'estimativa_ia';
      setCampos(novos);
      setOrigem(nova);
      setPendente(true);
      const { avisos } = normalizarMedidas(novos);
      if (avisos.length) {
        setAvisosServidor(['As medidas vieram fora da faixa e NÃO foram gravadas: confira e salve.', ...avisos]);
        return;
      }
      const g = await gravar(novos, nova);
      if (g.ok) {
        toast({
          title: nova === 'pagina' ? 'Medidas lidas da página e gravadas' : 'Estimativa da IA gravada — confira',
          description: `${resumoDaCaixa(caixaDoFrete(novos))}${d.observacao ? ` · ${d.observacao}` : ''}`,
          duration: 3500,
        });
      }
    } catch (e) {
      toast({ title: 'Erro ao atualizar medidas', description: e?.message || 'Tente de novo.', variant: 'destructive', duration: 2500 });
    } finally {
      setAtualizando(false);
    }
  };

  // O pai chama isto ANTES de gravar o leilão. Nunca rejeita.
  useImperativeHandle(ref, () => ({
    salvarSePendente: async () => {
      if (!pendente) return { ok: true };
      try { return await salvar(); } catch (e) { return { ok: false, erro: e?.message || 'Falha ao gravar o produto.' }; }
    },
    get pendente() { return pendente; },
  }), [pendente, salvar]);

  // (d) Importar tudo pelo link — descrição, medidas e fotos. Preço, nunca.
  const importar = async () => {
    const u = (urlImport || '').trim();
    if (!/^https?:\/\//i.test(u)) {
      toast({ title: 'Cole o link do produto', description: 'O endereço precisa começar com http:// ou https://', duration: 1500 });
      return;
    }
    setImportando(true);
    setResultado(null);
    try {
      const r = await plataforma.functions.invoke('importarProdutoPeloLink', { actor_id: quemSouEu(), url: u, titulo });
      const d = r?.data || r;
      if (!d?.ok) {
        toast({ title: 'Não consegui importar pelo link', description: recadoDoServidor(d), variant: 'destructive', duration: 2500 });
        return;
      }
      const medidas = d.medidas || {};
      const temMedida = CAMPOS_MEDIDA.some((c) => textoDoCampo(medidas[c]) !== '');
      const fotos = (Array.isArray(d.fotos) ? d.fotos : []).filter((f) => typeof f === 'string' && /^https?:\/\//i.test(f));
      setResultado({ ...d, medidas, fotos });
      setSel({ descricao: !!(d.descricao || '').trim(), medidas: temMedida, fotos: fotos.length > 0 });
    } catch (e) {
      toast({ title: 'Erro ao importar', description: e?.message || 'Tente de novo.', variant: 'destructive', duration: 2500 });
    } finally {
      setImportando(false);
    }
  };

  const aplicarSelecionados = async () => {
    if (!resultado) return;
    setAplicando(true);
    try {
      if (sel.descricao && (resultado.descricao || '').trim()) onDescricao?.(resultado.descricao.trim());
      if (sel.medidas) {
        // Preenche com o que veio (textoDoCampo), não com o normalizado: assim um
        // valor fora da faixa aparece no campo COM o aviso, em vez de sumir calado.
        const novos = { ...CAMPOS_VAZIOS };
        for (const c of CAMPOS_MEDIDA) novos[c] = textoDoCampo(resultado.medidas?.[c]);
        setCampos(novos);
        setOrigem(resultado.fonte === 'pagina' ? 'pagina' : 'estimativa_ia');
        setPendente(true);
        setAvisosServidor([]);
      }
      if (sel.fotos && resultado.fotos.length) {
        // Lição do lavajato: foto de fora só entra depois de copiada para o nosso Storage.
        const novas = resultado.fotos.filter((f) => !imageUrls.includes(f));
        const { fotos, falharam } = await trazerFotosParaNosso(novas, titulo);
        if (fotos.length) onFotos?.(fotos);
        if (falharam) toast({ title: `${falharam} foto(s) não puderam ser copiadas`, description: 'Só entram fotos copiadas para o nosso servidor.', duration: 2500 });
        else if (fotos.length) toast({ title: `${fotos.length} foto(s) adicionadas ao leilão`, duration: 1200 });
      }
      toast({ title: 'Importação aplicada', description: 'Confira os campos e salve.', duration: 1200 });
      setResultado(null);
    } finally {
      setAplicando(false);
    }
  };

  const nomeDoProduto = produto?.description || produto?.name || titulo || 'sem nome';
  const seloOrigem = origem && ORIGENS_MEDIDA[origem] ? ORIGENS_MEDIDA[origem] : null;
  const fotosNovas = resultado ? resultado.fotos.filter((f) => !imageUrls.includes(f)) : [];

  return (
    <Card className="rounded-2xl border-white/[0.06]" style={CARD_STYLE} data-teste="produto-do-leilao">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 grid place-items-center shrink-0">
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-white text-base">Produto, medidas e vídeo</CardTitle>
            {carregando ? (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Lendo o produto do leilão…</p>
            ) : produto?.id ? (
              <p className="text-xs text-slate-400 mt-1">Produto vinculado: <span className="text-slate-200 font-semibold">{nomeDoProduto}</span></p>
            ) : (
              <p className="text-xs text-amber-300/90 mt-1">Este leilão não tem produto vinculado — ao salvar as medidas, o produto é criado e vinculado.</p>
            )}
            {pendente && !carregando && (
              <p className="text-[11px] text-amber-400 font-bold mt-1">Alterações não salvas — vão junto com o Salvar Alterações, ou agora pelo botão abaixo.</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* (b) MEDIDAS E PESO PARA O FRETE */}
        <div className="rounded-xl border border-white/10 bg-[#0d1117]/50 p-4 space-y-3" data-teste="medidas-do-leilao">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={LABEL_CLS}>Medidas e peso para o frete</p>
            {seloOrigem && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${origem === 'estimativa_ia' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-sky-500/10 text-sky-300 border-sky-500/30'}`} data-teste="origem-das-medidas">
                {seloOrigem}{medidasEm ? ` · ${dataCurta(medidasEm)}` : ''}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="medida-peso" className={LABEL_CLS}>Peso (kg)</Label>
              <Input id="medida-peso" type="number" step="0.001" min="0" inputMode="decimal" placeholder="0,000" value={campos.peso} onChange={(e) => mudarCampo('peso', e.target.value)} className={`mt-1.5 ${INPUT_CLS}`} disabled={carregando} />
            </div>
            {['altura', 'largura', 'comprimento'].map((c) => (
              <div key={c}>
                <Label htmlFor={`medida-${c}`} className={LABEL_CLS}>{rotulo(c)} (cm)</Label>
                <Input id={`medida-${c}`} type="number" step="0.1" min="0" inputMode="decimal" placeholder="0" value={campos[c]} onChange={(e) => mudarCampo(c, e.target.value)} className={`mt-1.5 ${INPUT_CLS}`} disabled={carregando} />
              </div>
            ))}
          </div>
          {avisos.length > 0 && (
            <ul className="space-y-1" data-teste="avisos-das-medidas">
              {avisos.map((a) => <li key={a} className="text-xs text-amber-300 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{a}</li>)}
            </ul>
          )}
          <p className={`text-xs font-bold flex items-start gap-1.5 ${caixa.padrao ? 'text-rose-400' : 'text-emerald-400'}`} data-teste="frete-caixa">
            {caixa.padrao ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            <span>
              O frete vai cotar com: {resumoDaCaixa(caixa)}
              {caixa.padrao ? ' — ⚠️ caixa padrão: o frete está chutando' : ''}
            </span>
          </p>
          <Button
            type="button"
            onClick={atualizarMedidasUmClique}
            disabled={atualizando || salvando || carregando || !auctionId}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            data-teste="atualizar-medidas-um-clique"
            title="Puxa peso e medidas pelo link do produto (ou estima pelo nome) e grava na hora para o frete da Melhor Envio"
          >
            {atualizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            {atualizando ? 'Puxando as medidas…' : 'Atualizar medidas para o frete (1 clique)'}
          </Button>
        </div>

        {/* (c) VÍDEO — o MESMO componente da gestão de produtos */}
        <div className="rounded-xl border border-white/10 bg-[#0d1117]/50 p-4" data-teste="video-do-leilao">
          <CampoDeVideo valor={videoUrls} aoMudar={mudarVideo} claro={false} />
        </div>

        {/* (d) IMPORTAR PELO LINK */}
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.04] p-4 space-y-3" data-teste="importar-pelo-link">
          <p className="text-[10px] uppercase tracking-widest text-sky-400 font-bold flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Importar pelo link do produto</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="url"
              value={urlImport}
              onChange={(e) => setUrlImport(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !importando) { e.preventDefault(); importar(); } }}
              placeholder="https://www.loja.com.br/produto/..."
              className={`flex-1 ${INPUT_CLS}`}
              disabled={importando}
            />
            <Button type="button" onClick={importar} disabled={importando || !(urlImport || '').trim()} className="h-11 shrink-0 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold px-4">
              {importando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {importando ? 'Lendo a página…' : 'Importar tudo pelo link'}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">Traz descrição, medidas/peso e fotos. O preço do leilão não é tocado.</p>

          {resultado && (
            <div className="rounded-xl border border-white/10 bg-[#0d1117]/70 p-3 space-y-3" data-teste="resultado-da-importacao">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${resultado.fonte === 'pagina' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>
                  {resultado.fonte === 'pagina' ? 'Lido da página' : 'Estimativa da IA — conferir'}
                </span>
                {resultado.confianca != null && <span className="text-[11px] text-slate-400">confiança: {String(resultado.confianca)}</span>}
                {resultado.pagina?.host && <span className="text-[11px] text-slate-500 truncate">{resultado.pagina.host}</span>}
              </div>
              {resultado.observacao && <p className="text-xs text-slate-300">{resultado.observacao}</p>}
              {Array.isArray(resultado.avisos) && resultado.avisos.length > 0 && (
                <ul className="space-y-0.5">{resultado.avisos.map((a) => <li key={a} className="text-[11px] text-amber-300">• {a}</li>)}</ul>
              )}

              <label className="flex items-start gap-2 text-sm text-slate-200 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={sel.descricao} disabled={!(resultado.descricao || '').trim()} onChange={(e) => setSel((s) => ({ ...s, descricao: e.target.checked }))} />
                <span className="min-w-0">
                  <span className="font-semibold">Descrição</span>
                  {(resultado.descricao || '').trim()
                    ? <span className="block text-xs text-slate-400 line-clamp-3 mt-0.5">{resultado.descricao}</span>
                    : <span className="block text-xs text-slate-500 mt-0.5">não veio descrição</span>}
                  {sel.descricao && (descricaoAtual || '').trim() && <span className="block text-[11px] text-amber-300 mt-0.5">Vai pedir confirmação antes de substituir a descrição atual.</span>}
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-slate-200 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={sel.medidas} disabled={!CAMPOS_MEDIDA.some((c) => textoDoCampo(resultado.medidas?.[c]) !== '')} onChange={(e) => setSel((s) => ({ ...s, medidas: e.target.checked }))} />
                <span className="min-w-0">
                  <span className="font-semibold">Medidas e peso</span>
                  <span className="block text-xs text-slate-400 mt-0.5">
                    {CAMPOS_MEDIDA.some((c) => textoDoCampo(resultado.medidas?.[c]) !== '')
                      ? `${resumoDaCaixa(caixaDoFrete(resultado.medidas))}${caixaDoFrete(resultado.medidas).padrao ? ' (incompletas — o que faltar fica na caixa padrão)' : ''}`
                      : 'não vieram medidas'}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-slate-200 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={sel.fotos} disabled={fotosNovas.length === 0} onChange={(e) => setSel((s) => ({ ...s, fotos: e.target.checked }))} />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">Fotos</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{fotosNovas.length} encontrada(s){resultado.fotos.length !== fotosNovas.length ? ` · ${resultado.fotos.length - fotosNovas.length} já no leilão` : ''} — são copiadas para o nosso servidor antes de entrar</span>
                  {fotosNovas.length > 0 && (
                    <span className="flex flex-wrap gap-1.5 mt-1.5">
                      {fotosNovas.slice(0, 8).map((f) => (
                        <img key={f} src={f} alt="" className="w-10 h-10 rounded-md object-cover border border-white/10 bg-[#0d1117]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ))}
                    </span>
                  )}
                </span>
              </label>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setResultado(null)} className="flex-1 h-10 rounded-xl bg-transparent border-white/15 text-slate-300 hover:bg-[#30363d] hover:text-white">
                  Descartar
                </Button>
                <Button type="button" onClick={aplicarSelecionados} disabled={aplicando || !(sel.descricao || sel.medidas || sel.fotos)} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  {aplicando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Aplicar selecionados
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* (e) SALVAR — grava em products, nunca em auctions */}
        {avisosServidor.length > 0 && (
          <ul className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 space-y-1" data-teste="avisos-do-servidor">
            {avisosServidor.map((a) => <li key={a} className="text-xs text-rose-300 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{a}</li>)}
          </ul>
        )}
        <Button
          type="button"
          onClick={salvar}
          disabled={salvando || carregando || !auctionId}
          className={`w-full h-11 rounded-xl font-bold text-white ${pendente ? 'bg-amber-600 hover:bg-amber-500' : 'bg-[#161b22] border border-white/15 hover:bg-[#30363d]'}`}
          data-teste="salvar-produto-do-leilao"
        >
          {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar produto (medidas e vídeo)
        </Button>
      </CardContent>
    </Card>
  );
});

export default ProdutoDoLeilaoCard;
