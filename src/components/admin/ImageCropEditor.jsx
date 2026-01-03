import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ImageCropEditor({ imageFile, targetWidth = 1200, targetHeight = 600, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Calcula escala inicial para cobrir o canvas
      const scaleX = targetWidth / img.width;
      const scaleY = targetHeight / img.height;
      const initialScale = Math.max(scaleX, scaleY);
      setScale(initialScale);
      
      // Centraliza a imagem
      const scaledWidth = img.width * initialScale;
      const scaledHeight = img.height * initialScale;
      setPosition({
        x: (targetWidth - scaledWidth) / 2,
        y: (targetHeight - scaledHeight) / 2
      });
    };
    img.src = URL.createObjectURL(imageFile);
    
    return () => URL.revokeObjectURL(img.src);
  }, [imageFile, targetWidth, targetHeight]);

  useEffect(() => {
    if (!image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Limpa canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    // Desenha imagem com escala e posição
    ctx.save();
    ctx.drawImage(
      image,
      position.x,
      position.y,
      image.width * scale,
      image.height * scale
    );
    ctx.restore();
    
    // Desenha grid de auxílio
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Linhas verticais
    ctx.beginPath();
    ctx.moveTo(targetWidth / 3, 0);
    ctx.lineTo(targetWidth / 3, targetHeight);
    ctx.moveTo((targetWidth / 3) * 2, 0);
    ctx.lineTo((targetWidth / 3) * 2, targetHeight);
    ctx.stroke();
    
    // Linhas horizontais
    ctx.beginPath();
    ctx.moveTo(0, targetHeight / 3);
    ctx.lineTo(targetWidth, targetHeight / 3);
    ctx.moveTo(0, (targetHeight / 3) * 2);
    ctx.lineTo(targetWidth, (targetHeight / 3) * 2);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }, [image, scale, position, targetWidth, targetHeight]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Limpa o canvas e desenha apenas a imagem sem as linhas guia
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    ctx.drawImage(
      image,
      position.x,
      position.y,
      image.width * scale,
      image.height * scale
    );
    
    // Exporta o canvas sem as linhas
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], imageFile.name, { type: 'image/png' });
        onSave(file);
      }
    }, 'image/png', 1.0);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
      <Card className="bg-gray-800 border-gray-700 max-w-6xl w-full">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crop className="w-5 h-5 text-green-400" />
            Ajustar Imagem - {targetWidth} x {targetHeight} pixels
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Arraste a imagem para posicionar. Use os botões abaixo para ajustar o zoom.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Canvas de edição */}
          <div className="flex justify-center bg-gray-900 rounded-lg p-4">
            <canvas
              ref={canvasRef}
              width={targetWidth}
              height={targetHeight}
              className="max-w-full h-auto border-2 border-gray-700 rounded-lg cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                className="text-gray-300"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-gray-400 text-sm font-mono">
                {Math.round(scale * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                className="text-gray-300"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Aplicar Recorte
              </Button>
            </div>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              💡 <strong>Dica:</strong> Posicione a parte mais importante da imagem no centro. 
              A qualidade será mantida em alta resolução.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}