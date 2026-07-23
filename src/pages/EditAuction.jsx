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
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Save, Image, UploadCloud, Edit, Clock, RefreshCw, Link as LinkIcon, Upload, Zap, Moon, CalendarDays } from 'lucide-react';

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed); // 🔧 FIX: endIndex (com I maiúsculo)
  return result;
};

// Converte uma Date (instante real) para o formato do input datetime-local em horário de Brasília
// (YYYY-MM-DDTHH:mm). Mesmo padrão do carregamento do end_time — Safari no Mac é bugado com
// datetime-local, então os botões de reativação rápida setam este valor diretamente (não dependem
// do usuário mexer no seletor nativo).
function toBrtLocal(date) {
    const parts = new Intl.DateTimeFormat('fr-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Sao_Paulo',
    }).formatToParts(date);
    const g = (t) => parts.find((p) => p.type === t).value;
    return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
}
// Presets de reativação rápida (ícone + rótulo → minutos a partir de agora)
// Relâmpago (+3/+5/+10min): apresentação rápida ao vivo, demonstração em tempo real, ativação de engajamento
const REACTIVATE_PRESETS = [
    { icon: Zap, label: '+3min', min: 3 },
    { icon: Zap, label: '+5min', min: 5 },
    { icon: Zap, label: '+10min', min: 10 },
    { icon: Zap, label: '+1h', min: 60 },
    { icon: Moon, label: '+6h', min: 360 },
    { icon: Moon, label: '+12h', min: 720 },
    { icon: Moon, label: '+24h', min: 1440 },
    { icon: CalendarDays, label: '+3 dias', min: 4320 },
    { icon: CalendarDays, label: '+7 dias', min: 10080 },
];

