import React, { useState, useEffect } from "react";

export default function CountdownTimer({ endTime, serverTimeOffset = 0 }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      // 🆕 USA TEMPO SINCRONIZADO COM SERVIDOR (para corrigir hora errada do Android)
      const now = Date.now() + serverTimeOffset;
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft("Encerrado");
        return;
      }

      // 📅 MAIS DE 1 SEMANA (7 dias)
      const weeks = Math.floor(difference / (1000 * 60 * 60 * 24 * 7));
      if (weeks > 0) {
        setTimeLeft(`${weeks} semana${weeks > 1 ? 's' : ''}`);
        return;
      }

      // 📅 MAIS DE 1 DIA
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      if (days > 0) {
        setTimeLeft(`${days} dia${days > 1 ? 's' : ''}`);
        return;
      }

      // ⏰ MENOS DE 1 DIA - Formato HH:MM:SS
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(seconds).padStart(2, '0');
      
      setTimeLeft(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endTime, serverTimeOffset]);

  const isUrgent = timeLeft.includes(':') && 
                   !timeLeft.includes('dia') && 
                   !timeLeft.includes('semana') &&
                   parseInt(timeLeft.split(':')[0]) === 0;

  return (
    <span className={`font-mono ${isUrgent ? 'text-red-500 animate-pulse' : ''}`}>
      {timeLeft}
    </span>
  );
}