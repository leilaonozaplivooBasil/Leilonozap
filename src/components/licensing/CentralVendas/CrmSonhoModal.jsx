import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Check, Loader2, Upload, ImagePlus, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import { convertToWebP } from '@/lib/convertToWebP';
import { lerRespostaFotos } from '@/lib/buscaFotos';
import { HORIZONTES_SONHO } from '@/lib/metodo';

// 🌟 DIR-44 — ADICIONAR SONHO AO QUADRO: escolhe o horizonte (curto/médio/
// longo), dá nome ao sonho e coloca a imagem SEM SAIR DAQUI — buscando na
// internet pelo nome (mesma rota extractGoogleShoppingImages já em produção
// no catálogo) ou subindo do aparelho (mesmo Core.UploadFile do Estoque).
// Imagem achada na busca é re-hospedada pela rota proxyImage no nosso bucket:
// thumbnail de terceiro morre, quadro de sonho não pode morrer.
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
  const inputArquivoRef = useRef(null);

  useEffect(() => {
    if (aberto) {
      setHorizonte(horizonteInicial);
      setTitulo('');
      setFotos([]); setEnviadas([]); setColadas([]); setUrlColada(''); setEscolhidas([]);
      setBuscando(false); setEnviando(false); setConfirmando(false);
    }
  }, [aberto, horizonteInicial]);

  if (!aberto) return null;
  const ocupado = buscando || enviando || confirmando;

  const buscar = async () => {
    const termo = titulo.trim();
    if (termo.length < 3) { toast.error('Dê um nome ao sonho (mínimo 3 letras) pra buscar a imagem'); return; }
    setBuscando(true);
    try {
      const resp = await plataforma.functions.invoke('extractGoogleShoppingImages', { productName: termo });
      const { urls, queryUsada, erro } = lerRespostaFotos(resp);
      if (erro) {
        if (erro.tipo === 'falha_busca') toast.error(`A busca de imagens falhou: ${erro.mensagem}`);
        else toast.error(`Nenhuma imagem encontrada para "${queryUsada || termo}" — tente outro nome ou envie do aparelho.`);
      } else {
        setFotos(urls);
        toast.success(`${urls.length} imagens encontradas — toque pra escolher`);
      }
    } catch (e) {
      toast.error(`Erro na busca: ${e.message}`);
    } finally { setBuscando(false); }
  };

  const enviarArquivos = async (evento) => {
    const arquivos = Array.from(evento.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (arquivos.length === 0) return;
    setEnviando(true);
    const novas = [];
    for (const arquivo of arquivos) {
      try {
        const comprimido = await convertToWebP(arquivo);
        const r = await plataforma.integrations.Core.UploadFile({ file: comprimido });
        if (r?.file_url) novas.push(r.file_url);
        else toast.error(`Falha no upload: ${arquivo.name}`);
      } catch {
        toast.error(`Falha no upload: ${arquivo.name}`);
      }
    }
    if (novas.length) {
      setEnviadas((prev) => [...prev, ...novas]);
      setEscolhidas((prev) => [...prev, ...novas]); // quem subiu, quer usar
    }
    setEnviando(false);
    if (inputArquivoRef.current) inputArquivoRef.current.value = '';
  };

  const alternar = (url) =>
    setEscolhidas((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));

  // 🔗 Adendo do dono: colar o endereço da imagem e adicionar por ele.
  const usarUrlColada = () => {
    const url = urlColada.trim();
    if (!/^https?:\/\//i.test(url)) { toast.error('Cole um endereço de imagem válido (começa com http:// ou https://)'); return; }
    if (!coladas.includes(url) && !fotos.includes(url) && !enviadas.includes(url)) setColadas((prev) => [...prev, url]);
    setEscolhidas((prev) => (prev.includes(url) ? prev : [...prev, url]));
    setUrlColada('');
    toast.success('Imagem adicionada à galeria — já está marcada');
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
            try {
              const r = await plataforma.functions.invoke('proxyImage', { imageUrl: url });
              final = r?.file_url || r?.data?.file_url || url;
            } catch { final = url; }
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
      <Card className="bg-white border-nz-borda max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col">
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
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !ocupado) { e.preventDefault(); buscar(); } }}
                placeholder='ex.: "BMW X6 2024 preta" — o nome é o termo da busca'
                className="bg-white border-nz-borda text-nz-tinta"
                disabled={ocupado}
              />
              <Button onClick={buscar} disabled={ocupado || titulo.trim().length < 3} className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0">
                {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="ml-1.5 hidden sm:inline">{buscando ? 'Buscando...' : 'Buscar imagem'}</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[11px] text-nz-tinta-fraca">ou</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputArquivoRef.current?.click()}
                disabled={ocupado}
                className="border-nz-borda text-nz-tinta h-8"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />}
                {enviando ? 'Enviando...' : 'Enviar imagem do aparelho'}
              </Button>
              <input ref={inputArquivoRef} type="file" accept="image/*" multiple className="hidden" onChange={enviarArquivos} data-testid="sonho-arquivo" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[11px] text-nz-tinta-fraca shrink-0">ou</p>
              <Input
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
                        <img src={url} alt="" className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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

          <Button onClick={confirmar} disabled={ocupado || (!titulo.trim() && escolhidas.length === 0)} className="w-full bg-nz-verde hover:bg-nz-verde-claro text-white font-bold">
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
