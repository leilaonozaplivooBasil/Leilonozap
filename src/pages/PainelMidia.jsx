import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Trash2,
  Upload,
  Monitor,
  Smartphone,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import ImageCropEditor from '../components/admin/ImageCropEditor';
import { convertToWebP } from '@/lib/convertToWebP';
import { invalidateSiteMediaCache, LOGO_FALLBACK, FAVICON_FALLBACK } from '@/hooks/useSiteMedia';

/**
 * PAINEL DE MÍDIA — central única de imagens do site (pedido Gabriel 26/07).
 * Troca os banners de cada página (já na proporção certa, com recorte guiado),
 * a logo da navbar e o favicon — tudo sem precisar de deploy.
 */

// Cada local de banner do site, com a proporção REAL da moldura onde ele aparece.
const BANNER_LOCATIONS = [
  {
    key: 'home',
    label: 'Home / Leilões',
    route: '/leiloes',
    desc: 'Carrossel principal no topo da página de leilões. A imagem preenche toda a moldura (corte automático nas sobras).',
    fit: 'cover',
    aspectClass: 'aspect-[16/5]',
    sizes: {
      desktop: { w: 1920, h: 600, hint: '1920×600 px (16:5)' },
      mobile: { w: 1200, h: 375, hint: '1200×375 px (16:5)' },
    },
  },
  {
    key: 'catalog',
    label: 'Loja Virtual',
    route: '/Loja-Virtual',
    desc: 'Carrossel da loja/catálogo. A imagem aparece INTEIRA (sem corte) com as bordas preenchidas pela própria arte desfocada.',
    fit: 'contain',
    aspectClass: 'aspect-[16/5]',
    sizes: {
      desktop: { w: 1920, h: 600, hint: '1920×600 px (16:5)' },
      mobile: { w: 1200, h: 375, hint: '1200×375 px (16:5)' },
    },
  },
  {
    key: 'luxurycollection',
    label: 'Coleção Luxo',
    route: '/LuxuryCollection',
    desc: 'Carrossel da coleção de luxo. Mantenha o conteúdo importante no centro — as laterais podem ser cortadas em telas menores.',
    fit: 'cover',
    aspectClass: 'aspect-[16/5]',
    sizes: {
      desktop: { w: 1920, h: 600, hint: '1920×600 px (16:5)' },
      mobile: { w: 1200, h: 375, hint: '1200×375 px (16:5)' },
    },
  },
];

// Identidade visual (logo + favicon) — salvos como contexts especiais em banner_images.
const BRAND_ITEMS = [
  {
    key: 'site_logo',
    label: 'Logo do site (navbar)',
    desc: 'Logo horizontal exibida na barra do site, sobre fundo escuro. Use PNG/WebP com fundo TRANSPARENTE.',
    rec: 'Recomendado: 440×160 px (proporção 11:4), fundo transparente',
    fallback: LOGO_FALLBACK,
    crop: null, // logo não passa por recorte — preserva a arte e a transparência
  },
  {
    key: 'site_favicon',
    label: 'Favicon (ícone da aba)',
    desc: 'Ícone quadrado que aparece na aba do navegador e nos favoritos.',
    rec: 'Recomendado: 512×512 px (quadrado perfeito)',
    fallback: FAVICON_FALLBACK,
    crop: { w: 512, h: 512 },
  },
];

const ratioOk = (imgW, imgH, targetW, targetH) => {
  if (!imgW || !imgH) return null;
  const diff = Math.abs(imgW / imgH - targetW / targetH) / (targetW / targetH);
  return diff <= 0.03; // tolerância de 3%
};

