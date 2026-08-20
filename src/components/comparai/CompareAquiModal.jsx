import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fmtBR } from '@/lib/money';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ExternalLink, Share2, Edit, Upload, Loader2, RefreshCw, AlertTriangle, Factory, Trophy, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { comparaiPrices } from '@/functions/comparaiPrices';
import LogoLoja from './LogoLoja';
import useSiteMedia from '@/hooks/useSiteMedia';

// 20/08/2026 (pedido do dono, "sênior") — "todo mundo compara no Mercado
// Livre, não tem como não trazer o Mercado Livre". Embutir a PÁGINA ao vivo
// do Google Shopping/ML num iframe não é possível: os dois bloqueiam
// deliberadamente ser embutidos em site de terceiro (cabeçalho de segurança
// X-Frame-Options/CSP, é assim que Google e ML se protegem de clickjacking —
// não é uma config que dá pra contornar do nosso lado). O que É possível, e
// já está pronto (a API já busca, só não era mostrado): a FOTO real de cada
// produto encontrado, vinda direto da mesma fonte (Google Shopping/Zoom).
// Isso já detecta e destaca o Mercado Livre quando ele aparece no resultado.
function isMercadoLivre(item) {
  const s = `${item?.store || ''}`.toLowerCase();
  const u = `${item?.url || ''}`.toLowerCase();
  return s.includes('mercado livre') || s.includes('mercadolivre') || u.includes('mercadolivre.com');
}

// 🏷️ PONTO 95 (20/08/2026) — os selos de nível de correspondência ("Mesma
// imagem", "Mesmo produto"...) SAÍRAM da tela a pedido do dono: "isso tem que
// ser algo interno, não precisa aparecer aqui, já testei e está perfeito".
// O matchLevel continua existindo no backend e ainda comanda a validação e a
// ordenação (Mercado Livre primeiro) — só não é mais exibido pro cliente.

