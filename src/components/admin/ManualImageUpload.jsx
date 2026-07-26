import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UploadCloud, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { convertToWebP } from "@/lib/convertToWebP";

export default function ManualImageUpload({ onApply }) {
  const [images, setImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [show, setShow] = useState(false);

  const uploadFiles = async (files) => {
    setIsUploading(true);
    const uploadedUrls = [];
    try {
      for (const f of files) {
        const wf = await convertToWebP(f);
        const result = await base44.integrations.Core.UploadFile({ file: wf });
        if (result?.file_url) uploadedUrls.push(result.file_url);
      }
      if (uploadedUrls.length > 0) {
        setImages(uploadedUrls);
        setCoverIndex(0);
        toast.success(` ${uploadedUrls.length} imagem(ns) enviada!`);
      }
    } catch (error) {
      toast.error("Erro ao enviar imagens: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApply = () => {
    let final = [images[coverIndex], ...images.filter((_, i) => i !== coverIndex)];
    final = final.slice(0, 5);
    while (final.length < 5) final.push("");
    onApply(final);
    setImages([]);
    setCoverIndex(0);
    setShow(false);
    toast.success("Imagens aplicadas!");
  };

  return (
    <Card className="bg-gray-800 border border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between text-purple-400">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5" />
            Upload Manual de Imagens
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShow(!show)} className="text-purple-300 hover:text-purple-100">
            {show ? "Ocultar" : "Mostrar"}
          </Button>
        </CardTitle>
      </CardHeader>

      {show && (
        <CardContent className="space-y-4">
          {images.length === 0 ? (
            <div>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${isDragging ? 'border-purple-400 bg-purple-900/30 scale-105' : 'border-purple-600 hover:bg-purple-900/10'}`}
                onClick={() => !isUploading && document.getElementById('manual-upload-input').click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                onDrop={async (e) => {
                  e.preventDefault(); e.stopPropagation(); setIsDragging(false);
                  if (isUploading) return;
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 6);
                  if (files.length === 0) { toast.error("Nenhuma imagem válida"); return; }
                  await uploadFiles(files);
                }}
              >
                {isUploading
                  ? <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" />
                  : <UploadCloud className={`w-12 h-12 mx-auto mb-4 transition-all ${isDragging ? 'text-purple-300 scale-110' : 'text-purple-400'}`} />
                }
                <h4 className="text-lg font-semibold text-purple-300 mb-2">
                  {isUploading ? "Enviando imagens..." : isDragging ? "Solte as imagens aqui" : "Clique ou arraste imagens"}
                </h4>
                <p className="text-sm text-gray-400">
                  {isDragging ? "Solte para fazer upload" : "Selecione até 6 imagens do seu computador"}
                </p>
              </div>
              <input
                id="manual-upload-input" type="file" accept="image/*" multiple className="hidden"
                onChange={async (e) => {
                  if (!e.target.files || e.target.files.length === 0) return;
                  const files = Array.from(e.target.files).slice(0, 6);
                  await uploadFiles(files);
                  e.target.value = '';
                }}
                disabled={isUploading}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-700">
                <h4 className="font-bold text-purple-300 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Escolha a imagem de capa:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${coverIndex === index ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-gray-700 hover:border-purple-600'}`}
                      onClick={() => setCoverIndex(index)}
                    >
                      <div className="w-full h-24 bg-gray-900 flex items-center justify-center">
                        <img src={img} alt={`Imagem ${index + 1}`} className="max-w-full max-h-full object-contain" crossOrigin="anonymous" loading="eager"
                          onError={(e) => { e.target.style.display = 'none'; if (e.target.parentElement) e.target.parentElement.innerHTML = '<div class="text-xs text-red-400">Erro</div>'; }} />
                      </div>
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newImgs = images.filter((_, i) => i !== index);
                          setImages(newImgs);
                          if (newImgs.length === 0) return;
                          if (coverIndex === index) setCoverIndex(0);
                          else if (coverIndex > index) setCoverIndex(p => p - 1);
                        }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">{index + 1}</div>
                      {coverIndex === index && (
                        <div className="absolute inset-0 flex items-center justify-center bg-purple-500/30 text-white font-bold pointer-events-none">CAPA</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setImages([]); setCoverIndex(0); }} className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700">
                  <Trash2 className="w-4 h-4 mr-2" /> Limpar Tudo
                </Button>
                <Button type="button" onClick={handleApply} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                  <Upload className="w-4 h-4 mr-2" /> Aplicar no Formulário
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}