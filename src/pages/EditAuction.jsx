import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const Auction = base44.entities.Auction;
const AppUser = base44.entities.AppUser;
const User = { me: () => base44.auth.me() };
const AuctionMessage = base44.entities.AuctionMessage;
const UploadFile = (params) => base44.integrations.Core.UploadFile(params);
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Save, Image, UploadCloud, Edit, Clock, RefreshCw, Link as LinkIcon, Upload } from 'lucide-react';

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed); // 🔧 FIX: endIndex (com I maiúsculo)
  return result;
};

export default function EditAuction() {
    const navigate = useNavigate();
    const location = useLocation();
    const auctionId = new URLSearchParams(location.search).get('id');
    const isTestMode = new URLSearchParams(location.search).get('test') === 'true';

    const [auction, setAuction] = useState(null);
    const [formData, setFormData] = useState({
      title: "",
      description: "",
      category: "outros",
      starting_price: 0,
      current_price: 0,
      increment: 0,
      end_time: "",
      product_source: "return_resale", // 🆕 ADICIONA CAMPO
      supplier_url: "", // 🆕 NOVO: URL do fornecedor
      supplier_logo_url: "", // 🆕 ADICIONA LOGO
      comparai_mode: "google_shopping", // 🆕 Modo padrão: Google Shopping
      manual_market_price: "" // 🆕 Preço manual quando Comparai não acha
    });
    const [imageUrls, setImageUrls] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
    const [reactivateTime, setReactivateTime] = useState("");

    const [supplierLogoPreview, setSupplierLogoPreview] = useState(""); // 🆕 PREVIEW

    const fileInputRef = useRef(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        
        // 🆕 PROTEÇÃO: Se não tem ID, redireciona silenciosamente SEM alert
        if (!auctionId) {
            navigate(createPageUrl("Home"), { replace: true });
            return;
        }
        
        try {
            let userFound = null;
            const savedUserJSON = localStorage.getItem('currentUser');
            if (savedUserJSON) {
                userFound = JSON.parse(savedUserJSON);
            } else {
                userFound = await User.me();
            }

            if (userFound?.role !== 'admin') {
                 alert("Acesso negado. Apenas administradores podem editar leilões.");
                 navigate(createPageUrl("Home"), { replace: true });
                 return;
            }

            if (isTestMode) {
                console.log("TEST MODE: Edição de Leilão - Carregando dados.");
            }
            const auctionData = await Auction.filter({ id: auctionId });
            if (auctionData.length === 0) {
                alert("Leilão não encontrado.");
                navigate(createPageUrl("Home"));
                return;
            }
            
            const currentAuction = auctionData[0];
            setAuction(currentAuction);
            setImageUrls(currentAuction.image_urls || []);
            
            const utcDate = new Date(currentAuction.end_time);

            const brtOptions = {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
                hourCycle: 'h23',
                timeZone: 'America/Sao_Paulo'
            };
            const parts = new Intl.DateTimeFormat('fr-CA', brtOptions).formatToParts(utcDate);
            const brtYear = parts.find(p => p.type === 'year').value;
            const brtMonth = parts.find(p => p.type === 'month').value;
            const brtDay = parts.find(p => p.type === 'day').value;
            const brtHour = parts.find(p => p.type === 'hour').value;
            const brtMinute = parts.find(p => p.type === 'minute').value;

            const brtISOTime = `${brtYear}-${brtMonth}-${brtDay}T${brtHour}:${brtMinute}`;

            setFormData({
              title: currentAuction.title || "",
              description: currentAuction.description || "",
              category: currentAuction.category || "outros",
              starting_price: currentAuction.starting_price || 0,
              current_price: currentAuction.current_price || currentAuction.starting_price || 0,
              increment: currentAuction.increment || 0,
              end_time: brtISOTime,
              product_source: currentAuction.product_source || "return_resale", // 🆕 CARREGA ORIGEM
              supplier_url: currentAuction.source_url || "", // 🆕 CARREGA source_url
              supplier_logo_url: currentAuction.supplier_logo_url || "", // 🆕 CARREGA LOGO
              comparai_mode: currentAuction.comparai_mode || "google_shopping", // 🆕 CARREGA MODO
              manual_market_price: currentAuction.manual_market_price || "" // 🆕 CARREGA PREÇO MANUAL
            });
            
            setSupplierLogoPreview(currentAuction.supplier_logo_url || ""); // 🆕 PREVIEW

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            alert("Erro ao carregar dados. Verifique o console.");
            navigate(createPageUrl("Home"));
        } finally {
            setIsLoading(false);
        }
    }, [auctionId, navigate, isTestMode]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = reorder(imageUrls, result.source.index, result.destination.index);
        setImageUrls(items);
    };

    const handleRemoveImage = (indexToRemove) => {
        setImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleAddImages = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        const uploadedUrls = [];
        
        for (const file of files) {
            try {
                if (isTestMode) {
                    console.log(`TEST MODE: Simulando upload de arquivo: ${file.name}`);
                    uploadedUrls.push(`https://via.placeholder.com/150?text=TestImage${Date.now()}`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    continue;
                }
                const result = await UploadFile({ file });
                if(result?.file_url) {
                    uploadedUrls.push(result.file_url);
                }
            } catch (error) {
                console.error("Falha no upload do arquivo:", file.name, error);
                alert(`Falha ao enviar a imagem: ${file.name}`);
            }
        }
        
        setImageUrls(prev => [...prev, ...uploadedUrls]);
        setIsUploading(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // 🆕 HANDLER PARA UPLOAD DE LOGO
    const handleSupplierLogoUpload = async (file) => {
        if (!file) return;
        
        setIsUploading(true);
        try {
            if (isTestMode) {
                const fakeUrl = `https://via.placeholder.com/150?text=TestLogo${Date.now()}`;
                setFormData(prev => ({ ...prev, supplier_logo_url: fakeUrl }));
                setSupplierLogoPreview(fakeUrl);
                setIsUploading(false);
                return;
            }
            
            // UploadFile is already imported at the top, no need for dynamic import here.
            const result = await UploadFile({ file });
            
            if (result?.file_url) {
                setFormData(prev => ({ ...prev, supplier_logo_url: result.file_url }));
                setSupplierLogoPreview(result.file_url);
                alert("✅ Logo enviada com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao enviar logo:", error);
            alert("❌ Erro ao enviar logo. Tente novamente.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            // 🆕 VALIDAÇÃO PARA supplier_url
            if (formData.comparai_mode === 'supplier' && !formData.supplier_url.trim()) {
            alert("⚠️ Para buscar preço no site do fornecedor, você DEVE inserir a URL!");
            setIsSaving(false);
            return;
            }

            if (isTestMode) {
                console.log("TEST MODE: Simulando salvamento de alterações.");
                await new Promise(resolve => setTimeout(resolve, 500));
                alert("✅ Alterações salvas!");
                setIsSaving(false);
                navigate(createPageUrl("Home"), { replace: true });
                return;
            }

            // 🔧 CONVERTE HORÁRIO PARA UTC
            const brtDateTimeString = formData.end_time;
            const localDate = new Date(brtDateTimeString);
            const utcEndTimeString = localDate.toISOString();

            console.log(`📅 [SAVE] BRT Input: ${brtDateTimeString}`);
            console.log(`📅 [SAVE] UTC Output: ${utcEndTimeString}`);

            const now = new Date();
            const endDate = new Date(utcEndTimeString);
            const isFuture = endDate.getTime() > now.getTime();
            
            console.log(`⏰ [SAVE] Agora: ${now.toISOString()}`);
            console.log(`⏰ [SAVE] Término: ${utcEndTimeString}`);
            console.log(`⏰ [SAVE] É futuro?: ${isFuture}`);

            // 🔧 DEFINE O STATUS BASEADO NA DATA
            let newStatus = auction.status;
            let isReactivating = false;

            if (isFuture && (auction.status === 'ended' || auction.status === 'sold')) {
                newStatus = 'active';
                isReactivating = true;
                console.log(`✅ [SAVE] Mudando status de "${auction.status}" para "active" (data futura)`);
            } else if (!isFuture && auction.status === 'active') {
                newStatus = 'ended';
                console.log(`⚠️ [SAVE] Mudando status de "active" para "ended" (data passada)`);
            }
            
            // 🆕 LOG ANTES DE SALVAR
            console.log(`🏭 [SAVE] Salvando source_url:`, formData.supplier_url || null);

            const updatePayload = {
                ...formData,
                end_time: utcEndTimeString,
                status: newStatus,
                image_urls: imageUrls,
                starting_price: parseFloat(formData.starting_price) || 0,
                current_price: parseFloat(formData.current_price) || 0,
                increment: parseFloat(formData.increment) || 0,
                source_url: formData.supplier_url || null, // 🆕 SALVA supplier_url como source_url
                supplier_logo_url: formData.supplier_logo_url || null, // 🆕 SALVA LOGO
                comparai_mode: formData.comparai_mode || "google_shopping", // 🆕 SALVA MODO
                manual_market_price: formData.manual_market_price ? parseFloat(formData.manual_market_price) : null // 🆕 SALVA PREÇO MANUAL
            };

            // 🎯 SE REATIVOU, LIMPA VENCEDOR E MENSAGENS
            if (isReactivating) {
                console.log(`🔄 [SAVE] Reativando: limpando vencedor e removendo mensagens de encerramento`);
                updatePayload.winner_id = null;
                updatePayload.winner_name = null;
                updatePayload.order_status = null;
                updatePayload.last_processed_bid_time = null;

                // Remove mensagens de "ARREMATADO"
                const allMessages = await AuctionMessage.filter({ auction_id: auctionId });
                for (const msg of allMessages) {
                    if (
                        msg.message_type === 'winner_announcement' ||
                        (msg.is_system_message && (
                            msg.content.includes('ARREMATADO') ||
                            msg.content.includes('VENDIDO') ||
                            msg.content.includes('Parabéns') ||
                            msg.content.includes('vencedor') ||
                            msg.content.includes('arrematou')
                        ))
                    ) {
                        console.log(`   ❌ Removendo: "${msg.content}"`);
                        await AuctionMessage.delete(msg.id);
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }
            
            console.log(`💾 [SAVE] Salvando com payload:`, updatePayload);
            await Auction.update(auctionId, updatePayload);
            
            setIsSaving(false);
            
            // 🆕 LIMPA FLAGS DE REDIRECIONAMENTO
            sessionStorage.removeItem('loginFromPartners');
            
            if (isReactivating) {
                alert("✅ Leilão REATIVADO com sucesso! Status: ATIVO. (Você será redirecionado para a sala do leilão)");
                navigate(createPageUrl("AuctionRoom") + `?id=${auctionId}`, { replace: true });
            } else {
                alert("✅ Leilão atualizado com sucesso!");
                navigate(createPageUrl("Home"), { replace: true });
            }
            
        } catch (error) {
            console.error("Erro ao salvar alterações:", error);
            alert("❌ Erro ao salvar alterações. Tente novamente.");
            setIsSaving(false);
        }
    };

    // 🆕 FUNÇÃO REATIVAR COM BOTÃO DEDICADO
    const handleReactivate = async () => {
        if (!reactivateTime) {
            alert("⚠️ Por favor, defina uma nova data e hora para reativar o leilão.");
            return;
        }
        
        if (!confirm("⚠️ ATENÇÃO:\n\n- O histórico de LANCES será mantido\n- Mensagens de ARREMATADO serão removidas\n- Vencedor será limpo\n- Status mudará para ATIVO\n\nContinuar?")) {
            return;
        }
        
        setIsReactivating(true);
        try {
            console.log(`🔄 INICIANDO REATIVAÇÃO...`);
            
            // 🔧 CALCULA NOVO HORÁRIO (UTC) - CORRIGIDO
            const [datePart, timePart] = reactivateTime.split('T');
            const [year, month, day] = datePart.split('-');
            const [hour, minute] = timePart.split(':');
            
            // Cria data em Brasília (UTC-3)
            const brtDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00-03:00`);
            const utcEndTimeString = brtDate.toISOString();

            console.log(`⏰ Input BRT: ${reactivateTime}`);
            console.log(`⏰ Convertido UTC: ${utcEndTimeString}`);
            console.log(`⏰ Verificação: ${new Date(utcEndTimeString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

            // 🔧 BUSCA E DELETA MENSAGENS DE ENCERRAMENTO
            console.log(`🧹 Buscando mensagens de encerramento...`);
            const allMessages = await AuctionMessage.filter({ auction_id: auctionId });
            
            let deletedCount = 0;
            
            for (const msg of allMessages) {
                const shouldDelete = 
                    msg.message_type === 'winner_announcement' ||
                    (msg.is_system_message && (
                        msg.content.includes('ARREMATADO') ||
                        msg.content.includes('VENDIDO') ||
                        msg.content.includes('Parabéns') ||
                        msg.content.includes('vencedor') ||
                        msg.content.includes('arrematou')
                    ));
                
                if (shouldDelete) {
                    console.log(`   ❌ Deletando: "${msg.content}"`);
                    await AuctionMessage.delete(msg.id);
                    deletedCount++;
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            console.log(`✅ ${deletedCount} mensagens deletadas`);

            // 🔧 ATUALIZA O LEILÃO
            console.log(`✅ Atualizando leilão para ATIVO...`);
            await Auction.update(auctionId, {
                status: 'active',
                end_time: utcEndTimeString,
                winner_id: null,
                winner_name: null,
                order_status: null,
                last_processed_bid_time: null,
            });
            
            console.log(`✅ Leilão reativado com sucesso!`);
            
            setIsReactivating(false);
            
            // 🆕 LIMPA FLAGS DE REDIRECIONAMENTO
            sessionStorage.removeItem('loginFromPartners');
            
            alert(`✅ Leilão reativado!\n\n- ${deletedCount} mensagens removidas\n- Status: ATIVO\n- Histórico de lances mantido\n- Termina: ${new Date(utcEndTimeString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
            
            // Redireciona para a sala do leilão
            navigate(createPageUrl("AuctionRoom") + `?id=${auctionId}`, { replace: true });
            
        } catch (error) {
            console.error("❌ Erro ao reativar:", error);
            alert("❌ Erro ao reativar o leilão. Tente novamente.");
            setIsReactivating(false);
        }
    };

    const handleDeleteAuction = async () => {
        if (!window.confirm("Tem certeza que deseja DELETAR este leilão? Esta ação é irreversível e removerá todos os dados associados.")) {
            return;
        }

        setIsDeleting(true);
        try {
            if (isTestMode) {
                console.log("TEST MODE: Simulando exclusão de leilão.");
                await new Promise(resolve => setTimeout(resolve, 500));
                alert("✅ Leilão excluído!");
                setIsDeleting(false);
                navigate(createPageUrl("Home"), { replace: true });
                return;
            }

            await Auction.delete(auctionId);
            
            setIsDeleting(false);
            
            // 🆕 LIMPA FLAGS DE REDIRECIONAMENTO
            sessionStorage.removeItem('loginFromPartners');
            
            alert("✅ Leilão excluído com sucesso!");
            
            navigate(createPageUrl("Home"), { replace: true });
            
        } catch (error) {
            console.error("Erro ao deletar leilão:", error);
            alert("❌ Erro ao deletar o leilão. Tente novamente.");
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-gray-500" />
          </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-800 hidden sm:block">
                        {isTestMode && <span className="text-orange-500">[MODO TESTE] </span>}
                        Editar Leilão
                    </h1>
                     <Button onClick={handleSaveChanges} disabled={isSaving || isUploading || isDeleting}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Alterações
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Image className="w-5 h-5 text-gray-600" />
                           Fotos do Leilão
                        </CardTitle>
                        <p className="text-sm text-gray-500">Arraste as fotos para reordenar. A primeira foto será a capa.</p>
                    </CardHeader>
                    <CardContent>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="image-list" direction="horizontal">
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6"
                                    >
                                        {imageUrls.map((url, index) => (
                                            <Draggable key={url + index} draggableId={url + index} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`relative group border-2 rounded-lg aspect-square overflow-hidden shadow-sm ${snapshot.isDragging ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}`}
                                                    >
                                                        <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                                        <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                                                            {index === 0 ? 'Capa' : index + 1}
                                                        </div>
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="destructive" size="icon" className="w-7 h-7" onClick={() => handleRemoveImage(index)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <div {...provided.dragHandleProps} className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-move bg-white/80 p-1 rounded">
                                                            <GripVertical className="w-4 h-4 text-gray-600" />
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                        
                        <div className="mt-6 flex justify-center">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleAddImages}
                                className="hidden"
                            />
                            <Button 
                                variant="outline" 
                                className="w-full md:w-auto"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || isSaving || isDeleting}
                            >
                                {isUploading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> Adicionar Fotos</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="w-5 h-5 text-gray-600" />
                      Detalhes do Leilão
                    </CardTitle>
                    <p className="text-sm text-gray-500">Ajuste as informações e valores do leilão.</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="title">Título do Produto</Label>
                      <Input id="title" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} className="mt-1" />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} className="mt-1 min-h-[120px]" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="category">Categoria</Label>
                             <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="eletronicos">📱 Eletrônicos & Celulares</SelectItem>
                                <SelectItem value="eletrodomesticos">🔌 Eletrodomésticos</SelectItem>
                                <SelectItem value="moveis_decoracao">🛋️ Móveis & Decoração</SelectItem>
                                <SelectItem value="casa_jardim">🏡 Casa & Jardim</SelectItem>
                                <SelectItem value="ferramentas">🛠️ Ferramentas</SelectItem>
                                <SelectItem value="roupas_acessorios">👕 Roupas & Acessórios</SelectItem>
                                <SelectItem value="esportes_lazer">⚽ Esportes & Lazer</SelectItem>
                                <SelectItem value="brinquedos_hobbies">🧸 Brinquedos & Hobbies</SelectItem>
                                <SelectItem value="livros_midia">📚 Livros & Mídia</SelectItem>
                                <SelectItem value="veiculos_pecas">🚗 Veículos & Peças</SelectItem>
                                <SelectItem value="instrumentos_musicais">🎸 Instrumentos Musicais</SelectItem>
                                <SelectItem value="beleza_cuidado_pessoal">💅 Beleza & Cuidado Pessoal</SelectItem>
                                <SelectItem value="outros">🎯 Outros</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>

                        {/* 🆕 NOVO: ORIGEM DO PRODUTO */}
                        <div>
                            <Label htmlFor="product_source">Origem do Produto</Label>
                            <Select value={formData.product_source} onValueChange={(value) => {
                              handleInputChange("product_source", value);
                              // Clear supplier logo if product source is not factory new
                              if (value === 'return_resale') {
                                setFormData(prev => ({ ...prev, supplier_logo_url: "", comparai_mode: "google_shopping" }));
                                setSupplierLogoPreview("");
                              }
                            }}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="factory_new">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span>✨ Novo de Fábrica</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="return_resale">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                    <span>🔥 Arremate/Devolução</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                              {formData.product_source === 'factory_new' 
                                ? '✅ Produto novo com garantia do fabricante' 
                                : '📦 Produto de arremate/devolução, sem garantia'}
                            </p>
                        </div>
                    </div>

                    {/* 🆕 MODO COMPARAI */}
                    <div className="mt-4">
                        <Label htmlFor="comparai_mode">🔍 Onde a Comparai vai buscar o preço?</Label>
                        <Select value={formData.comparai_mode} onValueChange={(value) => handleInputChange("comparai_mode", value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="supplier">
                              <div className="flex items-center gap-2">
                                <span>🏭 Site do Fornecedor (preço exato)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="google_shopping">
                              <div className="flex items-center gap-2">
                                <span>🔎 Usar Comparai (página de arremate)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.comparai_mode === 'supplier' 
                            ? '🏭 A Comparai buscará o preço diretamente no site do fornecedor (precisa inserir URL abaixo)' 
                            : '🔎 Mesma comparação usada nos produtos de arremate'}
                        </p>
                    </div>

                    {/* 🆕 URL DO FORNECEDOR + LOGO (APENAS SE comparai_mode FOR 'supplier') */}
                    {formData.comparai_mode === 'supplier' && (
                        <div className="bg-green-900/20 border-2 border-green-500/50 rounded-xl p-4 space-y-4">
                            <div>
                                <Label htmlFor="supplier_url" className="text-sm font-bold text-green-300 flex items-center gap-2 mb-2">
                                    <LinkIcon className="w-4 h-4" />
                                    🏭 URL do Fornecedor (para Comparai) *
                                </Label>
                                <Input
                                    id="supplier_url"
                                    value={formData.supplier_url}
                                    onChange={(e) => handleInputChange("supplier_url", e.target.value)}
                                    placeholder="https://www.fornecedor.com.br/produto/123"
                                    className="bg-gray-100 border-green-600 text-gray-900 placeholder-gray-500 focus:border-green-400"
                                    required={formData.product_source === 'factory_new'}
                                />
                                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                                    <img 
                                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png"
                                        alt="Comparai"
                                        className="w-4 h-4 rounded-full"
                                    />
                                    <span>A Comparai usará esta URL para buscar o preço oficial!</span>
                                </p>
                            </div>

                            {/* 🆕 UPLOAD DE LOGO DO FABRICANTE */}
                            <div>
                                <Label className="text-sm font-bold text-green-700 flex items-center gap-2 mb-2">
                                    <Upload className="w-4 h-4" />
                                    🎨 Logo do Fabricante (opcional)
                                </Label>
                                
                                {supplierLogoPreview ? (
                                  <div className="relative w-32 h-32 mx-auto mb-2">
                                    <img 
                                      src={supplierLogoPreview} 
                                      alt="Logo Preview"
                                      className="w-full h-full object-contain rounded-lg border-2 border-green-500 bg-white p-2"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, supplier_logo_url: "" }));
                                        setSupplierLogoPreview("");
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="border-2 border-dashed border-green-600 rounded-lg p-4 text-center hover:bg-green-50 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById('supplier-logo-input').click()}
                                  >
                                    <UploadCloud className="w-8 h-8 mx-auto mb-2 text-green-600" />
                                    <p className="text-xs text-green-700">
                                      Clique para fazer upload da logo do fabricante
                                    </p>
                                  </div>
                                )}
                                
                                <input
                                  id="supplier-logo-input"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={isUploading || isSaving || isDeleting}
                                  onChange={(e) => {
                                    if (e.target.files[0]) {
                                      handleSupplierLogoUpload(e.target.files[0]);
                                    }
                                  }}
                                />
                                
                                <p className="text-xs text-green-700 mt-2">
                                  Esta logo aparecerá no card "Preço no Fabricante" da Comparai
                                </p>
                            </div>

                            {/* 🆕 PREÇO MANUAL */}
                            <div className="border-t border-green-500/30 pt-4 mt-4">
                                <Label htmlFor="manual_market_price" className="text-sm font-bold text-orange-600 flex items-center gap-2 mb-2">
                                    ✏️ Preço Manual (quando Comparai não encontrar)
                                </Label>
                                <Input
                                    id="manual_market_price"
                                    type="number"
                                    step="0.01"
                                    value={formData.manual_market_price}
                                    onChange={(e) => handleInputChange("manual_market_price", e.target.value)}
                                    placeholder="Ex: 499.90"
                                    className="bg-gray-100 border-orange-400 text-gray-900 placeholder-gray-500 focus:border-orange-500"
                                />
                                <p className="text-xs text-orange-600 mt-2">
                                    ⚠️ Se preenchido, a Comparai usará este valor ao invés de buscar automaticamente
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="starting_price">Preço Inicial (R$)</Label>
                        <Input id="starting_price" type="number" step="0.01" value={formData.starting_price} onChange={(e) => handleInputChange('starting_price', e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="current_price">Preço Atual (R$)</Label>
                        <Input id="current_price" type="number" step="0.01" value={formData.current_price} onChange={(e) => handleInputChange('current_price', e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="increment">Incremento (R$)</Label>
                        <Input id="increment" type="number" step="0.01" value={formData.increment} onChange={(e) => handleInputChange('increment', e.target.value)} className="mt-1" />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Label htmlFor="end_time" className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        Data e Hora de Término
                      </Label>
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => handleInputChange('end_time', e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        O horário acima é exibido no fuso horário de Brasília (UTC-3). Se a data for futura, o leilão será ativado. Se for passada, será encerrado.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 🆕 CARD DE REATIVAR LEILÃO */}
                {auction && (auction.status === 'ended' || auction.status === 'sold') && (
                    <Card className="border-orange-400 bg-orange-50/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700">
                                <RefreshCw className="w-5 h-5" />
                                Reativar Leilão
                            </CardTitle>
                            <p className="text-sm text-orange-600">
                                Este leilão já terminou. Você pode reativá-lo para uma nova rodada, mas o vencedor anterior será removido. O horário acima é exibido no fuso horário de Brasília (UTC-3).
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="reactivate_time">Nova Data e Hora de Término</Label>
                                <Input
                                    id="reactivate_time"
                                    type="datetime-local"
                                    value={reactivateTime}
                                    onChange={(e) => setReactivateTime(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <Button
                                onClick={handleReactivate}
                                disabled={isReactivating || isSaving || isUploading || isDeleting}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                            >
                                {isReactivating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reativando...</>
                                ) : (
                                    <><RefreshCw className="w-4 h-4 mr-2" /> Reativar e Salvar</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-red-400 bg-red-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <Trash2 className="w-5 h-5" />
                            Excluir Leilão
                        </CardTitle>
                        <p className="text-sm text-red-600">
                            Esta ação excluirá permanentemente o leilão e todos os dados associados. Esta ação é irreversível.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAuction}
                            disabled={isDeleting || isSaving || isUploading}
                            className="w-full"
                        >
                            {isDeleting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Excluindo...</>
                            ) : (
                                <><Trash2 className="w-4 h-4 mr-2" /> Excluir Leilão Permanentemente</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}