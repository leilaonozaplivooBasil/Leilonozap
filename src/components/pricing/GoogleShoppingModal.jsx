import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function GoogleShoppingModal({ isOpen, onClose, productName }) {
  const googleShoppingUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(productName)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] bg-white text-gray-900 p-0">
        <DialogHeader className="p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                🛒 Google Shopping
              </DialogTitle>
              <p className="text-gray-600 text-sm mt-2">
                Buscando: <span className="font-semibold">{productName}</span>
              </p>
            </div>
            <a
              href={googleShoppingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Abrir em Nova Aba
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </DialogHeader>

        <div className="w-full h-[70vh]">
          <iframe
            src={googleShoppingUrl}
            className="w-full h-full border-0"
            title="Google Shopping"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>

        <div className="flex justify-end p-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}