// Badge com as dimensões reais da imagem + status da proporção
function DimensionBadge({ url, target }) {
  const [dims, setDims] = useState(null);
  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }, [url]);

  if (!dims) return null;
  const ok = target ? ratioOk(dims.w, dims.h, target.w, target.h) : null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
        ok === false
          ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
          : 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
      }`}
    >
      {ok === false ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
      {dims.w}×{dims.h}
      {ok === false && ' — proporção difere'}
    </span>
  );
}

export default function PainelMidia() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // { file, location, device } → abre o editor de recorte na proporção do local
  const [cropTask, setCropTask] = useState(null);
  const fileInputRef = useRef(null);
  const pendingPickRef = useRef(null); // o que fazer com o arquivo escolhido

  const loadAll = useCallback(async () => {
    try {
      const data = await base44.entities.BannerImage.list('order');
      setBanners(data || []);
    } catch (error) {
      console.error('Erro ao carregar mídia:', error);
      toast.error('Erro ao carregar as mídias do site');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const bannersOf = (context, device) =>
    banners
      .filter((b) => b.context === context && (b.device_type || 'desktop') === device)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const brandOf = (context) => banners.find((b) => b.context === context && b.is_active) || banners.find((b) => b.context === context);

  // ===== Upload =====
  const uploadFile = async (file, { toWebP = true } = {}) => {
    const finalFile = toWebP ? await convertToWebP(file, 0.9) : file;
    const { file_url } = await base44.integrations.Core.UploadFile({ file: finalFile });
    return file_url;
  };

  const openPicker = (handler) => {
    pendingPickRef.current = handler;
    fileInputRef.current?.click();
  };

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Envie apenas imagens');
      return;
    }
    pendingPickRef.current?.(file);
    pendingPickRef.current = null;
  };

  // Novo banner: escolhe arquivo → recorte na proporção do local → WebP → salva
  const handleAddBanner = (location, device) => {
    openPicker((file) => setCropTask({ file, location, device }));
  };

  const handleCropSaved = async (croppedFile) => {
    const { location, device } = cropTask;
    setCropTask(null);
    setIsSaving(true);
    try {
      const image_url = await uploadFile(croppedFile);
      await base44.entities.BannerImage.create({
        context: location.key,
        device_type: device,
        image_url,
        title: '',
        link_url: '',
        is_active: true,
        order: bannersOf(location.key, device).length,
      });
      toast.success('Banner publicado!');
      loadAll();
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
      toast.error('Erro ao salvar o banner');
    } finally {
      setIsSaving(false);
    }
  };

  // Troca só a imagem de um banner existente (mantém link/ordem)
  const handleReplaceImage = (banner, location, device) => {
    openPicker((file) =>
      setCropTask({
        file,
        location,
        device,
        replaceId: banner.id,
      })
    );
  };

  const handleCropSavedReplace = async (croppedFile) => {
    const { replaceId } = cropTask;
    setCropTask(null);
    setIsSaving(true);
    try {
      const image_url = await uploadFile(croppedFile);
      await base44.entities.BannerImage.update(replaceId, { image_url });
      toast.success('Imagem trocada!');
      loadAll();
    } catch (error) {
      console.error('Erro ao trocar imagem:', error);
      toast.error('Erro ao trocar a imagem');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await base44.entities.BannerImage.update(banner.id, { is_active: !banner.is_active });
      loadAll();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (banner) => {
    if (!confirm('Excluir este banner?')) return;
    try {
      await base44.entities.BannerImage.delete(banner.id);
      toast.success('Banner excluído');
      loadAll();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const handleMove = async (list, index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[index];
    const b = list[j];
    try {
      await Promise.all([
        base44.entities.BannerImage.update(a.id, { order: j }),
        base44.entities.BannerImage.update(b.id, { order: index }),
      ]);
      loadAll();
    } catch {
      toast.error('Erro ao reordenar');
    }
  };

  const handleSaveLink = async (banner, link_url) => {
    if ((banner.link_url || '') === (link_url || '')) return;
    try {
      await base44.entities.BannerImage.update(banner.id, { link_url });
      toast.success('Link salvo');
      loadAll();
    } catch {
      toast.error('Erro ao salvar link');
    }
  };

  // ===== Logo / Favicon =====
  const handleBrandUpload = (item) => {
    openPicker(async (file) => {
      if (item.crop) {
        setCropTask({
          file,
          brandItem: item,
          location: { key: item.key, sizes: { desktop: item.crop } },
          device: 'desktop',
        });
        return;
      }
      await saveBrand(item, file);
    });
  };

  const saveBrand = async (item, file) => {
    setIsSaving(true);
    try {
      // logo/favicon: sem conversão agressiva — preserva transparência e nitidez
      const image_url = await uploadFile(file, { toWebP: false });
      const existing = banners.find((b) => b.context === item.key);
      if (existing) {
        await base44.entities.BannerImage.update(existing.id, { image_url, is_active: true });
      } else {
        await base44.entities.BannerImage.create({
          context: item.key,
          device_type: 'desktop',
          image_url,
          title: item.label,
          link_url: '',
          is_active: true,
          order: 0,
        });
      }
      invalidateSiteMediaCache();
      toast.success(`${item.label} atualizado! Recarregue a página para ver no site.`);
      loadAll();
    } catch (error) {
      console.error('Erro ao salvar identidade visual:', error);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrandReset = async (item) => {
    const existing = banners.find((b) => b.context === item.key);
    if (!existing) return;
    if (!confirm(`Voltar ${item.label} para o padrão do site?`)) return;
    try {
      await base44.entities.BannerImage.delete(existing.id);
      invalidateSiteMediaCache();
      toast.success('Padrão restaurado');
      loadAll();
    } catch {
      toast.error('Erro ao restaurar padrão');
    }
  };

  // Resolve qual callback do recorte usar
  const onCropSave = (file) => {
    if (cropTask?.brandItem) {
      const item = cropTask.brandItem;
      setCropTask(null);
      saveBrand(item, file);
    } else if (cropTask?.replaceId) {
      handleCropSavedReplace(file);
    } else {
      handleCropSaved(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      {/* input de arquivo único, reutilizado por todos os botões de upload */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />

      <div className="max-w-6xl mx-auto">
        {/* ===== Cabeçalho ===== */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.25))', border: '1px solid rgba(16,185,129,0.35)' }}
          >
            <ImageIcon className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Painel de Mídia</h1>
            <p className="text-sm text-gray-400">
              Banners de cada página, logo e favicon — já na proporção certa, sem precisar de deploy.
            </p>
          </div>
        </div>

        {isSaving && (
          <div className="mb-4 flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            Enviando imagem…
          </div>
        )}

        {/* ===== Identidade visual ===== */}
        <section className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <h2 className="text-lg font-bold text-white">Identidade visual</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {BRAND_ITEMS.map((item) => {
              const current = brandOf(item.key);
              const url = current?.image_url || item.fallback;
              const isCustom = Boolean(current?.image_url);
              return (
                <div key={item.key} className="rounded-xl border border-white/10 bg-gray-800/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-bold">{item.label}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                      <p className="text-[11px] text-emerald-300/90 font-semibold mt-1">{item.rec}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${isCustom ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' : 'text-gray-400 border-white/10 bg-white/5'}`}>
                      {isCustom ? 'PERSONALIZADO' : 'PADRÃO'}
                    </span>
                  </div>

                  {/* preview sobre o mesmo fundo escuro da navbar */}
                  <div
                    className="mt-3 rounded-lg flex items-center justify-center p-4"
                    style={{ background: 'rgba(2,6,23,0.9)', border: '1px solid rgba(255,255,255,0.06)', minHeight: 96 }}
                  >
                    <img
                      src={url}
                      alt={item.label}
                      className={item.key === 'site_favicon' ? 'w-16 h-16 object-contain' : 'h-14 w-auto object-contain'}
                    />
                  </div>
                  <div className="mt-2">
                    <DimensionBadge url={url} target={item.crop || { w: 11, h: 4 }} />
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => handleBrandUpload(item)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                      <Upload className="w-4 h-4" /> Trocar
                    </Button>
                    {isCustom && (
                      <Button size="sm" variant="outline" onClick={() => handleBrandReset(item)} className="border-white/15 text-gray-300 hover:text-white gap-2">
                        Restaurar padrão
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== Banners por página ===== */}
        {BANNER_LOCATIONS.map((location) => (
          <section key={location.key} className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{location.label}</h2>
                <a
                  href={location.route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-emerald-300 transition-colors"
                  title="Abrir a página"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">{location.desc}</p>

            <div className="grid lg:grid-cols-2 gap-4">
              {['desktop', 'mobile'].map((device) => {
                const list = bannersOf(location.key, device);
                const size = location.sizes[device];
                const DeviceIcon = device === 'desktop' ? Monitor : Smartphone;
                return (
                  <div key={device} className="rounded-xl border border-white/10 bg-gray-800/60 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <DeviceIcon className="w-4 h-4 text-cyan-300" />
                        <span className="text-sm font-bold text-white capitalize">{device}</span>
                        <span className="text-[11px] text-emerald-300/90 font-semibold">— {size.hint}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddBanner(location, device)}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Novo
                      </Button>
                    </div>

                    {list.length === 0 && (
                      <div className={`${location.aspectClass} rounded-lg border border-dashed border-white/15 flex items-center justify-center`}>
                        <p className="text-xs text-gray-500">Nenhum banner {device} nesta página</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {list.map((banner, index) => (
                        <div key={banner.id} className={`rounded-lg border overflow-hidden ${banner.is_active ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
                          {/* preview na moldura EXATA em que o banner aparece no site */}
                          <div className={`${location.aspectClass} bg-gray-950 relative`}>
                            <img
                              src={banner.image_url}
                              alt={banner.title || 'Banner'}
                              className={`w-full h-full ${location.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                            />
                            <div className="absolute top-2 left-2">
                              <DimensionBadge url={banner.image_url} target={size} />
                            </div>
                          </div>
                          <div className="p-2.5 bg-gray-900/60 flex items-center gap-2">
                            <div className="flex flex-col">
                              <button onClick={() => handleMove(list, index, -1)} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5" aria-label="Subir">
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleMove(list, index, 1)} disabled={index === list.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5" aria-label="Descer">
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <Input
                              defaultValue={banner.link_url || ''}
                              placeholder="Link ao clicar (opcional)"
                              onBlur={(e) => handleSaveLink(banner, e.target.value.trim())}
                              className="h-8 text-xs bg-gray-800 border-white/10 text-gray-200 flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReplaceImage(banner, location, device)}
                              className="h-8 px-2 border-white/15 text-gray-300 hover:text-white text-xs"
                            >
                              Trocar
                            </Button>
                            <Switch checked={banner.is_active} onCheckedChange={() => handleToggleActive(banner)} />
                            <button onClick={() => handleDelete(banner)} className="text-red-400/70 hover:text-red-300 p-1" aria-label="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-[11px] text-gray-600 mt-8 mb-4 text-center">
          As imagens são recortadas na proporção exata de cada moldura e convertidas para WebP automaticamente.
        </p>
      </div>

      {/* ===== Editor de recorte na proporção do local ===== */}
      {cropTask && (
        <ImageCropEditor
          imageFile={cropTask.file}
          targetWidth={cropTask.location.sizes[cropTask.device].w}
          targetHeight={cropTask.location.sizes[cropTask.device].h}
          onSave={onCropSave}
          onCancel={() => setCropTask(null)}
        />
      )}
    </div>
  );
}