// Converte o valor do input datetime-local (YYYY-MM-DDTHH:mm) para exibição DD/MM/AAAA, HH:MM
function formatBrtLabel(value) {
    if (!value) return '';
    const [date, time] = value.split('T');
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}, ${time || ''}`.trim();
}

// Abre o seletor nativo (calendário/hora) ao clicar em qualquer parte do campo — mais fluido que
// só o ícone. showPicker() precisa de gesto do usuário (onClick garante); try/catch p/ navegadores antigos.
function abrirSeletorNativo(e) {
    try { e.currentTarget.showPicker?.(); } catch { /* fallback: input segue editável normalmente */ }
}

export default function EditAuction() {
    const navigate = useNavigate();
    const location = useLocation();
    const auctionId = new URLSearchParams(location.search).get('id');
    const isTestMode = new URLSearchParams(location.search).get('test') === 'true';
    const fromPage = location.state?.from || sessionStorage.getItem('editAuctionFrom') || 'Home';

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
    const [reactivatePreset, setReactivatePreset] = useState(720); // qual botão rápido está ativo (default +12h)

    // aplica um preset rápido: agora + X minutos, no formato BRT do input
    const aplicarPresetReativacao = (min) => {
        setReactivatePreset(min);
        setReactivateTime(toBrtLocal(new Date(Date.now() + min * 60000)));
    };

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

            if (userFound?.role !== 'admin' && userFound?.role !== 'super_admin') {
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
                navigate(createPageUrl("Home"), { replace: true });
                return;
            }
            
            const currentAuction = auctionData[0];
            setAuction(currentAuction);
            setImageUrls(currentAuction.image_urls || []);
            // 🔧 leilão encerrado → já pré-preenche a nova data de reativação (agora +12h),
            // pra o campo NUNCA nascer vazio (era a causa do "defina uma nova data" no Safari).
            if (currentAuction.status === 'ended' || currentAuction.status === 'sold') {
                setReactivateTime(toBrtLocal(new Date(Date.now() + 720 * 60000)));
            }

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
            navigate(createPageUrl("Home"), { replace: true });
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
            
            if (isReactivating) {
                alert("✅ Leilão REATIVADO com sucesso! Status: ATIVO. (Você será redirecionado para a sala do leilão)");
                sessionStorage.removeItem('editAuctionFrom');
                navigate(createPageUrl("AuctionRoom") + `?id=${auctionId}`, { replace: true });
            } else {
                alert("✅ Leilão atualizado com sucesso!");
                sessionStorage.removeItem('editAuctionFrom');
                // 🔧 FIX: Usar navigate(-1) garante que voltamos para a página anterior 
                // sem sujar o histórico com duplicatas, resolvendo o loop de navegação.
                navigate(-1);
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
          <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
          </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d1117] p-4 sm:p-6 lg:p-8 text-slate-200">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button 
                        variant="outline" 
                        onClick={() => navigate(-1)}
                        className="bg-[#161b22] border-[#30363d] text-slate-300 hover:bg-[#30363d] hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <h1 className="text-2xl font-bold text-white hidden sm:block">
                        {isTestMode && <span className="text-orange-500">[MODO TESTE] </span>}
                        Editar Leilão
                    </h1>
                     <Button 
                        onClick={handleSaveChanges} 
                        disabled={isSaving || isUploading || isDeleting}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Alterações
                    </Button>
                </div>

                <Card className="bg-[#161b22] border-[#30363d]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                           <Image className="w-5 h-5 text-amber-400" />
                           Fotos do Leilão
                        </CardTitle>
                        <p className="text-sm text-slate-400">Arraste as fotos para reordenar. A primeira foto será a capa.</p>
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
                                                        className={`relative group border-2 rounded-lg aspect-square overflow-hidden shadow-sm ${snapshot.isDragging ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-[#30363d]'}`}
                                                    >
                                                        <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                                        <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                            {index === 0 ? 'Capa' : index + 1}
                                                        </div>
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="destructive" size="icon" className="w-7 h-7" onClick={() => handleRemoveImage(index)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <div {...provided.dragHandleProps} className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-move bg-black/50 p-1 rounded">
                                                            <GripVertical className="w-4 h-4 text-white" />
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
                                className="w-full md:w-auto bg-transparent border-[#30363d] text-slate-300 hover:text-white"
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

                <Card className="bg-[#161b22] border-[#30363d]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Edit className="w-5 h-5 text-amber-400" />
                      Detalhes do Leilão
                    </CardTitle>
                    <p className="text-sm text-slate-400">Ajuste as informações e valores do leilão.</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="title" className="text-slate-300">Título do Produto</Label>
                      <Input 
                        id="title" 
                        value={formData.title} 
                        onChange={(e) => handleInputChange('title', e.target.value)} 
                        className="mt-1 bg-[#0d1117] border-[#30363d] text-white focus:border-amber-500/50" 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description" className="text-slate-300">Descrição</Label>
                      <Textarea 
                        id="description" 
                        value={formData.description} 
                        onChange={(e) => handleInputChange('description', e.target.value)} 
                        className="mt-1 min-h-[120px] bg-[#0d1117] border-[#30363d] text-white focus:border-amber-500/50" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="category" className="text-slate-300">Categoria</Label>
                             <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                              <SelectTrigger className="mt-1 bg-[#0d1117] border-[#30363d] text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
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

                        <div>
                            <Label htmlFor="product_source" className="text-slate-300">Origem do Produto</Label>
                            <Select value={formData.product_source} onValueChange={(value) => {
                              handleInputChange("product_source", value);
                              if (value === 'return_resale') {
                                setFormData(prev => ({ ...prev, supplier_logo_url: "", comparai_mode: "google_shopping" }));
                                setSupplierLogoPreview("");
                              }
                            }}>
                              <SelectTrigger className="mt-1 bg-[#0d1117] border-[#30363d] text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                                <SelectItem value="factory_new">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span>✨ Novo de Fábrica</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="return_resale">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                                    <span>🔥 Arremate/Devolução</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
                              {formData.product_source === 'factory_new' 
                                ? '✨ Produto novo com garantia' 
                                : '📦 Item de arremate, sem garantia'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <Label htmlFor="comparai_mode" className="text-slate-300">🔍 Onde a Comparai vai buscar o preço?</Label>
                        <Select value={formData.comparai_mode} onValueChange={(value) => handleInputChange("comparai_mode", value)}>
                          <SelectTrigger className="mt-1 bg-[#0d1117] border-[#30363d] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                            <SelectItem value="supplier">
                                <span>🏭 Site do Fornecedor (exato)</span>
                            </SelectItem>
                            <SelectItem value="google_shopping">
                                <span>🔎 Usar Comparai (padrão)</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                    </div>

                    {formData.comparai_mode === 'supplier' && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                            <div>
                                <Label htmlFor="supplier_url" className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-2 uppercase tracking-widest">
                                    <LinkIcon size={14} />
                                    URL do Fornecedor *
                                </Label>
                                <Input
                                    id="supplier_url"
                                    value={formData.supplier_url}
                                    onChange={(e) => handleInputChange("supplier_url", e.target.value)}
                                    placeholder="https://www.fornecedor.com.br/..."
                                    className="bg-[#0d1117] border-[#30363d] text-white focus:border-emerald-500/50"
                                />
                            </div>

                            <div>
                                <Label className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-2 uppercase tracking-widest">
                                    <Upload size={14} />
                                    Logo do Fabricante (opcional)
                                </Label>
                                
                                {supplierLogoPreview ? (
                                  <div className="relative w-24 h-24 mx-auto mb-2">
                                    <img 
                                      src={supplierLogoPreview} 
                                      alt="Logo Preview"
                                      className="w-full h-full object-contain rounded-xl border border-[#30363d] bg-white p-2"
                                    />
                                    <button
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, supplier_logo_url: "" }));
                                        setSupplierLogoPreview("");
                                      }}
                                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-white"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="border border-dashed border-[#30363d] rounded-xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById('supplier-logo-input').click()}
                                  >
                                    <UploadCloud className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                      Upload da Logo
                                    </p>
                                  </div>
                                )}
                                
                                <input
                                  id="supplier-logo-input"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files[0]) {
                                      handleSupplierLogoUpload(e.target.files[0]);
                                    }
                                  }}
                                />
                            </div>

                            <div className="border-t border-[#30363d] pt-4 mt-4">
                                <Label htmlFor="manual_market_price" className="text-xs font-bold text-orange-400 flex items-center gap-2 mb-2 uppercase tracking-widest">
                                    ✏️ Preço Manual (Backup)
                                </Label>
                                <Input
                                    id="manual_market_price"
                                    type="number"
                                    step="0.01"
                                    value={formData.manual_market_price}
                                    onChange={(e) => handleInputChange("manual_market_price", e.target.value)}
                                    className="bg-[#0d1117] border-[#30363d] text-white focus:border-orange-500/50"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="starting_price" className="text-slate-300">Preço Inicial (R$)</Label>
                        <Input id="starting_price" type="number" step="0.01" value={formData.starting_price} onChange={(e) => handleInputChange('starting_price', e.target.value)} className="mt-1 bg-[#0d1117] border-[#30363d] text-white" />
                      </div>
                      <div>
                        <Label htmlFor="current_price" className="text-slate-300">Preço Atual (R$)</Label>
                        <Input id="current_price" type="number" step="0.01" value={formData.current_price} onChange={(e) => handleInputChange('current_price', e.target.value)} className="mt-1 bg-[#0d1117] border-[#30363d] text-white font-bold text-emerald-400" />
                      </div>
                      <div>
                        <Label htmlFor="increment" className="text-slate-300">Incremento (R$)</Label>
                        <Input id="increment" type="number" step="0.01" value={formData.increment} onChange={(e) => handleInputChange('increment', e.target.value)} className="mt-1 bg-[#0d1117] border-[#30363d] text-white" />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Label htmlFor="end_time" className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-4 h-4 text-amber-500" />
                        Data e Hora de Término (Brasília)
                      </Label>
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => handleInputChange('end_time', e.target.value)}
                        onClick={abrirSeletorNativo}
                        onFocus={abrirSeletorNativo}
                        className="mt-1 bg-[#0d1117] border-[#30363d] text-white cursor-pointer"
                      />
                      {formData.end_time && (
                        <p className="text-xs text-amber-300 mt-1.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" /> O leilão será encerrado em: <strong>{formatBrtLabel(formData.end_time)}</strong>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 🆕 CARD DE REATIVAR LEILÃO */}
                {auction && (auction.status === 'ended' || auction.status === 'sold') && (
                    <Card className="border-orange-500/50 bg-orange-500/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-400">
                                <RefreshCw className="w-5 h-5 text-orange-500" />
                                Reativar Leilão
                            </CardTitle>
                            <p className="text-sm text-slate-400">
                                Este leilão já terminou. Escolha uma data rápida abaixo e clique em Reativar — o vencedor anterior será removido.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* ⚡ REATIVAÇÃO RÁPIDA — botões que setam a data direto (não depende do seletor nativo do Safari) */}
                            <div>
                                <Label className="text-slate-300 flex items-center gap-1.5"><Zap className="w-4 h-4 text-orange-500" /> Reativação Rápida</Label>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    {REACTIVATE_PRESETS.map((p) => {
                                        const Icon = p.icon;
                                        return (
                                        <button
                                            key={p.min}
                                            type="button"
                                            onClick={() => aplicarPresetReativacao(p.min)}
                                            className={`py-2.5 px-2 rounded-lg text-sm font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                                                reactivatePreset === p.min
                                                    ? 'bg-orange-600 border-orange-500 text-white'
                                                    : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:border-orange-500/60'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5 shrink-0" />
                                            {p.label}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="reactivate_time" className="text-slate-300 flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-orange-400" /> Nova Data de Término (Brasília)</Label>
                                <Input
                                    id="reactivate_time"
                                    type="datetime-local"
                                    value={reactivateTime}
                                    onChange={(e) => { setReactivateTime(e.target.value); setReactivatePreset(null); }}
                                    onClick={abrirSeletorNativo}
                                    onFocus={abrirSeletorNativo}
                                    className="mt-1 bg-[#0d1117] border-[#30363d] text-white cursor-pointer"
                                />
                                {reactivateTime && (
                                    <p className="text-xs text-orange-300 mt-1.5 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 shrink-0" /> O leilão será encerrado em: <strong>{formatBrtLabel(reactivateTime)}</strong>
                                    </p>
                                )}
                            </div>
                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold"
                                onClick={handleReactivate}
                                disabled={isReactivating || isSaving || isUploading || isDeleting}
                            >
                                {isReactivating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reativando...</>
                                ) : (
                                    <><RefreshCw className="w-4 h-4 mr-2" /> Reativar Agora</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-rose-500/30 bg-rose-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-rose-500">
                      <Trash2 className="w-5 h-5" />
                      Zona de Perigo
                    </CardTitle>
                    <p className="text-sm text-slate-400">Ações irreversíveis.</p>
                  </CardHeader>
                  <CardContent>
                    <Button 
                        variant="destructive" 
                        className="w-full bg-rose-600 hover:bg-rose-700"
                        onClick={handleDeleteAuction}
                        disabled={isSaving || isUploading || isDeleting}
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Deletar Leilão Definitivamente
                    </Button>
                  </CardContent>
                </Card>
            </div>
        </div>
    );
}