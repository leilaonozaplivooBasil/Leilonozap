import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2 } from 'lucide-react';

export default function StoreShareLinkCard({ storeLink, isSaiDeBaixo }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(storeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-xl border p-4 ${isSaiDeBaixo ? 'bg-gray-50 border-gray-200' : 'bg-gray-900/50 border-gray-700'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Share2 className={`w-4 h-4 ${isSaiDeBaixo ? 'text-red-500' : 'text-emerald-400'}`} />
        <p className={`text-sm font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Compartilhe sua Loja Virtual</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={storeLink}
          readOnly
          className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900 font-mono text-sm' : 'bg-gray-800 border-gray-600 text-white font-mono text-sm'}
        />
        <Button
          onClick={handleCopy}
          className={copied ? 'bg-emerald-600 hover:bg-emerald-600 text-white shrink-0' : 'bg-green-600 hover:bg-green-700 text-white shrink-0'}
        >
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </Button>
      </div>
    </div>
  );
}