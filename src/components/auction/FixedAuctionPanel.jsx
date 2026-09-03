import React from 'react';
import { fmtBR } from '@/lib/money';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Zap, Clock } from 'lucide-react';
import CountdownTimer from '../common/CountdownTimer';
import { textoDeTermino } from '@/lib/relogioLeilao';

export default function FixedAuctionPanel({ auction }) {
  if (!auction || !auction.id) return null;

  const currentPrice = auction.current_price || auction.starting_price;
  const roomUrl = createPageUrl("AuctionRoom") + `?id=${auction.id}`;

  console.log("🎯 [PAINEL FIXO] URL da sala:", roomUrl);

  const fimEmTexto = textoDeTermino(auction?.end_time);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden z-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0 text-left">
          <p className="text-xs text-gray-600 flex items-center gap-1">
             <Clock className="w-3 h-3" /> 
             <span>Termina em <CountdownTimer endTime={auction.end_time} /></span>
          </p>
          {/* 🔴 03/09/2026 — a data vai em LINHA PRÓPRIA, não concatenada: colar
              a data na frase daria "Termina em 11/09 às 12:28", que é português
              errado. E o `&&` importa — sem ele, leilão sem data mostraria a
              palavra "Termina" sozinha. */}
          {fimEmTexto && (
            <p className="text-[10px] text-gray-500 leading-tight">Termina {fimEmTexto}</p>
          )}
          <p className="text-xl font-bold text-green-600">
            R$ {fmtBR(currentPrice)}
          </p>
        </div>
        <Link 
          to={roomUrl}
          className="flex-grow"
          onClick={() => console.log("🎯 [PAINEL] Navegando para:", roomUrl)}
        >
          <Button className="w-full bg-green-600 hover:bg-green-700 font-bold py-3 text-base shadow-lg shadow-green-500/30">
            <Zap className="w-5 h-5 mr-2" />
            Entrar na Sala
          </Button>
        </Link>
      </div>
    </div>
  );
}