export default function CompareAquiModal({ auction, isProduct = false, onClose }) {
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);
  
  const [localAuction, setLocalAuction] = useState(auction);
  
  console.log('✅ CompareAquiModal inicializado com:', { auctionId: auction.id, title: auction.title });
  
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState(localAuction?.supplier_logo_url || '');

  // 20/08/2026 (3ª rodada) — dono: "ainda não consigo clicar nas imagens...
  // ainda não consigo clicar nos links pra abrir o modal dentro". As linhas
  // viraram <div> (sem href) na rodada anterior pra tirar a navegação pra
  // fora do site, mas ficaram sem NENHUMA interação — clicar não fazia
  // nada. Clicar agora abre um modal de detalhe (dentro do site, sem sair)
  // com a foto grande, nome completo da loja/produto e o preço.
  const [selectedProof, setSelectedProof] = useState(null);

  // 🟢 PONTO 95 (20/08/2026) — dono: "pega a logo oficial 3D que está no site e
  // usa ela em todo o CompareAQUI, chapada, sem fundo". useSiteMedia() é a
  // MESMA fonte que o cabeçalho do site usa (Painel de Mídia, com fallback em
  // /brand/logo-horizontal-dark.webp — a 3D horizontal). Assim, se ele trocar a
  // logo no painel, o CompareAQUI acompanha sozinho. Sem arquivo chumbado e
  // sem nenhuma URL do Base44.
  const { logoUrl: logoNoZap } = useSiteMedia();

  // 🔦 PONTO 91 (20/08/2026) — o backend SEMPRE devolveu um `debug` dizendo o que
  // cada fonte tentou e por que falhou, mas o modal jogava fora ao dar throw:
  // a tela mostrava "Comparação Indisponível" sem nenhuma pista, e ficamos horas
  // adivinhando. Agora esse diagnóstico é guardado e exibido na tela de erro.
  const [diagnostico, setDiagnostico] = useState(null);
  const [verDiagnostico, setVerDiagnostico] = useState(false);

  // Mercado Livre primeiro (quando aparece no resultado real), o resto mantém
  // a ordem original da busca — não inventa nada, só reordena o que já veio.
  const sortedComparisons = useMemo(() => {
    const list = comparisonData?.comparisons || [];
    return [...list].sort((a, b) => (isMercadoLivre(b) ? 1 : 0) - (isMercadoLivre(a) ? 1 : 0));
  }, [comparisonData]);

  const [isSharing, setIsSharing] = useState(false);

  const screenshotRef = useRef(null);

  const isFactoryProduct = localAuction?.product_source === 'factory_new';
  const isSupplierWithoutUrl = localAuction?.comparai_mode === 'supplier' && (!localAuction?.source_url || !localAuction?.source_url.trim());

  useEffect(() => {
    if (!auction || !auction.id) return;
    if (!isSupplierWithoutUrl) {
      handleCompare();
    }
  }, []);

  // 🔥 VALIDAÇÃO CRÍTICA: Verifica se auction existe (após os hooks)
  if (!auction || !auction.id) {
    console.error('❌ CompareAquiModal: auction inválido!', auction);
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-gray-900 text-white border-red-500/30">
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-amber-400">Leilão Inválido</h3>
            <p className="text-gray-300 mb-6">Não foi possível carregar os dados do leilão.</p>
            <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }



  const handleCompare = async (forceGoogleShopping = false) => {
    setIsLoading(true);
    setError(null);
    setDiagnostico(null);

    try {
      console.log('🚀 [COMPARAI] ========== INICIANDO ==========');
      console.log('🚀 [COMPARAI] AuctionID:', localAuction.id);
      console.log('🚀 [COMPARAI] Title:', localAuction.title);
      console.log('🚀 [COMPARAI] Mode:', localAuction.comparai_mode);
      console.log('🚀 [COMPARAI] Force Google Shopping:', forceGoogleShopping);
      console.log('🚀 [COMPARAI] Payload:', {
        auctionId: localAuction.id,
        forceRefresh: false,
        forceGoogleShopping: forceGoogleShopping
      });
      
      let response;
      let hadError = false;

      try {
        console.log('📞 [COMPARAI] Chamando comparaiPrices...');
        const payload = isProduct 
          ? {
              productId: localAuction.id,
              forceRefresh: false,
              forceGoogleShopping: true
            }
          : {
              auctionId: localAuction.id,
              forceRefresh: false,
              forceGoogleShopping: forceGoogleShopping
            };
        // 🔴 CAUSA-RAIZ DO "TRAVA, DO NADA VOLTA" (19/08/2026) — a chamada não
        // tinha NENHUM teto de tempo no navegador. O servidor agora tem um
        // limite próprio (marketSearch.js), mas se a REDE em si travar antes
        // de chegar lá, nada aqui derrubava o spinner "Analisando preços...".
        // 18s dá folga pro teto do servidor (12s) + latência de rede.
        response = await Promise.race([
          comparaiPrices(payload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_CLIENTE')), 18000)),
        ]);
        console.log('✅ [COMPARAI] Chamada retornou sem exception');
      } catch (callError) {
        console.error('💥 [COMPARAI] EXCEPTION na chamada:', callError);
        console.error('💥 [COMPARAI] Exception message:', callError.message);
        console.error('💥 [COMPARAI] Exception name:', callError.name);
        console.error('💥 [COMPARAI] Exception stack:', callError.stack);
        hadError = true;
        throw callError;
      }

      console.log('📊 [COMPARAI] ========== RESPOSTA ==========');
      console.log('📊 [COMPARAI] Response completa:', response);
      console.log('📊 [COMPARAI] Tipo:', typeof response);
      console.log('📊 [COMPARAI] É null?', response === null);
      console.log('📊 [COMPARAI] É undefined?', response === undefined);
      console.log('📊 [COMPARAI] Chaves disponíveis:', response ? Object.keys(response) : 'N/A');
      console.log('📊 [COMPARAI] response.success:', response?.success);
      console.log('📊 [COMPARAI] response.data:', response?.data);
      console.log('📊 [COMPARAI] response.comparison:', response?.comparison);
      console.log('📊 [COMPARAI] response.error:', response?.error);
      
      // 🔥 VALIDAÇÃO 1: Resposta existe?
      if (!response) {
        console.error('❌ [COMPARAI] Resposta é null/undefined!');
        throw new Error('Resposta vazia do servidor');
      }
      
      // 🔥 VALIDAÇÃO 2: Formato Platform V2 direto
      if (response.success === true) {
        console.log('✅ [COMPARAI] SUCCESS=TRUE encontrado direto!');
        console.log('✅ [COMPARAI] Comparison data:', response.comparison);
        
        if (!response.comparison) {
          console.error('❌ [COMPARAI] Success=true mas comparison está vazio!');
          throw new Error('Dados de comparação não encontrados');
        }
        
        setComparisonData(response.comparison);
        setIsCached(response.cached || false);
        setCacheAge(response.cacheAge || null);
        console.log('✅ [COMPARAI] Estado atualizado com sucesso!');
        return;
      }
      
      // 🔥 VALIDAÇÃO 3: Success = false (erro esperado)
      if (response.success === false) {
        console.error('❌ [COMPARAI] Success=false. Error:', response.error);
        console.error('🔦 [COMPARAI] Diagnóstico do servidor:', response.debug);
        setDiagnostico({ ...(response.debug || {}), errorCode: response.errorCode });
        throw new Error(response.error || 'Comparação falhou');
      }
      
      // 🔥 VALIDAÇÃO 4: Formato .data wrapper
      if (response.data?.success === true) {
        console.log('✅ [COMPARAI] Success encontrado em .data!');
        setComparisonData(response.data.comparison);
        setIsCached(response.data.cached || false);
        setCacheAge(response.data.cacheAge || null);
        return;
      }
      
      // Se chegou aqui, formato desconhecido
      console.error('❌ [COMPARAI] FORMATO DESCONHECIDO:', {
        hasSuccess: 'success' in response,
        successValue: response.success,
        hasData: 'data' in response,
        hasError: 'error' in response,
        allKeys: Object.keys(response)
      });
      
      throw new Error('Formato de resposta não reconhecido');
      
    } catch (err) {
      console.error('❌ [COMPARAI] ========== ERRO CAPTURADO ==========');
      console.error('❌ [COMPARAI] Erro completo:', err);
      console.error('❌ [COMPARAI] Erro.name:', err.name);
      console.error('❌ [COMPARAI] Erro.message:', err.message);
      console.error('❌ [COMPARAI] Erro.stack:', err.stack);
      console.error('❌ [COMPARAI] Erro.response:', err.response);
      console.error('❌ [COMPARAI] Erro.response.data:', err.response?.data);
      
      let errorMessage = 'Não foi possível comparar preços';

      if (err.message === 'TIMEOUT_CLIENTE') {
        errorMessage = 'A busca demorou demais. Tente novamente em alguns segundos.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      }
      
      console.error('❌ [COMPARAI] Mensagem final de erro:', errorMessage);
      setError(errorMessage);
    } finally {
      console.log('🏁 [COMPARAI] Finalizando... isLoading=false');
      setIsLoading(false);
    }
  };

  // 🆕 COMPARTILHAR SIMPLES - SEM HTML2CANVAS
  const handleShareComparai = async () => {
    if (isSharing) return;
    
    setIsSharing(true);

    try {
      // /l/:id = rota server-side com a foto real do leilão no preview do WhatsApp
      const productUrl = `${window.location.origin}/l/${auction.id}`;
      const savings = comparisonData?.savings || 0;
      const savingsPercent = comparisonData?.savingsPercent || 0;
      const currentPrice = localAuction.current_price || localAuction.starting_price;
      
      // 🆕 USA PREÇO MÉDIO (referencePrice) OU AVERAGE
      const marketPrice = comparisonData?.referencePrice || comparisonData?.averageMarketPrice || comparisonData?.cheapestMarketPrice || 0;

      // 📝 MENSAGEM VISUAL
      const shareMessage = `🔨📦 LEILÃO NO🔥ZAP VENCEU!

📱 ${auction.title}

🏭 Mercado: R$ ${fmtBR(marketPrice)}
💚 Leilão NoZap: R$ ${fmtBR(currentPrice)}

💰 ECONOMIZE R$ ${fmtBR(savings)}!
🔥 ${savingsPercent}% MAIS BARATO!

⚡ Arremate agora: ${productUrl}`;

      console.log('📤 Compartilhando:', shareMessage);

      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const temShareNativo = (isIOS || isAndroid) && !!navigator.share;

      // 🐞 PONTO 96 — CAUSA-RAIZ DO "COMPARTILHAR NÃO FUNCIONA" (relatado pelo
      // dono, testando no desktop). O código baixava a foto do produto com
      // `await fetch(...)` ANTES de chamar window.open. Todo await gasta o
      // "user gesture" do clique, e sem gesto o navegador BLOQUEIA o popup —
      // o WhatsApp Web simplesmente nunca abria, sem erro nenhum na tela.
      // Pior: no desktop essa foto nem é usada (ela só serve pro
      // navigator.share do celular). Pagava o preço sem levar nada.
      // Agora, no desktop, o window.open é a PRIMEIRA coisa depois do clique,
      // sem nenhum await antes — o gesto é preservado e o popup abre.
      if (!temShareNativo) {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener');
        return;
      }

      // 📸 Só no celular: a foto vale a pena porque vai junto no share nativo.
      let productFile = null;
      const imageUrl = auction.image_urls?.[0];
      if (imageUrl) {
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            productFile = new File([blob], 'produto.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
          }
        } catch (err) {
          console.log('⚠️ Sem foto, só texto');
        }
      }

      // 📱 COMPARTILHA (nativo do celular)
      {
        if (productFile && navigator.canShare && navigator.canShare({ files: [productFile] })) {
          await navigator.share({
            title: '💰 Economia Garantida!',
            text: shareMessage,
            files: [productFile]
          });
        } else {
          await navigator.share({
            title: '💰 Economia Garantida!',
            text: shareMessage
          });
        }
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        const productUrl = `${window.location.origin}/l/${auction.id}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`🔥 Arremate: ${productUrl}`)}`, '_blank');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const refreshAuction = async () => {
    try {
      const { base44 } = await import('@/api/base44Client');
      const auctions = await base44.entities.Auction.filter({ id: localAuction.id });
      
      if (auctions && auctions.length > 0) {
        setLocalAuction(auctions[0]);
        setTempLogoUrl(auctions[0].supplier_logo_url || '');
      }
    } catch (err) {
      console.error('Erro ao buscar auction:', err);
    }
  };

  const handleUploadLogo = async (file) => {
    if (!file) return;
    
    setIsUploadingLogo(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      const result = await base44.integrations.Core.UploadFile({ file });
      
      if (result?.file_url) {
        await base44.entities.Auction.update(localAuction.id, { supplier_logo_url: result.file_url });
        
        await refreshAuction();
        
        alert('✅ Logo atualizada!');
        setShowLogoEditor(false);
      }
    } catch (err) {
      alert('❌ Erro ao enviar logo: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (error) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-gray-900 text-white border-red-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img 
                src={CompareAquiIcon}
                alt="CompareAQUI"
                className="w-12 h-12 rounded-full"
              />
              <span>CompareAQUI</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-amber-400">Comparação Indisponível</h3>
            <p className="text-gray-300 mb-4">{error}</p>

            {/* 🔦 PONTO 91 — a trilha real de cada fonte. Antes esta tela era
                totalmente cega: mesma frase pra chave sem cota, produto sem
                foto, ou nenhuma loja com preço. Agora dá pra ver o motivo. */}
            {(diagnostico?.attempts?.length > 0 || diagnostico?.fontes?.length > 0) && (
              <div className="text-left mb-6">
                <button
                  type="button"
                  onClick={() => setVerDiagnostico((v) => !v)}
                  className="text-[11px] text-sky-300 hover:text-sky-200 underline underline-offset-2"
                >
                  {verDiagnostico ? 'Ocultar' : 'Ver'} detalhes técnicos da busca
                </button>
                {verDiagnostico && (
                  <div className="mt-2 rounded-lg border border-white/10 bg-black/40 p-3 space-y-1 max-h-52 overflow-y-auto overflow-x-hidden">
                    {diagnostico?.query && (
                      <p className="text-[11px] text-gray-400 break-words">
                        Termo buscado: <span className="text-gray-200">"{diagnostico.query}"</span>
                        {' · '}Foto do produto: <span className={diagnostico.tinhaImagem ? 'text-emerald-400' : 'text-amber-400'}>
                          {diagnostico.tinhaImagem ? 'sim' : 'não'}
                        </span>
                      </p>
                    )}
                    {(diagnostico.attempts || diagnostico.fontes || []).map((linha, i) => (
                      <p key={i} className="text-[11px] text-gray-400 font-mono break-words leading-relaxed">• {linha}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        {/* 20/08/2026 (3ª rodada) — dono ADOROU o fundo translúcido esverdeado
            ("água meio transparente"), o pedido era só trocar a BORDA pra azul
            brilhante da marca CompareAQUI (não o fundo). Fundo voltou ao
            gradiente translúcido; borda agora é azul com um leve glow branco. */}
        <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full sm:max-w-lg md:max-w-2xl rounded-2xl bg-gradient-to-br from-gray-900 via-emerald-950/40 to-gray-900 text-white border-2 border-sky-400/80 ring-1 ring-white/25 shadow-2xl shadow-sky-500/20 max-h-[90vh] overflow-y-auto overflow-x-hidden">

          <DialogHeader>
            {/* 🩹 20/08/2026 — dono reportou "dois X" no fechar: este componente
                desenhava um botão de fechar próprio (absolute top-4 right-4) EM CIMA
                do botão nativo que o DialogContent já injeta (ver dialog.jsx) — mesmo
                bug do PONTO 87 (19/08/2026), só que aqui nunca tinha sido corrigido.
                Removido o botão manual; o nativo já fecha o modal sozinho. */}
            <DialogTitle className="text-xl sm:text-2xl pr-10">
              <img
                src={CompareAquiIcon}
                alt="CompareAQUI"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-2 shadow-lg"
              />
              <div className="min-w-0">
                {/* CompareAQUI mantém a própria cor azul (a do ícone/logo) mesmo dentro
                    do NoZap — pedido do dono: reforça que é uma plataforma INDEPENDENTE
                    validando o preço, não o próprio site se autoavaliando. O verde do
                    NoZap fica reservado pro que É do NoZap (preço, economia, vencedor). */}
                <div className="font-slab text-sky-400 font-bold text-xl sm:text-2xl">CompareAQUI</div>
                <div className="text-xs sm:text-sm font-normal text-gray-400">Plataforma Independente de Comparação de Preços</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            
            {/* TELA DE ESCOLHA - SUPPLIER SEM URL (SÓ PARA AUCTIONS) */}
            {!isProduct && isSupplierWithoutUrl && !comparisonData && !isLoading && !error && (
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                    <Factory className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Produto Direto do Fabricante</h3>
                  <p className="text-gray-400 mb-6">
                    Nenhuma URL do fabricante foi informada. Escolha como comparar:
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Botão 1: Site do Fabricante (desabilitado sem URL) */}
                  <Button
                    disabled={true}
                    className="w-full bg-gray-700 text-gray-400 cursor-not-allowed py-6"
                  >
                    <ExternalLink className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-bold">Site do Fabricante (preço exato)</div>
                      <div className="text-xs opacity-70">Requer URL do fornecedor</div>
                    </div>
                  </Button>

                  {/* Botão 2: Usar CompareAQUI (igual aba Arremate) */}
                  <Button
                    onClick={() => handleCompare(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-6"
                  >
                    <Sparkles className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-bold">Usar CompareAQUI (página de arremate)</div>
                      <div className="text-xs opacity-90">Mesma comparação dos produtos de arremate</div>
                    </div>
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  A busca no Google Shopping usa o título do produto para encontrar preços de referência
                </p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-blue-300 font-medium">
                  {isFactoryProduct ? 'Consultando fabricante...' : 'Analisando preços...'}
                </p>
              </div>
            )}

            {comparisonData && !isLoading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                <div ref={screenshotRef} className="space-y-4 p-4 bg-black/60 rounded-2xl">
                  
                  {/* 🏁 PONTO 96 (20/08/2026) — REESTRUTURAÇÃO. O card estava
                      comprido não por layout, mas por REPETIÇÃO: "preço médio",
                      "você economiza X / Y% mais barato" e "NoZap venceu, Y% menor
                      que o mercado" diziam a MESMA coisa três vezes, com o mesmo
                      número. Diminuir padding não resolveria isso; tirar a
                      redundância, sim. Os três viraram UM veredito.
                      Também havia DOIS heróis brigando (laranja gigante x verde
                      gigante) — dois heróis, nenhum herói. Agora a hierarquia é
                      por TAMANHO: o % é a manchete, os dois preços são a prova.
                      ⚠️ Cores e o glassmorphism do modal: intocados. */}

                  {/* FAIXA DO PRODUTO — contexto, não protagonista */}
                  <div className="flex items-center gap-3 px-1">
                    <img src={logoNoZap} alt="Leilão NoZap" className="h-7 sm:h-8 w-auto shrink-0 object-contain" />
                    <h3 className="text-white font-semibold text-sm sm:text-base leading-snug break-words min-w-0">
                      {localAuction.title}
                    </h3>
                  </div>

                  {/* VEREDITO — lê-se em 1 segundo: pago X, vale Y */}
                  <div className="bg-emerald-500/[0.07] border border-emerald-400/25 rounded-2xl p-5 sm:p-6 overflow-hidden">
                    {comparisonData.savingsPercent > 0 && (
                      <div className="text-center mb-5">
                        <div className="font-slab text-4xl sm:text-5xl font-black text-emerald-400 leading-none">
                          {comparisonData.savingsPercent}% MAIS BARATO
                        </div>
                      </div>
                    )}

                    <div className="flex items-stretch gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0 rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-2 py-3 text-center">
                        <div className="font-slab text-xl sm:text-3xl font-bold text-emerald-400 leading-tight break-words">
                          R$ {fmtBR((localAuction.current_price || localAuction.starting_price))}
                        </div>
                        <div className="text-[10px] sm:text-xs text-emerald-300/70 mt-1 uppercase tracking-wide">aqui</div>
                      </div>

                      <div className="shrink-0 self-center text-gray-500 text-lg sm:text-xl px-0.5">→</div>

                      <div className="flex-1 min-w-0 rounded-xl bg-orange-500/10 border border-orange-400/30 px-2 py-3 text-center">
                        <div className="font-slab text-xl sm:text-3xl font-bold text-orange-400 leading-tight break-words">
                          R$ {fmtBR((comparisonData.referencePrice || comparisonData.averageMarketPrice || comparisonData.cheapestMarketPrice))}
                        </div>
                        <div className="text-[10px] sm:text-xs text-orange-300/70 mt-1 uppercase tracking-wide">
                          {comparisonData.isFactoryDirect ? 'no fabricante' : 'no mercado'}
                        </div>
                      </div>
                    </div>

                    {comparisonData.savings > 0 && (
                      <p className="text-center text-sm sm:text-base text-emerald-300/90 mt-4">
                        você economiza <span className="font-bold text-emerald-400">R$ {fmtBR(comparisonData.savings)}</span>
                      </p>
                    )}

                    <p className="text-center text-[10.5px] text-gray-500 mt-1.5">
                      {comparisonData.isManualPrice
                        ? 'Preço inserido manualmente'
                        : `média de ${comparisonData.totalStoresAnalyzed || 'várias'} lojas, agora`}
                    </p>
                  </div>

                  {/* 🩺 20/08/2026 (5ª rodada) — dono mostrou o fluxo manual que "nunca
                      erra": botão direito na foto > Google Lens > aba "Correspondências
                      exatas". Confirmado: o SearchAPI tem search_type=exact_matches —
                      literalmente a mesma aba, mesma API que já usamos (PONTO 90 em
                      marketSearch.js). Três níveis de confiança agora, cada um com seu
                      selo — nunca finge a mesma certeza pros três casos. */}
                  {!comparisonData.isFactoryDirect && comparisonData.source && (
                    comparisonData.source === 'google_lens_exato' ? (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 -mt-2">
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        Correspondência EXATA por imagem (Google Lens) — mesmo produto, confirmado pelo próprio Google.
                      </div>
                    ) : comparisonData.source === 'google_lens_similar' ? (
                      <div className="flex items-center gap-2 text-[11px] text-sky-300/90 -mt-2">
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        Confirmado por imagem (Google Lens) — visualmente correspondente ao produto.
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 -mt-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Comparado só pelo nome — não foi possível confirmar por imagem nesta busca. Pode incluir marcas parecidas da mesma categoria.</span>
                      </div>
                    )
                  )}

                  {/* CARD 2.5: LOJAS COMPARADAS — PROVA (20/08/2026, pedido do dono) —
                      a API já devolvia comparisonData.comparisons (loja, produto achado,
                      preço) mas o modal só mostrava a MÉDIA, nunca a lista real que
                      comprova de onde ela veio. 20/08/2026 (2ª rodada): virou <div>
                      sem link/target="_blank" — o dono foi explícito: o cliente NUNCA
                      pode ser levado pra fora do site, nem pra "comprovar". A prova fica
                      só nos dados (loja, produto achado, preço). w-0+flex-1+min-w-0 +
                      overflow-hidden em cascata evita o vazamento de texto pro lado de
                      fora do card em qualquer largura de tela. */}
                  {!comparisonData.isFactoryDirect && sortedComparisons.length > 0 && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 overflow-hidden">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90 mb-3">
                        Lojas comparadas ({sortedComparisons.length})
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto overflow-x-hidden pr-1">
                        {sortedComparisons.slice(0, 10).map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedProof(item)}
                            className="w-full flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm overflow-hidden text-left hover:bg-white/[0.07] hover:border-sky-400/40 active:scale-[0.99] transition-all cursor-pointer"
                          >
                            {/* Foto real do produto, vinda da mesma fonte (Google
                                Shopping/Zoom) — a prova visual que dá pra trazer
                                pra dentro do site sem embutir a página externa. */}
                            {item.image ? (
                              <img
                                src={item.image}
                                alt=""
                                className="w-9 h-9 rounded-md object-cover border border-white/10 shrink-0 bg-white/5"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-white/5 border border-white/10 shrink-0" />
                            )}
                            {/* 🖼️ PONTO 95 — dono: "aumentar a logo da empresa" e
                                "esse MESMA IMAGEM não precisa mais aparecer, tem que
                                ser algo interno". Logo passou de 18px pra 32px e
                                virou a âncora visual da linha; os selos saíram.
                                O matchLevel continua vindo do backend e ainda manda
                                na ordenação/validação — só não polui mais a tela. */}
                            <LogoLoja item={item} size={32} className="shrink-0" />
                            <div className="w-0 flex-1 min-w-0">
                              <p className="text-gray-200 font-medium truncate">{item.store}</p>
                              <p className="text-[11px] text-gray-500 truncate">{item.productNameFound}</p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                              {item.price > 0 ? (
                                <span className="font-slab font-bold text-white">R$ {fmtBR(item.price)}</span>
                              ) : (
                                <span className="text-[10px] text-gray-500">sem preço</span>
                              )}
                              <ChevronRight className="w-4 h-4 text-sky-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* 🎛️ PONTO 96 — botões em GLASSMORPHISM, a mesma linguagem do
                    modal (vidro fosco translúcido). O verde chapado e o branco
                    chapado destoavam do resto e davam ar de formulário. Primário
                    com brilho sutil; secundário vira fantasma — botão de apoio
                    não precisa gritar. */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleShareComparai}
                    disabled={isSharing}
                    className="flex-1 h-12 rounded-xl border border-emerald-400/40 bg-emerald-500/15 backdrop-blur-md text-emerald-200 font-semibold hover:bg-emerald-500/25 hover:border-emerald-400/60 shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-50"
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Compartilhando...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar economia
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleCompare()}
                    disabled={isLoading}
                    title="Atualizar comparação"
                    aria-label="Atualizar comparação"
                    className="h-12 w-12 shrink-0 rounded-xl border border-white/15 bg-white/5 backdrop-blur-md text-gray-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 p-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {comparisonData?.isFactoryDirect && (
                  <Button
                    onClick={() => setShowLogoEditor(true)}
                    variant="outline"
                    className="w-full border-emerald-500 text-emerald-400 hover:bg-emerald-900/20"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Logo do Fabricante
                  </Button>
                )}

              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHE DA LOJA — 20/08/2026 (3ª rodada): clicar numa linha da
          lista de lojas agora abre este detalhe (foto grande + nome completo
          + preço), tudo dentro do site. Não abre a página da loja de verdade
          (Google/ML bloqueiam isso via X-Frame-Options — não é algo que dá
          pra contornar), então este modal deixa claro que é o resultado real
          retornado pela busca, sem fingir ser a página externa. */}
      {selectedProof && (
        <Dialog open={!!selectedProof} onOpenChange={(open) => !open && setSelectedProof(null)}>
          {/* 🌑 PONTO 94 — dono: "quando eu clicar pra abrir o modal, ao invés de
              ficar transparente, que está ficando transparente sobre transparente
              e feio, escurece o fundo pra aparecer o texto". Fundo SÓLIDO aqui.
              ⚠️ O modal PRINCIPAL continua translúcido de propósito — ele foi
              explícito: "o principal é deixar assim transparente mesmo, que está
              muito bonito, não muda nada". */}
          <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full sm:max-w-md rounded-2xl bg-[#0a0f1a] text-white border-2 border-sky-400/80 ring-1 ring-white/10 shadow-2xl shadow-black/80">
            <DialogHeader>
              <DialogTitle className="text-lg pr-8 flex items-center gap-2">
                <LogoLoja item={selectedProof} size={28} />
                <span className="truncate">{selectedProof.store}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {selectedProof.image ? (
                <img
                  src={selectedProof.image}
                  alt=""
                  className="w-full max-h-64 object-contain rounded-xl border border-white/10 bg-white/5"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-40 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                </div>
              )}

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90 mb-1">Produto encontrado</div>
                <p className="text-gray-200 break-words">{selectedProof.productNameFound || selectedProof.store}</p>
              </div>

              <div className="rounded-lg bg-white/[0.04] border border-white/10 px-4 py-3 text-center">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Preço encontrado</div>
                <div className="font-slab text-3xl font-black text-orange-400">R$ {fmtBR(selectedProof.price)}</div>
              </div>

              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                Resultado real, buscado agora mesmo no Google Shopping/Zoom. Não abrimos a página da loja
                aqui dentro porque elas mesmas bloqueiam isso por segurança — mas esse é o dado real que
                elas retornaram, sem sair do Leilão NoZap.
              </p>

              <Button
                onClick={() => setSelectedProof(null)}
                variant="outline"
                className="w-full border-sky-400 text-sky-300 hover:bg-sky-900/20"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL EDITOR DE LOGO */}
      <Dialog open={showLogoEditor} onOpenChange={setShowLogoEditor}>
        <DialogContent className="bg-gray-900 text-white border-blue-500">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />
              Editar Logo do Fabricante
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {tempLogoUrl && (
              <div className="text-center">
                <img 
                  src={tempLogoUrl} 
                  alt="Preview"
                  className="w-32 h-32 mx-auto object-contain bg-white rounded-lg p-3"
                />
              </div>
            )}

            <div>
              <Label className="text-gray-300 mb-2 block">Upload Nova Logo:</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadLogo(e.target.files[0]);
                  }
                }}
                disabled={isUploadingLogo}
                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Ou Cole a URL:</Label>
              <Input
                value={tempLogoUrl}
                onChange={(e) => setTempLogoUrl(e.target.value)}
                placeholder="https://..."
                className="bg-gray-800 border-gray-700 text-white"
                disabled={isUploadingLogo}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLogoEditor(false)}
                className="flex-1 border-gray-700"
                disabled={isUploadingLogo}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!tempLogoUrl.trim()) {
                    alert('Cole uma URL válida!');
                    return;
                  }
                  
                  setIsUploadingLogo(true);
                  try {
                    const { base44 } = await import('@/api/base44Client');
                    await base44.entities.Auction.update(localAuction.id, { supplier_logo_url: tempLogoUrl });
                    
                    await refreshAuction();
                    
                    alert('✅ Logo atualizada!');
                    setShowLogoEditor(false);
                  } catch (err) {
                    alert('❌ Erro: ' + err.message);
                  } finally {
                    setIsUploadingLogo(false);
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isUploadingLogo || !tempLogoUrl.trim()}
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}