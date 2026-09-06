import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Check, Loader2, Upload, ImagePlus, Link as LinkIcon, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import { convertToWebP } from '@/lib/convertToWebP';
import { lerRespostaFotos } from '@/lib/buscaFotos';
import { arquivosDoColar, urlDoColar, lerImagensDaAreaDeTransferencia } from '@/lib/colarImagem';
import { HORIZONTES_SONHO } from '@/lib/metodo';

// 🌟 DIR-44 — ADICIONAR SONHO AO QUADRO: escolhe o horizonte (curto/médio/
// longo), dá nome ao sonho e coloca a imagem SEM SAIR DAQUI — buscando na
// internet pelo nome ou subindo do aparelho (mesmo Core.UploadFile do
// Estoque). Imagem achada na busca é re-hospedada pela rota proxyImage no
// nosso bucket: thumbnail de terceiro morre, quadro de sonho não pode morrer.
//
// 06/09/2026 — DUAS ORDENS DO DONO, olhando este modal:
//   🔎 "o buscador precisa ser foda — está trazendo imagens aleatórias,
//      precisa puxar do Google igual o Google". A busca saiu do Google
//      SHOPPING (rota do catálogo, boa pra produto à venda) e foi pro Google
//      IMAGENS (rota buscarImagensGoogle). Cada resultado traz a imagem
//      grande (vai pro quadro) e a miniatura (a galeria mostra, leve).
//   📋 "mais uma forma: copiar e colar a imagem — no celular fica ainda mais
//      foda". Ctrl+V / "Colar" do menu do dedo em qualquer lugar do modal
//      cai no MESMO upload do "Enviar do aparelho"; endereço colado vira a
//      URL de sempre; e o botão "Colar imagem" lê a área de transferência
//      pela Async Clipboard API (Chrome no Android, Safari no iPhone).
const novoId = () =>
  (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

export default function CrmSonhoModal({ aberto, horizonteInicial = 'curto', onFechar, onAdicionar }) {
  const [horizonte, setHorizonte] = useState(horizonteInicial);
  const [titulo, setTitulo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [fotos, setFotos] = useState([]);           // urls vindas da busca
  const [enviadas, setEnviadas] = useState([]);     // urls já no nosso bucket (upload)
  const [coladas, setColadas] = useState([]);       // urls coladas pelo usuário (adendo DIR-44)
  const [urlColada, setUrlColada] = useState('');
  const [escolhidas, setEscolhidas] = useState([]); // seleção (de todas as fontes)
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [colando, setColando] = useState(false);
  const inputArquivoRef = useRef(null);
  const inputTituloRef = useRef(null);
  const inputUrlRef = useRef(null);
  // imagem grande → miniatura (a galeria mostra a leve; o quadro recebe a grande)
  const miniaturasRef = useRef({});

  useEffect(() => {
    if (aberto) {
      setHorizonte(horizonteInicial);
      setTitulo('');
      setFotos([]); setEnviadas([]); setColadas([]); setUrlColada(''); setEscolhidas([]);
      setBuscando(false); setEnviando(false); setConfirmando(false); setColando(false);
      miniaturasRef.current = {};
    }
  }, [aberto, horizonteInicial]);

  if (!aberto) return null;
  const ocupado = buscando || enviando || confirmando;

  const buscar = async () => {
    const termo = titulo.trim();
    if (termo.length < 3) { toast.error('Dê um nome ao sonho (mínimo 3 letras) pra buscar a imagem'); return; }
    setBuscando(true);
    try {
      const resp = await plataforma.functions.invoke('buscarImagensGoogle', { q: termo });
      const { urls, queryUsada, erro } = lerRespostaFotos(resp);
      if (erro) {
        if (erro.tipo === 'falha_busca') toast.error(`A busca de imagens falhou: ${erro.mensagem}`);
        else toast.error(`Nenhuma imagem encontrada para "${queryUsada || termo}" — tente outro nome, cole uma imagem ou envie do aparelho.`);
      } else {
        const resultados = resp?.resultados || resp?.data?.resultados || [];
        for (const r of resultados) if (r?.original && r?.miniatura) miniaturasRef.current[r.original] = r.miniatura;
        setFotos(urls);
        toast.success(`${urls.length} imagens do Google — toque pra escolher`);
      }
    } catch (e) {
      toast.error(`Erro na busca: ${e.message}`);
    } finally { setBuscando(false); }
  };

  // 📤 O upload — uma porta só, seja do seletor de arquivo, do Ctrl+V ou do
  // botão "Colar imagem".
  const subirArquivos = async (arquivos) => {
    const imagens = (arquivos || []).filter((f) => f && f.type?.startsWith('image/'));
    if (imagens.length === 0) return false;
    setEnviando(true);
    const novas = [];
    for (const arquivo of imagens) {
      try {
        const comprimido = await convertToWebP(arquivo);
        const r = await plataforma.integrations.Core.UploadFile({ file: comprimido });
        if (r?.file_url) novas.push(r.file_url);
        else toast.error(`Falha no upload: ${arquivo.name || 'imagem'}`);
      } catch {
        toast.error(`Falha no upload: ${arquivo.name || 'imagem'}`);
      }
    }
    if (novas.length) {
      setEnviadas((prev) => [...prev, ...novas]);
      setEscolhidas((prev) => [...prev, ...novas]); // quem subiu, quer usar
    }
    setEnviando(false);
    return novas.length > 0;
  };

  const enviarArquivos = async (evento) => {
    await subirArquivos(Array.from(evento.target.files || []));
    if (inputArquivoRef.current) inputArquivoRef.current.value = '';
  };

  // 📋 Ctrl+V / "Colar" do dedo em qualquer lugar do modal. Imagem copiada →
  // upload; endereço copiado → URL colada (fora do próprio campo de URL, que
  // já recebe o texto sozinho). Texto comum segue o caminho normal.
  const aoColar = async (evento) => {
    if (ocupado) return;
    const arquivos = arquivosDoColar(evento.clipboardData);
    if (arquivos.length) {
      evento.preventDefault();
      if (await subirArquivos(arquivos)) toast.success(`${arquivos.length === 1 ? 'Imagem colada' : `${arquivos.length} imagens coladas`} — já está marcada`);
      return;
    }
    const url = urlDoColar(evento.clipboardData);
    if (url && evento.target !== inputUrlRef.current) {
      evento.preventDefault();
      adicionarUrl(url);
    }
  };

  // 📋 O botão: lê a área de transferência. Sem permissão/API, ensina o
  // gesto que sempre funciona (segurar no campo e escolher "Colar").
  const colarPeloBotao = async () => {
    setColando(true);
    try {
      const arquivos = await lerImagensDaAreaDeTransferencia();
      if (arquivos.length) {
        if (await subirArquivos(arquivos)) toast.success('Imagem colada — já está marcada');
        return;
      }
      const texto = await navigator.clipboard?.readText?.().catch(() => '');
      if (/^https?:\/\/\S+$/i.test(String(texto || '').trim())) { adicionarUrl(String(texto).trim()); return; }
      toast.error('Não tem imagem copiada. Copie uma imagem (segure nela e escolha "Copiar imagem") e tente de novo.');
    } catch {
      toast.message('Segure no campo do nome e escolha "Colar" — a imagem entra do mesmo jeito.');
      inputTituloRef.current?.focus();
    } finally { setColando(false); }
  };

  const alternar = (url) =>
    setEscolhidas((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));

  // 🔗 Adendo do dono: colar o endereço da imagem e adicionar por ele.
  const adicionarUrl = (url) => {
    if (!coladas.includes(url) && !fotos.includes(url) && !enviadas.includes(url)) setColadas((prev) => [...prev, url]);
    setEscolhidas((prev) => (prev.includes(url) ? prev : [...prev, url]));
    setUrlColada('');
    toast.success('Imagem adicionada à galeria — já está marcada');
  };
  const usarUrlColada = () => {
    const url = urlColada.trim();
    if (!/^https?:\/\//i.test(url)) { toast.error('Cole um endereço de imagem válido (começa com http:// ou https://)'); return; }
    adicionarUrl(url);
  };

  const confirmar = async () => {
    const nome = titulo.trim();
    if (!nome && escolhidas.length === 0) { toast.error('Dê um nome ao sonho ou escolha uma imagem'); return; }
    setConfirmando(true);
    try {
      const jaNossas = new Set(enviadas);
      let itens;
      if (escolhidas.length === 0) {
        itens = [{ id: novoId(), horizonte, titulo: nome, imagem_url: null, detalhes: '' }];
      } else {
        itens = await Promise.all(escolhidas.map(async (url) => {
          let final = url;
          if (!jaNossas.has(url)) {
            // re-hospeda no nosso bucket; se o proxy falhar, fica a original
            // a imagem grande primeiro; se o site dela não deixar, a miniatura
            // (que o Google serve) — e só então a original crua
            const candidatas = [url, miniaturasRef.current[url]].filter(Boolean);
            final = url;
            for (const candidata of candidatas) {
              try {
                const r = await plataforma.functions.invoke('proxyImage', { imageUrl: candidata });
                const hospedada = r?.file_url || r?.data?.file_url;
                if (hospedada) { final = hospedada; break; }
              } catch { /* tenta a próxima */ }
            }
          }
          return { id: novoId(), horizonte, titulo: nome || 'Sonho', imagem_url: final, detalhes: '' };
        }));
      }
      await onAdicionar(itens);
    } finally { setConfirmando(false); }
  };

  const galeria = [...enviadas, ...coladas.filter((u) => !enviadas.includes(u)), ...fotos.filter((u) => !enviadas.includes(u) && !coladas.includes(u))];
  const h = HORIZONTES_SONHO.find((x) => x.id === horizonte) || HORIZONTES_SONHO[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-nz-borda max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col" onPaste={aoColar} data-teste="sonho-modal">
        <CardContent className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-nz-tinta flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-nz-verde" /> Adicionar ao quadro dos sonhos
            </p>
            <Button variant="ghost" size="icon" onClick={onFechar} disabled={confirmando}><X className="w-5 h-5 text-nz-tinta-fraca" /></Button>
          </div>

          {/* horizonte */}
          <div>
            <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">Prazo do sonho</p>
            <div className="grid grid-cols-3 gap-2">
              {HORIZONTES_SONHO.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setHorizonte(op.id)}
                  className={`rounded-xl border-2 p-2 text-center transition-all ${horizonte === op.id ? 'border-nz-verde bg-nz-verde-fundo' : 'border-nz-borda bg-white hover:border-nz-verde/40'}`}
                >
                  <p className="text-sm font-bold text-nz-tinta">{op.emoji} {op.label}</p>
                  <p className="text-[11px] text-nz-tinta-fraca">{op.faixa}</p>
                </button>
              ))}
            </div>
          </div>

          {/* nome + busca na internet, sem sair do modal */}
          <div>
            <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">Qual é o sonho?</p>
            <div className="flex gap-2">
              <Input
                ref={inputTituloRef}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !ocupado) { e.preventDefault(); buscar(); } }}
                placeholder='ex.: "casa na praia", "BMW X6 preta" — busca no Google'
                className="bg-white border-nz-borda text-nz-tinta"
                disabled={ocupado}
              />
              <Button onClick={buscar} disabled={ocupado || titulo.trim().length < 3} aria-label="Buscar imagem" className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0">
                {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="ml-1.5 hidden sm:inline">{buscando ? 'Buscando...' : 'Buscar imagem'}</span>
              </Button>
            </div>
            {/* no celular os dois botões quebram de linha em vez de vazar do cartão */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <p className="text-[11px] text-nz-tinta-fraca">ou</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputArquivoRef.current?.click()}
                disabled={ocupado}
                className="border-nz-borda text-nz-tinta h-8"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />}
                {enviando ? 'Enviando...' : 'Enviar do aparelho'}
              </Button>
              <input ref={inputArquivoRef} type="file" accept="image/*" multiple className="hidden" onChange={enviarArquivos} data-testid="sonho-arquivo" />
              <Button
                variant="outline"
                size="sm"
                onClick={colarPeloBotao}
                disabled={ocupado || colando}
                title="Copiou uma imagem? Cole aqui (ou Ctrl+V em qualquer lugar do modal)"
                className="border-nz-borda text-nz-tinta h-8"
                data-teste="sonho-colar"
              >
                {colando ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ClipboardPaste className="w-4 h-4 mr-1.5" />}
                Colar imagem
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[11px] text-nz-tinta-fraca shrink-0">ou</p>
              <Input
                ref={inputUrlRef}
                value={urlColada}
                onChange={(e) => setUrlColada(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !ocupado) { e.preventDefault(); usarUrlColada(); } }}
                placeholder="cole aqui o endereço da imagem (https://...)"
                className="bg-white border-nz-borda text-nz-tinta text-sm h-8"
                disabled={ocupado}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={usarUrlColada}
                disabled={ocupado || !urlColada.trim()}
                className="border-nz-borda text-nz-tinta h-8 shrink-0"
              >
                <LinkIcon className="w-4 h-4 mr-1.5" /> Usar
              </Button>
            </div>
          </div>

          {/* galeria: busca + uploads, multi-seleção */}
          {galeria.length > 0 && (
            <div>
              <p className="text-xs text-nz-tinta-fraca mb-1.5">Toque pra marcar — cada imagem marcada vira um quadro no seu sonho ({escolhidas.length} escolhida{escolhidas.length === 1 ? '' : 's'})</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
                {galeria.map((url) => {
                  const on = escolhidas.includes(url);
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => alternar(url)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all min-h-[80px] ${on ? 'border-nz-verde' : 'border-nz-borda opacity-70 hover:opacity-100'}`}
                    >
                      <div className="w-full h-20 bg-nz-cinza-fundo flex items-center justify-center p-1">
                        <img src={miniaturasRef.current[url] || url} alt="" className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                      {on && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-nz-verde grid place-items-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button onClick={confirmar} disabled={ocupado || (!titulo.trim() && escolhidas.length === 0)} className="w-full h-auto min-h-10 py-2.5 whitespace-normal bg-nz-verde hover:bg-nz-verde-claro text-white font-bold">
            {confirmando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            {confirmando
              ? 'Guardando no quadro...'
              : escolhidas.length > 0
                ? `Adicionar ${escolhidas.length} ${escolhidas.length === 1 ? 'imagem' : 'imagens'} ao ${h.emoji} ${h.label.toLowerCase()}`
                : `Adicionar só com texto ao ${h.emoji} ${h.label.toLowerCase()}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
