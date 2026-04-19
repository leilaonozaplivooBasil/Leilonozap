import { useState, useEffect, useRef, useCallback } from "react";
import { getServerTime } from "@/functions/getServerTime";

const COUNTDOWN_DURATION = 142;

const NARRATOR_TRIGGERS = [
  { time: 110, phase: 1, message: "🔨 Dou-lhe UMA! A contagem está correndo. Não deixe essa oportunidade escapar!" },
  { time: 70, phase: 2, message: "🔨🔨 Dou-lhe DUAS! A disputa está acirrada! Quem dará o próximo lance?" },
  { time: 35, phase: 3, message: "🔨🔨🔨 Dou-lhe TRÊS! Última chamada! Alguém mais vai participar dessa guerra?" }
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
      const { data } = await getServerTime();
      const clientAfterCall = Date.now();

      if (!data || typeof data.timestamp !== 'number') return false;

      const clientAverage = (clientBeforeCall + clientAfterCall) / 2;
      serverOffsetRef.current = data.timestamp - clientAverage;
      lastOffsetCalibrationRef.current = Date.now();
      return true;
    } catch (error) {
      console.error("❌ [CALIBRATE] Erro:", error);
      serverOffsetRef.current = null;
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
    auctioneerMessage,
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