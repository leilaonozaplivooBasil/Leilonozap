import React, { useState, useEffect, useRef } from 'react';
import { fmtBR } from '@/lib/money';
import CompareAquiLogo from '@/assets/compareaqui-logo.webp';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Sparkles, ExternalLink, Share2, Edit, Upload, Loader2, RefreshCw, AlertTriangle, Factory, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { comparaiPrices } from '@/functions/comparaiPrices';

export default function ComparaiModal({ auction, isProduct = false, onClose }) {
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);
  
  const [localAuction, setLocalAuction] = useState(auction);
  
  console.log('✅ ComparaiModal inicializado com:', { auctionId: auction.id, title: auction.title });
  
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState(localAuction?.supplier_logo_url || '');

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
    console.error('❌ ComparaiModal: auction inválido!', auction);
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
        response = await comparaiPrices(payload);
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
      
      if (err.response?.data?.error) {
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
      const productUrl = `${window.location.origin}/AuctionRoom?id=${auction.id}`;
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

      // 📸 TENTA BAIXAR FOTO DO PRODUTO
      let productFile = null;
      const imageUrl = auction.image_urls?.[0];
      
      if (imageUrl) {
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            productFile = new File([blob], 'produto.jpg', { 
              type: 'image/jpeg',
              lastModified: Date.now()
            });
          }
        } catch (err) {
          console.log('⚠️ Sem foto, só texto');
        }
      }

      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      // 📱 COMPARTILHA
      if ((isIOS || isAndroid) && navigator.share) {
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
      } else {
        // Desktop
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        const productUrl = `${window.location.origin}/AuctionRoom?id=${auction.id}`;
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
            <p className="text-gray-300 mb-6">{error}</p>
            <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white border-blue-500/30 max-h-[90vh] overflow-y-auto">
          
          <button onClick={onClose} className="absolute top-4 right-4 z-20 text-white hover:text-red-400 transition-colors p-2" disabled={isSharing}>
            <X className="w-6 h-6" />
          </button>

          <DialogHeader>
            <DialogTitle className="text-2xl pr-12">
              <img 
                src={CompareAquiIcon}
                alt="CompareAQUI"
                className="w-16 h-16 rounded-full bg-white p-2 shadow-lg"
              />
              <div>
                <div className="text-blue-400 font-bold text-2xl">CompareAQUI</div>
                <div className="text-sm font-normal text-gray-400">Plataforma Independente de Comparação de Preços</div>
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

                  {/* Botão 2: Usar Comparai (igual aba Arremate) */}
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
                
                <div ref={screenshotRef} className="space-y-4 p-4 bg-black rounded-xl">
                  
                  {/* CARD 1: LANCE NOZAP */}
                  <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-xl p-5">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
                          alt="NoZap"
                          className="w-12 h-12 rounded-full border-2 border-green-400"
                        />
                        <div>
                          <h3 className="text-white font-bold text-lg mb-1">{localAuction.title}</h3>
                          <span className="text-green-400 text-sm font-semibold">Site Analisado - Leilão NoZap</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl md:text-5xl font-bold text-green-400">
                          R$ {fmtBR((localAuction.current_price || localAuction.starting_price))}
                        </div>
                        <div className="text-green-300 text-sm mt-1">Lance Atual neste Site</div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: FABRICANTE/MERCADO */}
                  {comparisonData.isFactoryDirect && comparisonData.comparisons?.length > 0 ? (
                    <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-2 border-blue-500 rounded-xl p-6 text-center">
                      <div className="text-blue-300 text-xs font-medium mb-4 uppercase">Preço no Fabricante</div>
                      
                      {localAuction.supplier_logo_url && (
                        <img 
                          src={localAuction.supplier_logo_url} 
                          alt="Logo"
                          className="w-24 h-24 mx-auto object-contain bg-white rounded-xl p-2 shadow-lg mb-3"
                        />
                      )}
                      
                      <div className="text-blue-200 text-sm font-semibold mb-3">
                        {comparisonData.comparisons[0].store}
                      </div>
                      
                      <div className="text-4xl font-black text-white">
                        R$ {fmtBR(comparisonData.comparisons[0].price)}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-orange-900/30 to-red-900/20 border-2 border-orange-500 rounded-xl p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <img 
                          src={CompareAquiIcon}
                          alt="CompareAQUI"
                          className="w-10 h-10"
                        />
                        <div className="text-orange-300 text-sm font-bold uppercase">{comparisonData.priceLabel || 'Preço Médio do Mercado'}</div>
                      </div>
                      
                      <div className="text-5xl font-black text-orange-400 mb-2">
                        R$ {fmtBR((comparisonData.referencePrice || comparisonData.averageMarketPrice || comparisonData.cheapestMarketPrice))}
                      </div>
                      
                      <div className="text-orange-300 text-sm">
                        {comparisonData.isManualPrice 
                          ? 'Preço inserido manualmente' 
                          : `Preço médio entre ${comparisonData.totalStoresAnalyzed || 'várias'} lojas`}
                      </div>
                    </div>
                  )}

                  {/* CARD 3: ECONOMIA */}
                  {comparisonData.savings > 0 && (
                    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-2 border-green-500 rounded-xl p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <img 
                          src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/93fa90082_image.png"
                          alt="NoZap"
                          className="w-10 h-10"
                        />
                        <div className="text-green-300 text-sm font-bold uppercase">Você Economiza</div>
                      </div>
                      
                      <div className="text-6xl font-black text-green-400 mb-2">
                        R$ {fmtBR(comparisonData.savings)}
                      </div>
                      
                      <div className="text-2xl font-bold text-green-300">
                        {comparisonData.savingsPercent}% MAIS BARATO!
                      </div>
                    </div>
                  )}

                  {/* CARD 4: VENCEDOR */}
                  {comparisonData.savings > 0 && (
                    <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500 rounded-xl p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                        <Trophy className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">LEILÃO NOZAP VENCEU</h3>
                      
                      <p className="text-green-300 text-lg">
                        O preço do Leilão NoZap é <span className="font-bold text-yellow-300">
                          {comparisonData.savingsPercent}%
                        </span> menor que {comparisonData.isFactoryDirect ? 'o fabricante' : 'o mercado'}!
                      </p>
                    </div>
                  )}

                </div>

                {/* BOTÃO COMPARTILHAR - SIMPLES */}
                <Button
                  onClick={handleShareComparai}
                  disabled={isSharing}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 text-lg shadow-lg disabled:opacity-50"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Compartilhando...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5 mr-2" />
                      Compartilhar essa economia
                    </>
                  )}
                </Button>

                {/* OUTROS BOTÕES */}
                <div className="flex flex-col gap-3">
                  {isFactoryProduct && comparisonData.comparisons?.[0]?.url && (
                    <Button
                      onClick={() => window.open(comparisonData.comparisons[0].url, '_blank')}
                      variant="outline"
                      className="w-full border-blue-500 text-blue-400 hover:bg-blue-900/20"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver no Site do Fabricante
                    </Button>
                  )}

                  <Button 
                    onClick={() => handleCompare()} 
                    variant="outline" 
                    className="w-full border-blue-500 text-blue-400 hover:bg-blue-900/20"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar Comparação
                  </Button>
                </div>

                {comparisonData?.isFactoryDirect && (
                  <Button
                    onClick={() => setShowLogoEditor(true)}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-400 hover:bg-blue-900/20"
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