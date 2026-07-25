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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Save, Image, UploadCloud, Edit, Clock, RefreshCw, Link as LinkIcon, Upload, Zap, Moon, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';

// 🔔 Toasts personalizados da página — NUNCA usar alert()/confirm() do navegador
// (o Brave/Chrome pode bloquear diálogos nativos e o clique "não faz nada").
const notify = {
    ok: (title, description) => toast({ title: `✅ ${title}`, description, duration: 4000 }),
    erro: (title, description) => toast({ title: `❌ ${title}`, description, variant: 'destructive', duration: 6000 }),
    aviso: (title, description) => toast({ title: `⚠️ ${title}`, description, duration: 5000 }),
};

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
      manual_market_price: "" // 🆕 Preço manual quando o CompareAQUI não acha
    });
    const [imageUrls, setImageUrls] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
    const [reactivateTime, setReactivateTime] = useState("");
    const [reactivatePreset, setReactivatePreset] = useState(720); // qual botão rápido está ativo (default +12h)
    // Modal de confirmação personalizado da página: { title, lines, confirmLabel, danger, onConfirm }
    const [confirmAction, setConfirmAction] = useState(null);

    // ⏱️ Tick de 1s para o countdown do card de resumo (só roda com leilão ativo)
    const [nowTick, setNowTick] = useState(Date.now());
    useEffect(() => {
        if (auction?.status !== 'active') return;
        const i = setInterval(() => setNowTick(Date.now()), 1000);
        return () => clearInterval(i);
    }, [auction?.status]);

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
                 notify.erro("Acesso negado", "Apenas administradores podem editar leilões.");
                 navigate(createPageUrl("Home"), { replace: true });
                 return;
            }

            if (isTestMode) {
                console.log("TEST MODE: Edição de Leilão - Carregando dados.");
            }
            const auctionData = await Auction.filter({ id: auctionId });
            if (auctionData.length === 0) {
                notify.erro("Leilão não encontrado");
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
            notify.erro("Erro ao carregar dados", "Verifique o console.");
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
                notify.erro("Falha ao enviar a imagem", file.name);
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
                notify.ok("Logo enviada com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao enviar logo:", error);
            notify.erro("Erro ao enviar logo", "Tente novamente.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            // 🆕 VALIDAÇÃO PARA supplier_url
            if (formData.comparai_mode === 'supplier' && !formData.supplier_url.trim()) {
            notify.aviso("URL obrigatória", "Para buscar preço no site do fornecedor, você DEVE inserir a URL!");
            setIsSaving(false);
            return;
            }

            if (isTestMode) {
                console.log("TEST MODE: Simulando salvamento de alterações.");
                await new Promise(resolve => setTimeout(resolve, 500));
                notify.ok("Alterações salvas!");
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

                // Remove mensagens de "ARREMATADO" (em paralelo, content null-safe)
                try {
                    const allMessages = await AuctionMessage.filter({ auction_id: auctionId });
                    await Promise.allSettled(allMessages.filter(isWinnerMessage).map((msg) => AuctionMessage.delete(msg.id)));
                } catch (msgError) {
                    console.warn("⚠️ Falha ao limpar mensagens de encerramento:", msgError);
                }
            }
            
            console.log(`💾 [SAVE] Salvando com payload:`, updatePayload);
            await Auction.update(auctionId, updatePayload);
            
            setIsSaving(false);
            
            if (isReactivating) {
                notify.ok("Leilão REATIVADO com sucesso!", "Status: ATIVO. Redirecionando para a sala do leilão…");
                sessionStorage.removeItem('editAuctionFrom');
                navigate(createPageUrl("AuctionRoom") + `?id=${auctionId}`, { replace: true });
            } else {
                notify.ok("Leilão atualizado com sucesso!");
                sessionStorage.removeItem('editAuctionFrom');
                // 🔧 FIX: Usar navigate(-1) garante que voltamos para a página anterior 
                // sem sujar o histórico com duplicatas, resolvendo o loop de navegação.
                navigate(-1);
            }
            
        } catch (error) {
            console.error("Erro ao salvar alterações:", error);
            notify.erro("Erro ao salvar alterações", "Tente novamente.");
            setIsSaving(false);
        }
    };

    // Identifica mensagens de encerramento (ARREMATADO etc.) — content pode vir nulo do banco
    const isWinnerMessage = (msg) => {
        if (msg.message_type === 'winner_announcement') return true;
        if (!msg.is_system_message) return false;
        const content = msg.content || '';
        return ['ARREMATADO', 'VENDIDO', 'Parabéns', 'vencedor', 'arrematou'].some((t) => content.includes(t));
    };

    // 🆕 REATIVAR — o botão abre o modal personalizado; a execução fica em doReactivate.
    const handleReactivate = () => {
        if (!reactivateTime) {
            notify.aviso("Defina a nova data", "Escolha uma data e hora para reativar o leilão.");
            return;
        }
        setConfirmAction({
            title: "Reativar este leilão?",
            lines: [
                "O histórico de LANCES será mantido",
                "Mensagens de ARREMATADO serão removidas",
                "O vencedor anterior será limpo",
                "Status mudará para ATIVO",
            ],
            confirmLabel: "Sim, reativar",
            danger: false,
            onConfirm: doReactivate,
        });
    };

    const doReactivate = async () => {
        setIsReactivating(true);
        try {
            // ⚠️ Para presets relâmpago (+3min/+5min/etc.) o tempo é contado a partir do INSTANTE
            // da gravação — não do clique no botão. reactivatePreset guarda os minutos do preset
            // ativo (null quando o admin editou a data à mão — aí vale o horário absoluto digitado).
            const computeUtcEndTime = () => {
                if (reactivatePreset != null) {
                    return new Date(Date.now() + reactivatePreset * 60000).toISOString();
                }
                const [datePart, timePart] = reactivateTime.split('T');
                const [year, month, day] = datePart.split('-');
                const [hour, minute] = timePart.split(':');
                // Cria data em Brasília (UTC-3)
                return new Date(`${year}-${month}-${day}T${hour}:${minute}:00-03:00`).toISOString();
            };

            // 1️⃣ REATIVA PRIMEIRO — é a operação que importa; a limpeza de mensagens vem depois
            // (antes a limpeza rodava primeiro com 200ms por mensagem e, se falhasse, o leilão
            // nem chegava a reativar — era o "travou e não funcionou").
            const utcEndTimeString = computeUtcEndTime();
            await Auction.update(auctionId, {
                status: 'active',
                end_time: utcEndTimeString,
                winner_id: null,
                winner_name: null,
                order_status: null,
                last_processed_bid_time: null,
            });

            // 2️⃣ LIMPA MENSAGENS DE ENCERRAMENTO em paralelo; falha aqui não desfaz a reativação
            let deletedCount = 0;
            try {
                const allMessages = await AuctionMessage.filter({ auction_id: auctionId });
                const toDelete = allMessages.filter(isWinnerMessage);
                const results = await Promise.allSettled(toDelete.map((msg) => AuctionMessage.delete(msg.id)));
                deletedCount = results.filter((r) => r.status === 'fulfilled').length;
            } catch (msgError) {
                console.warn("⚠️ Reativado, mas falhou a limpeza de mensagens:", msgError);
            }

            setIsReactivating(false);
            notify.ok(
                "Leilão reativado!",
                `Termina: ${new Date(utcEndTimeString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${deletedCount} mensagens removidas · lances mantidos`
            );

            // Redireciona para a sala do leilão
            navigate(createPageUrl("AuctionRoom") + `?id=${auctionId}`, { replace: true });

        } catch (error) {
            console.error("❌ Erro ao reativar:", error);
            notify.erro("Erro ao reativar o leilão", "Tente novamente.");
            setIsReactivating(false);
        }
    };

    const handleDeleteAuction = () => {
        setConfirmAction({
            title: "Deletar este leilão definitivamente?",
            lines: [
                "Esta ação é IRREVERSÍVEL",
                "Todos os dados associados serão removidos",
            ],
            confirmLabel: "Sim, deletar",
            danger: true,
            onConfirm: doDeleteAuction,
        });
    };

    const doDeleteAuction = async () => {
        setIsDeleting(true);
        try {
            if (isTestMode) {
                console.log("TEST MODE: Simulando exclusão de leilão.");
                await new Promise(resolve => setTimeout(resolve, 500));
                notify.ok("Leilão excluído!");
                setIsDeleting(false);
                navigate(createPageUrl("Home"), { replace: true });
                return;
            }

            await Auction.delete(auctionId);
            
            setIsDeleting(false);
            notify.ok("Leilão excluído com sucesso!");
            
            navigate(createPageUrl("Home"), { replace: true });
            
        } catch (error) {
            console.error("Erro ao deletar leilão:", error);
            notify.erro("Erro ao deletar o leilão", "Tente novamente.");
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

    // 🎨 Badge de status + countdown do resumo lateral
    const statusInfo = auction?.status === 'active'
        ? { label: 'ATIVO', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400 animate-pulse' }
        : auction?.status === 'sold'
            ? { label: 'VENDIDO', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' }
            : { label: 'ENCERRADO', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' };

    const tempoRestante = (() => {
        if (auction?.status !== 'active') return null;
        const diff = new Date(auction.end_time).getTime() - nowTick;
        if (diff <= 0) return 'Encerrando…';
        const s = Math.floor(diff / 1000);
        const d = Math.floor(s / 86400);
        if (d > 0) return `${d} dia${d > 1 ? 's' : ''} e ${Math.floor((s % 86400) / 3600)}h`;
        return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    })();

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 pb-20">
            {/* 🎯 HEADER FIXO — Voltar, título, status e Salvar sempre à mão (desktop e mobile) */}
            <div className="sticky top-16 z-30 border-b border-white/5" style={{ background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="shrink-0 bg-[#161b22] border-[#30363d] text-slate-300 hover:bg-[#30363d] hover:text-white"
                        title="Voltar"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold leading-none">
                            {isTestMode ? '[MODO TESTE] · ' : ''}Editar Leilão
                        </p>
                        <h1 className="text-sm sm:text-lg font-bold text-white truncate mt-0.5">
                            {formData.title || 'Sem título'}
                        </h1>
                    </div>
                    <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                    </span>
                    <Button
                        onClick={handleSaveChanges}
                        disabled={isSaving || isUploading || isDeleting}
                        className="shrink-0 bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <Save className="w-4 h-4 sm:mr-2" />}
                        <span className="hidden sm:inline">Salvar Alterações</span>
                        <span className="sm:hidden ml-1.5">Salvar</span>
                    </Button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* 📄 COLUNA PRINCIPAL — fotos + detalhes */}
                <div className="lg:col-span-2 space-y-6">

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
                        <Label htmlFor="comparai_mode" className="text-slate-300">🔍 Onde o CompareAQUI vai buscar o preço?</Label>
                        <Select value={formData.comparai_mode} onValueChange={(value) => handleInputChange("comparai_mode", value)}>
                          <SelectTrigger className="mt-1 bg-[#0d1117] border-[#30363d] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                            <SelectItem value="supplier">
                                <span>🏭 Site do Fornecedor (exato)</span>
                            </SelectItem>
                            <SelectItem value="google_shopping">
                                <span>🔎 Usar CompareAQUI (padrão)</span>
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

                </div>

                {/* 📌 COLUNA LATERAL — resumo do leilão + ações */}
                <div className="space-y-6">

                <Card className="bg-[#161b22] border-[#30363d] overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-[#30363d]">
                        {imageUrls[0] ? (
                            <img src={imageUrls[0]} alt="Capa" className="w-14 h-14 rounded-lg object-cover border border-[#30363d] shrink-0" />
                        ) : (
                            <div className="w-14 h-14 rounded-lg bg-[#0d1117] border border-[#30363d] grid place-items-center shrink-0">
                                <Image className="w-5 h-5 text-slate-600" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{formData.title || 'Sem título'}</p>
                            <span className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                {statusInfo.label}
                            </span>
                        </div>
                    </div>
                    <CardContent className="p-4 space-y-2.5 text-sm">
                        <div className="flex justify-between gap-3"><span className="text-slate-400">Preço atual</span><span className="font-bold text-emerald-400">R$ {(parseFloat(formData.current_price) || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400">Lance inicial</span><span className="text-slate-200">R$ {(parseFloat(formData.starting_price) || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400">Incremento</span><span className="text-slate-200">R$ {(parseFloat(formData.increment) || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400">Término</span><span className="text-slate-200 text-right">{formatBrtLabel(formData.end_time) || '—'}</span></div>
                        {tempoRestante && (
                            <div className="mt-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2.5 text-center">
                                <p className="text-[10px] uppercase tracking-widest text-emerald-300/80 font-bold">Termina em</p>
                                <p className="text-xl font-black text-emerald-400 tabular-nums leading-tight">{tempoRestante}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 🆕 CARD DE REATIVAR LEILÃO */}
                {auction && (auction.status === 'ended' || auction.status === 'sold') && (
                    <Card className="border-orange-500/40 overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.08) 0%, rgba(22,27,34,1) 45%)' }}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 grid place-items-center shrink-0">
                                    <RefreshCw className="w-5 h-5 text-orange-400" />
                                </div>
                                <div className="min-w-0">
                                    <CardTitle className="text-orange-400 text-base">Reativar Leilão</CardTitle>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        Este leilão terminou. Escolha o novo tempo e reative — o vencedor anterior será removido e os lances mantidos.
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* ⚡ REATIVAÇÃO RÁPIDA — botões que setam a data direto (não depende do seletor nativo do Safari) */}
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5 text-orange-400" /> Reativação rápida
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {REACTIVATE_PRESETS.map((p) => {
                                        const Icon = p.icon;
                                        const ativo = reactivatePreset === p.min;
                                        return (
                                        <button
                                            key={p.min}
                                            type="button"
                                            onClick={() => aplicarPresetReativacao(p.min)}
                                            className={`py-2.5 px-2 rounded-xl text-[13px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                                ativo
                                                    ? 'bg-gradient-to-b from-orange-500 to-orange-600 border-orange-400 text-white shadow-lg shadow-orange-600/30'
                                                    : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:border-orange-500/60 hover:text-white hover:bg-orange-500/5'
                                            }`}
                                        >
                                            <Icon className={`w-3.5 h-3.5 shrink-0 ${ativo ? 'text-white' : 'text-orange-400/70'}`} />
                                            {p.label}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-[#30363d]" />
                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">ou data específica</span>
                                <div className="h-px flex-1 bg-[#30363d]" />
                            </div>

                            <div>
                                <Label htmlFor="reactivate_time" className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5 mb-2">
                                    <CalendarDays className="w-3.5 h-3.5 text-orange-400" /> Nova data de término (Brasília)
                                </Label>
                                <Input
                                    id="reactivate_time"
                                    type="datetime-local"
                                    value={reactivateTime}
                                    onChange={(e) => { setReactivateTime(e.target.value); setReactivatePreset(null); }}
                                    onClick={abrirSeletorNativo}
                                    onFocus={abrirSeletorNativo}
                                    className="bg-[#0d1117] border-[#30363d] text-white cursor-pointer rounded-xl h-11"
                                />
                            </div>

                            {reactivateTime && (
                                <div className="rounded-xl bg-[#0d1117] border border-orange-500/25 px-4 py-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/25 grid place-items-center shrink-0">
                                        <Clock className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Novo término</p>
                                        <p className="text-sm font-bold text-orange-300 truncate">{formatBrtLabel(reactivateTime)}</p>
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-base shadow-lg shadow-orange-600/25 transition-all"
                                onClick={handleReactivate}
                                disabled={isReactivating || isSaving || isUploading || isDeleting}
                            >
                                {isReactivating ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Reativando...</>
                                ) : (
                                    <><RefreshCw className="w-5 h-5 mr-2" /> Reativar Agora</>
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
            </div>

            {/* 🔔 MODAL DE CONFIRMAÇÃO PERSONALIZADO — substitui o confirm() nativo do navegador */}
            <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
                <DialogContent className="bg-[#161b22] border-[#30363d] text-white max-w-md">
                    {confirmAction && (
                        <>
                            <DialogHeader>
                                <DialogTitle className={`flex items-center gap-2 ${confirmAction.danger ? 'text-rose-400' : 'text-orange-400'}`}>
                                    {confirmAction.danger
                                        ? <Trash2 className="w-5 h-5 shrink-0" />
                                        : <RefreshCw className="w-5 h-5 shrink-0" />}
                                    {confirmAction.title}
                                </DialogTitle>
                            </DialogHeader>
                            <ul className="space-y-2 py-1">
                                {confirmAction.lines.map((line) => (
                                    <li key={line} className="flex items-start gap-2 text-sm text-slate-300">
                                        {confirmAction.danger
                                            ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                                            : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />}
                                        {line}
                                    </li>
                                ))}
                            </ul>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-transparent border-[#30363d] text-slate-300 hover:bg-[#30363d] hover:text-white"
                                    onClick={() => setConfirmAction(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className={`flex-1 font-bold text-white ${confirmAction.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-500'}`}
                                    onClick={() => {
                                        const fn = confirmAction.onConfirm;
                                        setConfirmAction(null);
                                        fn();
                                    }}
                                >
                                    {confirmAction.confirmLabel}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}