import { useState, useEffect, useRef, useCallback } from "react";
import { getServerTime } from "@/functions/getServerTime";

const COUNTDOWN_DURATION = 142;

const NARRATOR_TRIGGERS = [
  { time: 110, phase: 1, message: "Dou-lhe uma! O lote segue em disputa. Registre o seu lance." },
  { time: 70, phase: 2, message: "Dou-lhe duas! A disputa continua aberta. Últimos lances." },
  { time: 35, phase: 3, message: "Dou-lhe três! Última chamada antes do arremate." }
];

export default function useAuctionTimer({ auction, onEndAuction, playSound }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [auctioneerPhase, setAuctioneerPhase] = useState(null);
  const [auctioneerMessage, setAuctioneerMessage] = useState("");
  const [showAuctioneer, setShowAuctioneer] = useState(false);

  const serverOffsetRef = useRef(null);
  const lastOffsetCalibrationRef = useRef(0);
  const countdownIntervalRef = useRef(null);
  const hammerAnnounced = useRef({ first: false, second: false, third: false });

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
        NARRATOR_TRIGGERS.forEach((trigger) => {
          if (remaining === trigger.time) {
            const hammerKey = trigger.phase === 1 ? 'first' : trigger.phase === 2 ? 'second' : 'third';
            if (hammerKey && !hammerAnnounced.current[hammerKey]) {
              hammerAnnounced.current[hammerKey] = true;
              playSound('countdown');
              setAuctioneerPhase(trigger.phase);
              setAuctioneerMessage(trigger.message);
              setShowAuctioneer(true);
            }
          }
        });
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