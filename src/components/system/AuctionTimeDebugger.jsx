import React, { useState } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuctionTimeDebugger({ 
  auction, 
  serverTimeOffset, 
  timeRemaining, 
  getServerSyncedTime,
  currentUser,
  onManualSync // 🆕 Callback para sync manual
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🆕 ATUALIZAÇÃO MANUAL
  const updateDebug = () => {
    if (!auction) return;
    
    const now = Date.now();
    const serverSynced = getServerSyncedTime ? getServerSyncedTime() : null;
    const endTime = new Date(auction.end_time).getTime();

    const data = {
      clientNow: now,
      clientNowISO: new Date(now).toISOString(),
      serverSynced: serverSynced,
      serverSyncedISO: serverSynced ? new Date(serverSynced).toISOString() : 'N/A',
      offset: serverTimeOffset,
      offsetSeconds: Math.floor(serverTimeOffset / 1000),
      auctionEndTime: endTime,
      auctionEndISO: auction.end_time,
      auctionStatus: auction.status,
      timeRemainingState: timeRemaining,
      timeRemainingByClient: Math.floor((endTime - now) / 1000),
      timeRemainingByServer: serverSynced ? Math.floor((endTime - serverSynced) / 1000) : null,
      statusMismatch: serverSynced 
        ? (endTime > serverSynced && auction.status !== 'active') || (endTime <= serverSynced && auction.status === 'active')
        : (endTime > now && auction.status !== 'active') || (endTime <= now && auction.status === 'active'),
      offsetIsValid: Math.abs(serverTimeOffset) < 3600000,
    };

    setDebugData(data);
  };

  // 🆕 SYNC MANUAL DO BANCO
  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      if (onManualSync) {
        await onManualSync();
      }
      updateDebug();
      console.log("✅ [DEBUG] Dados atualizados manualmente");
    } catch (error) {
      console.error("❌ [DEBUG] Erro ao atualizar:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 🔒 VERIFICAÇÃO DE ADMIN
  if (!currentUser || currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          updateDebug();
        }}
        className="fixed top-20 left-4 bg-red-600 text-white p-2 rounded-full shadow-lg z-[998] hover:bg-red-700 transition-colors animate-pulse"
        title="Abrir Debug (Admin)"
      >
        <AlertTriangle className="w-5 h-5" />
      </button>
    );
  }

  const hasError = debugData.statusMismatch || !debugData.offsetIsValid;

  return (
    <div className="fixed top-20 left-4 bg-gray-900 border-2 border-red-500 rounded-lg shadow-2xl z-[998] max-w-sm w-full max-h-[80vh] overflow-hidden flex flex-col">
      <div className="sticky top-0 bg-red-600 text-white p-3 flex justify-between items-center flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-bold text-sm">DEBUG ADMIN</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="hover:bg-red-700 p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-3 text-xs font-mono">
        
        {/* BOTÕES DE AÇÃO */}
        <div className="flex gap-2">
          <Button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-xs"
          >
            {isRefreshing ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Atualizar
              </>
            )}
          </Button>
          
          <Button
            onClick={updateDebug}
            className="flex-1 bg-purple-600 hover:bg-purple-700 h-8 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Recalcular
          </Button>
        </div>

        {/* STATUS GERAL */}
        <div className={`p-2 rounded ${hasError ? 'bg-red-900/30 border border-red-500' : 'bg-green-900/30 border border-green-500'}`}>
          <div className="font-bold text-white mb-1 text-xs flex items-center gap-1">
            {hasError ? '🔴 ERRO' : '✅ OK'}
          </div>
          <div className="text-white space-y-0.5 text-[10px]">
            <div>Status: <span className="font-bold">{debugData.auctionStatus}</span></div>
            <div>Timer: <span className="font-bold">{debugData.timeRemainingState}s</span></div>
            <div className={debugData.statusMismatch ? 'text-red-400 font-bold' : ''}>
              Match: {debugData.statusMismatch ? '❌' : '✅'}
            </div>
          </div>
        </div>

        {/* TEMPO RESTANTE */}
        <div className="bg-orange-900/20 p-2 rounded border border-orange-500/30">
          <div className="text-orange-400 font-bold mb-1 text-[10px]">⏰ TEMPO</div>
          <div className="text-gray-300 space-y-0.5 text-[10px]">
            <div>Estado: <span className="font-bold">{debugData.timeRemainingState}s</span></div>
            <div>Por Servidor: <span className={`font-bold ${debugData.timeRemainingByServer < 0 ? 'text-red-400' : ''}`}>
              {debugData.timeRemainingByServer !== null ? `${debugData.timeRemainingByServer}s` : 'N/A'}
            </span></div>
          </div>
        </div>

        {/* OFFSET */}
        <div className="bg-purple-900/20 p-2 rounded border border-purple-500/30">
          <div className="text-purple-400 font-bold mb-1 text-[10px]">🔧 OFFSET</div>
          <div className="text-gray-300 space-y-0.5 text-[10px]">
            <div>ms: <span className="font-bold">{debugData.offset}</span></div>
            <div>seg: <span className="font-bold">{debugData.offsetSeconds}s</span></div>
          </div>
        </div>

        {/* COPIAR JSON */}
        <Button 
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
            alert('Debug copiado!');
          }}
          className="w-full bg-gray-700 hover:bg-gray-600 h-8 text-xs"
        >
          📋 Copiar JSON
        </Button>

      </div>
    </div>
  );
}