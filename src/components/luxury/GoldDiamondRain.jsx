import React, { useMemo } from "react";

export default function GoldDiamondRain({ count = 40 }) {
  const particles = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // 0-100%
      size: 2 + Math.floor(Math.random() * 5), // 2-6px
      duration: 6 + Math.random() * 10, // 6-16s
      delay: Math.random() * 8, // 0-8s
      drift: -8 + Math.random() * 16, // -8 a 8px de drift lateral
      type: Math.random() < 0.5 ? "gold" : "diamond",
    }));
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      <style>{`
        @keyframes spark-fall {
          0% { transform: translate3d(0,-10vh,0) scale(1) rotate(0deg); opacity: 0.95; }
          70% { opacity: 0.9; }
          100% { transform: translate3d(var(--drift, 8px),110vh,0) scale(0.85) rotate(180deg); opacity: 0; }
        }
        .spark {
          position: absolute;
          top: -10%;
          border-radius: 9999px;
          animation-name: spark-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        .spark.gold {
          background: radial-gradient(circle, #ffd166 0%, #e2b646 60%, rgba(226,182,70,0.35) 100%);
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.55), 0 0 18px rgba(255,215,0,0.25);
        }
        .spark.diamond {
          background: radial-gradient(circle, #e8f7ff 0%, #cfe9ff 60%, rgba(207,233,255,0.35) 100%);
          box-shadow: 0 0 8px rgba(184, 233, 255, 0.55), 0 0 18px rgba(184,233,255,0.25);
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          className={`spark ${p.type}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            // pequena deriva horizontal para dar vida
            ['--drift']: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}