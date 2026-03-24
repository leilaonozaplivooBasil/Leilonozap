import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload, GripVertical, Eye, Monitor, Smartphone } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { convertToWebP } from "@/lib/convertToWebP";

export default function LuxuryBannerManagement() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState(null);

  const loadBanners = async () => {
    try {
      const data = await base44.entities.BannerImage.filter({ context: "luxurycollection" }, "order");
      setBanners(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar banners");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadBanners(); }, []);

  const handleUploadImage = async (file) => {
    if (!file) return null;
    if (!file.type.startsWith("image/")) { toast.error("Envie apenas imagens"); return null; }
    try {
      // Converte para WebP antes do upload (reduz ~25-35% sem perda visível)
      const webpFile = await convertToWebP(file, 0.90);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: webpFile });
      return file_url;
    } catch (e) {
      toast.error("Erro ao enviar imagem");
      return null;
    }
  };

  const handleCreateBanner = async (formData) => {
    try {
      await base44.entities.BannerImage.create({
        ...formData,
        context: "luxurycollection",
        order: banners.length,
      });
      toast.success("Banner criado!");
      setEditingBanner(null);
      loadBanners();
    } catch (e) {
      toast.error("Erro ao criar banner");
    }
  };

  const handleUpdateBanner = async (id, formData) => {
    try {
      await base44.entities.BannerImage.update(id, formData);
      toast.success("Banner atualizado!");
      setEditingBanner(null);
      loadBanners();
    } catch (e) {
      toast.error("Erro ao atualizar banner");
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!confirm("Excluir este banner?")) return;
    try {
      await base44.entities.BannerImage.delete(id);
      toast.success("Banner excluído");
      loadBanners();
    } catch (e) {
      toast.error("Erro ao excluir banner");
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await base44.entities.BannerImage.update(banner.id, { is_active: !banner.is_active });
      loadBanners();
    } catch (e) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(banners);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setBanners(items);
    try {
      await Promise.all(items.map((b, i) => base44.entities.BannerImage.update(b.id, { order: i })));
      toast.success("Ordem atualizada");
    } catch (e) {
      toast.error("Erro ao atualizar ordem");
      loadBanners();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Banners - Luxury Collection</h1>

        {/* Preview */}
        {banners.filter(b => b.is_active).length > 0 && (
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5" /> Preview (ativos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {banners.filter(b => b.is_active).map((banner) => (
                  <div key={banner.id} className="relative group">
                    <img src={banner.image_url} alt={banner.title} className="w-full h-32 object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <p className="text-white text-sm font-semibold">{banner.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Gerenciar Banners</h2>
          <div className="flex gap-2">
            <Button onClick={() => setEditingBanner({ image_url: "", title: "", link_url: "", is_active: true, device_type: "desktop" })} className="bg-green-600 hover:bg-green-700">
              <Monitor className="w-4 h-4 mr-2" /> Novo Banner Desktop
            </Button>
            <Button onClick={() => setEditingBanner({ image_url: "", title: "", link_url: "", is_active: true, device_type: "mobile" })} className="bg-blue-600 hover:bg-blue-700">
              <Smartphone className="w-4 h-4 mr-2" /> Novo Banner Mobile
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="banners">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                {banners.map((banner, index) => (
                  <Draggable draggableId={banner.id} index={index} key={banner.id}>
                    {(provided) => (
                      <Card ref={provided.innerRef} {...provided.draggableProps} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-5 h-5 text-gray-500 cursor-grab active:cursor-grabbing" />
                            </div>
                            <img src={banner.image_url} alt={banner.title} className="w-32 h-20 object-cover rounded-lg" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-white font-semibold">{banner.title || 'Sem título'}</h3>
                                {banner.device_type === 'mobile' ? (
                                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full flex items-center gap-1">
                                    <Smartphone className="w-3 h-3" /> Mobile
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                                    <Monitor className="w-3 h-3" /> Desktop
                                  </span>
                                )}
                              </div>
                              {banner.link_url && (
                                <p className="text-gray-400 text-sm truncate">{banner.link_url}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`active-${banner.id}`} className="text-gray-300 text-sm">{banner.is_active ? 'Ativo' : 'Inativo'}</Label>
                                <Switch id={`active-${banner.id}`} checked={banner.is_active} onCheckedChange={() => handleToggleActive(banner)} />
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => setEditingBanner(banner)} className="text-blue-400 hover:text-blue-300">Editar</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteBanner(banner.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {editingBanner && (
          <BannerForm
            banner={editingBanner}
            onSave={(data) => editingBanner.id ? handleUpdateBanner(editingBanner.id, data) : handleCreateBanner(data)}
            onCancel={() => setEditingBanner(null)}
            onUploadImage={handleUploadImage}
          />
        )}
      </div>
    </div>
  );
}

function BannerForm({ banner, onSave, onCancel, onUploadImage }) {
  const [formData, setFormData] = useState(banner);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const imageUrl = await onUploadImage(file);
    if (imageUrl) setFormData({ ...formData, image_url: imageUrl });
    setIsUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.image_url) { toast.error("Envie uma imagem"); return; }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-white">{banner.id ? 'Editar Banner' : 'Novo Banner'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-300">Imagem do Banner</Label>
              {formData.image_url && (
                <img src={formData.image_url} alt="Preview" className="w-full h-48 object-cover rounded-lg mb-2" />
              )}
              <div className="flex gap-2">
                <Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileChange} disabled={isUploading} className="bg-gray-700 text-white border-gray-600" />
                <Button type="button" disabled={isUploading} variant="outline">
                  <Upload className="w-4 h-4 mr-2" /> {isUploading ? 'Enviando...' : 'Upload'}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Tipo de Dispositivo</Label>
              <div className="flex gap-2">
                <Button type="button" variant={formData.device_type === 'desktop' ? 'default' : 'outline'} onClick={() => setFormData({ ...formData, device_type: 'desktop' })} className={formData.device_type === 'desktop' ? 'bg-green-600' : ''}>
                  <Monitor className="w-4 h-4 mr-2" /> Desktop
                </Button>
                <Button type="button" variant={formData.device_type === 'mobile' ? 'default' : 'outline'} onClick={() => setFormData({ ...formData, device_type: 'mobile' })} className={formData.device_type === 'mobile' ? 'bg-blue-600' : ''}>
                  <Smartphone className="w-4 h-4 mr-2" /> Mobile
                </Button>
              </div>
              <p className="text-gray-400 text-xs mt-1">{formData.device_type === 'desktop' ? '📐 Recomendado: 1920x600px' : '📱 Recomendado: 800x600px'}</p>
            </div>

            <div>
              <Label className="text-gray-300">Título/Descrição</Label>
              <Input value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Coleção Exclusiva" className="bg-gray-700 text-white border-gray-600" />
            </div>

            <div>
              <Label className="text-gray-300">Link (opcional)</Label>
              <Input value={formData.link_url || ''} onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} placeholder="https://..." className="bg-gray-700 text-white border-gray-600" />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">{banner.id ? 'Atualizar' : 'Criar'} Banner</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}