import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';

export default function ImagePositionEditor({ imageUrl, onSave, onCancel, deviceType = 'desktop', initialAdjustments = null }) {
  // Dimensões reais do banner
  const dimensions = deviceType === 'desktop' 
    ? { width: 1920, height: 600 } 
    : { width: 800, height: 600 };
  const [position, setPosition] = useState(initialAdjustments?.position || { x: 0, y: 0 });
  const [scale, setScale] = useState(initialAdjustments?.scale || 1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      updateImageDimensions();
    }
  }, [scale]);

  const updateImageDimensions = () => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    setImageDimensions({
      width: naturalWidth * scale,
      height: naturalHeight * scale
    });
  };

  const constrainPosition = (x, y) => {
    if (!containerRef.current || !imageDimensions.width) return { x: 0, y: 0 };

    const container = containerRef.current.getBoundingClientRect();
    
    // Calcular limites: a imagem deve sempre cobrir todo o container
    const maxX = 0;
    const minX = Math.min(0, container.width - imageDimensions.width);
    const maxY = 0;
    const minY = Math.min(0, container.height - imageDimensions.height);

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setPosition(constrainPosition(newX, newY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    setPosition(constrainPosition(newX, newY));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.1, 3);
    setScale(newScale);
    // Reaplica constraint após zoom
    setTimeout(() => {
      setPosition(prev => constrainPosition(prev.x, prev.y));
    }, 50);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.1, 1);
    setScale(newScale);
    // Reaplica constraint após zoom
    setTimeout(() => {
      setPosition(prev => constrainPosition(prev.x, prev.y));
    }, 50);
  };

  const handleReset = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  };

  const handleSave = () => {
    onSave({ position, scale });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position, dragStart]);

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h3 className="text-white text-lg font-semibold">Ajustar Posição da Imagem</h3>
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="text-gray-300"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Resetar
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="text-gray-300"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* Canvas Container */}
          <div
            ref={containerRef}
            className="relative bg-gray-800 border-2 border-gray-600 overflow-hidden cursor-move"
            style={{
              width: dimensions.width > 1000 ? '960px' : `${dimensions.width}px`,
              height: dimensions.width > 1000 ? '300px' : `${dimensions.height}px`,
              maxWidth: '90vw',
              aspectRatio: `${dimensions.width}/${dimensions.height}`
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Preview"
              className="absolute pointer-events-none select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'top left',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
              onLoad={updateImageDimensions}
              draggable={false}
            />
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button
              onClick={handleZoomIn}
              size="icon"
              className="bg-gray-900/80 hover:bg-gray-900"
              disabled={scale >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleZoomOut}
              size="icon"
              className="bg-gray-900/80 hover:bg-gray-900"
              disabled={scale <= 1}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Info */}
          <div className="absolute top-4 left-4 bg-gray-900/80 px-3 py-2 rounded-lg">
            <p className="text-white text-sm">Zoom: {Math.round(scale * 100)}%</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 border-t border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-400 text-sm text-center">
            💡 Arraste a imagem para posicionar • Use os botões de zoom para ajustar o tamanho • A imagem não pode sair do campo
          </p>
        </div>
      </div>
    </div>
  );
}