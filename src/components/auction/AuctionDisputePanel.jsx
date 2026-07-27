import React from 'react';
import { fmtBR } from '@/lib/money';
import { Crown, Flame, Users, TrendingUp, Gavel } from 'lucide-react';

/**
 * Painel de disputa do lote — informações do arremate + ranking ao vivo
 * dos usuários que mais deram lances, para acirrar a competição.
 * Computa tudo das mensagens já carregadas na sala (message_type 'bid').
 */
export default function AuctionDisputePanel({ auction, messages, currentUser }) {
  const { bidders, totalBids } = React.useMemo(() => {
    const map = new Map();
    let total = 0;
    for (const m of messages || []) {
      if (m.message_type !== 'bid' || !m.sender_name) continue;
      total++;
      const key = m.sender_name;
      const cur = map.get(key) || { name: key, senderId: m.sender_id, bids: 0, best: 0 };
      cur.bids++;
      const amt = Number(m.bid_amount) || 0;
      if (amt > cur.best) cur.best = amt;
      map.set(key, cur);
    }
    const list = [...map.values()].sort((a, b) => b.bids - a.bids || b.best - a.best).slice(0, 5);
    return { bidders: list, totalBids: total };
  }, [messages]);

  const maxBids = bidders[0]?.bids || 1;
  const starting = Number(auction?.starting_price) || 0;
  const increment = Number(auction?.increment) || 0;

  return (
    <div className="adp">
      {/* Informações do arremate */}
      <div className="adp-stats">
        <div className="adp-stat">
          <span className="adp-stat-label">Lance inicial</span>
          <span className="adp-stat-value">R$ {fmtBR(starting)}</span>
        </div>
        <div className="adp-stat">
          <span className="adp-stat-label">Incremento</span>
          <span className="adp-stat-value">+ R$ {fmtBR(increment)}</span>
        </div>
        <div className="adp-stat">
          <span className="adp-stat-label">Lances</span>
          <span className="adp-stat-value adp-green"><Gavel size={11} /> {totalBids}</span>
        </div>
        <div className="adp-stat">
          <span className="adp-stat-label">Na disputa</span>
          <span className="adp-stat-value adp-green"><Users size={11} /> {bidders.length}</span>
        </div>
      </div>

      {/* Ranking da disputa */}
      {bidders.length > 0 && (
        <div className="adp-board">
          <div className="adp-board-head">
            <Flame size={13} className="text-orange-400" />
            <span>Disputa ao vivo</span>
            <span className="adp-live-dot" />
          </div>
          {bidders.map((b, i) => {
            const isMe = currentUser && (b.senderId === currentUser.id || b.name === (currentUser.nickname || currentUser.full_name));
            return (
              <div key={b.name} className={`adp-row ${i === 0 ? 'adp-leader' : ''} ${isMe ? 'adp-me' : ''}`}>
                <span className={`adp-rank adp-rank-${i + 1}`}>
                  {i === 0 ? <Crown size={12} /> : `${i + 1}º`}
                </span>
                <div className="adp-row-main">
                  <div className="adp-row-top">
                    <span className="adp-name">{b.name}{isMe ? ' (você)' : ''}</span>
                    <span className="adp-best"><TrendingUp size={10} /> R$ {fmtBR(b.best)}</span>
                  </div>
                  <div className="adp-bar">
                    <div className="adp-bar-fill" style={{ width: `${Math.max(12, (b.bids / maxBids) * 100)}%` }} />
                  </div>
                </div>
                <span className="adp-bids">{b.bids} {b.bids === 1 ? 'lance' : 'lances'}</span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .adp { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
        .adp-stats {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;
        }
        .adp-stat {
          display: flex; flex-direction: column; gap: 1px;
          padding: 8px 10px; border-radius: 10px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .adp-stat-label {
          font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(255, 255, 255, 0.42);
        }
        .adp-stat-value {
          display: flex; align-items: center; gap: 4px;
          font-size: 13px; font-weight: 800; color: #f2f6f4;
          font-variant-numeric: tabular-nums;
        }
        .adp-green { color: #4ade80; }

        .adp-board {
          border-radius: 14px;
          border: 1px solid rgba(74, 222, 128, 0.22);
          background: linear-gradient(165deg, rgba(16, 185, 129, 0.09), rgba(5, 26, 17, 0.55));
          backdrop-filter: blur(12px);
          padding: 10px;
          display: flex; flex-direction: column; gap: 7px;
        }
        .adp-board-head {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
          text-transform: uppercase; color: rgba(255, 255, 255, 0.75);
          padding: 0 2px 2px;
        }
        .adp-live-dot {
          width: 6px; height: 6px; border-radius: 999px; margin-left: auto;
          background: #f87171; box-shadow: 0 0 8px rgba(248, 113, 113, 0.9);
          animation: adp-blink 1.4s ease-in-out infinite;
        }
        @keyframes adp-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        .adp-row {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 8px; border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .adp-leader {
          background: linear-gradient(100deg, rgba(250, 204, 21, 0.12), rgba(255, 255, 255, 0.04) 60%);
          border-color: rgba(250, 204, 21, 0.35);
          animation: adp-leader-glow 2.4s ease-in-out infinite;
        }
        @keyframes adp-leader-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
          50% { box-shadow: 0 0 14px 0 rgba(250, 204, 21, 0.22); }
        }
        .adp-me { border-color: rgba(74, 222, 128, 0.45); }

        .adp-rank {
          flex-shrink: 0; width: 22px; height: 22px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.07);
        }
        .adp-rank-1 { background: linear-gradient(135deg, #facc15, #d97706); color: #422006; }
        .adp-rank-2 { background: linear-gradient(135deg, #e5e7eb, #9ca3af); color: #1f2937; }
        .adp-rank-3 { background: linear-gradient(135deg, #d9a15c, #92561d); color: #2b1503; }

        .adp-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .adp-row-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
        .adp-name {
          font-size: 11.5px; font-weight: 700; color: #f4f7f5;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .adp-best {
          display: flex; align-items: center; gap: 3px; flex-shrink: 0;
          font-size: 10px; font-weight: 700; color: #4ade80;
          font-variant-numeric: tabular-nums;
        }
        .adp-bar {
          height: 3px; border-radius: 999px; overflow: hidden;
          background: rgba(255, 255, 255, 0.07);
        }
        .adp-bar-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, #22c55e, #4ade80);
          transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .adp-bids {
          flex-shrink: 0; font-size: 9px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
