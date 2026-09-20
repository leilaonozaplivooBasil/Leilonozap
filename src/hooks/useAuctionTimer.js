import { useState, useEffect, useRef, useCallback } from "react";
import { getServerTime } from "@/functions/getServerTime";
import { deixaAoCruzar, marcarCruzadas } from "@/lib/falaDoLeiloeiro";

const COUNTDOWN_DURATION = 142;

// 🔨 As deixas e a decisão de QUANDO falar moram em src/lib/falaDoLeiloeiro.js:
// é JS puro, roda no teste do Node sem navegador, e o risco desta peça é
// justamente o relógio — que é o que mais difícil se prova numa tela.

export default function useAuctionTimer({ auction, onEndAuction, playSound }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [auctioneerPhase, setAuctioneerPhase] = useState(null);
  const [auctioneerMessage, setAuctioneerMessage] = useState("");
  const [showAuctioneer, setShowAuctioneer] = useState(false);

  const serverOffsetRef = useRef(null);
  const lastOffsetCalibrationRef = useRef(0);
  const countdownIntervalRef = useRef(null);
  const hammerAnnounced = useRef({ first: false, second: false, third: false });
  // Quantos segundos faltavam no tique PASSADO. É o que permite enxergar a
  // travessia de uma marca quando o tique pula — aba em segundo plano, tela
  // apagada, pausa de GC. `null` = ainda não houve tique anterior.
  const segundosNoTiqueAnterior = useRef(null);

  const calibrateServerOffset = useCallback(async () => {
    try {
      const clientBeforeCall = Date.now();
      // Guarda de timeout: getServerTime (função Base44) NÃO pode pendurar a sala.
      const { data } = await Promise.race([
        getServerTime(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("getServerTime timeout")), 4000)),
      ]);
      const clientAfterCall = Date.now();

      if (!data || typeof data.timestamp !== 'number') {
        // Resposta inválida: cai pro relógio do cliente pra NÃO travar o leilão.
        if (serverOffsetRef.current === null) serverOffsetRef.current = 0;
        lastOffsetCalibrationRef.current = Date.now();
        return false;
      }

      const clientAverage = (clientBeforeCall + clientAfterCall) / 2;
      serverOffsetRef.current = data.timestamp - clientAverage;
      lastOffsetCalibrationRef.current = Date.now();
      return true;
    } catch (error) {
      console.error("❌ [CALIBRATE] Falhou, usando relógio do cliente como fallback:", error?.message || error);
      // NUNCA deixar null depois de tentar — senão a sala fica "Sincronizando..." pra sempre
      // e NENHUM lance é aceito (sem lance = sem venda = sem comissão). Auto-cura quando o servidor voltar.
      if (serverOffsetRef.current === null) serverOffsetRef.current = 0;
      lastOffsetCalibrationRef.current = Date.now();
      return false;
    }
  }, []);

  const getServerSyncedTime = useCallback(() => {
    if (serverOffsetRef.current === null) return null;
    return Date.now() + serverOffsetRef.current;
  }, []);

  // Countdown effect
  useEffect(() => {
    if (!auction || auction.status !== 'active') {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setTimeRemaining(null);
      return;
    }

    const serverNow = getServerSyncedTime();
    if (serverNow === null) return;

    const endTime = new Date(auction.end_time).getTime();
    const timeUntilEnd = Math.floor((endTime - serverNow) / 1000);

    if (timeUntilEnd <= 0) {
      setTimeRemaining(0);
      setTimeout(() => onEndAuction(), 100);
      return;
    }

    setTimeRemaining(timeUntilEnd);
    hammerAnnounced.current = { first: false, second: false, third: false };
    segundosNoTiqueAnterior.current = null;

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    countdownIntervalRef.current = setInterval(() => {
      const nowCheck = getServerSyncedTime();
      if (nowCheck === null) return;

      const endTimeCheck = new Date(auction.end_time).getTime();
      const remaining = Math.floor((endTimeCheck - nowCheck) / 1000);

      if (remaining <= 0) {
        setTimeRemaining(0);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        onEndAuction();
        return;
      }

      setTimeRemaining(remaining);

      if (auction.status === 'active') {
        // 🔴 Era `remaining === trigger.time`: igualdade exata num valor lido
        // uma vez por segundo. Um tique pulado e a fala sumia PARA SEMPRE —
        // e aba em segundo plano pula quase todos. Agora vale a TRAVESSIA.
        const anterior = segundosNoTiqueAnterior.current;
        const deixa = deixaAoCruzar({ anterior, agora: remaining, jaDitas: hammerAnnounced.current });
        // Marca TODAS as marcas cruzadas, não só a falada: senão as que ficaram
        // para trás disparam fora de hora se o relógio oscilar para cima.
        hammerAnnounced.current = marcarCruzadas({ anterior, agora: remaining, jaDitas: hammerAnnounced.current });
        segundosNoTiqueAnterior.current = remaining;

        if (deixa) {
          playSound('countdown');
          setAuctioneerPhase(deixa.phase);
          setAuctioneerMessage(deixa.message);
          setShowAuctioneer(true);
        }
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [auction?.end_time, auction?.status, onEndAuction, playSound, getServerSyncedTime]);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  return {
    timeRemaining,
    auctioneerPhase,
    setAuctioneerPhase,
    auctioneerMessage,
    setAuctioneerMessage,
    showAuctioneer,
    setShowAuctioneer,
    serverOffsetRef,
    lastOffsetCalibrationRef,
    calibrateServerOffset,
    getServerSyncedTime,
    clearCountdown,
    COUNTDOWN_DURATION,
  };
}