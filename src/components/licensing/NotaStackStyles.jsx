export default function NotaStackStyles() {
  return (
    <style>{`
      @keyframes entrance-guardian { from { transform: translateY(200px) translateX(-50px) rotate(-15deg) scale(0.5); opacity: 0; } to { transform: translateY(12px) translateX(-4px) rotate(-15deg) scale(1); opacity: 0.65; } }
      @keyframes entrance-backback { from { transform: translateX(-300px) translateY(0) rotate(-10deg) scale(0.7); opacity: 0; } to { transform: translateX(0) translateY(8px) rotate(-10deg) scale(1); opacity: 0.7; } }
      @keyframes entrance-back { from { transform: translateX(300px) translateY(0) rotate(-5deg) scale(0.7); opacity: 0; } to { transform: translateX(0) translateY(4px) rotate(-5deg) scale(1); opacity: 0.8; } }
      @keyframes entrance-side { from { transform: translateX(400px) translateY(-100px) rotate(10deg) scale(0.5); opacity: 0; } to { transform: translateX(12px) translateY(0) rotate(10deg) scale(1); opacity: 0.9; } }
      @keyframes entrance-front { from { transform: translateY(-300px) rotate(180deg) scale(0.3); opacity: 0; } to { transform: translateY(0) rotate(2deg) scale(1); opacity: 1; } }
      .nota-entrance-guardian { animation: entrance-guardian 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1s both; }
      .nota-entrance-backback { animation: entrance-backback 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s both; }
      .nota-entrance-back { animation: entrance-back 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.4s both; }
      .nota-entrance-side { animation: entrance-side 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.6s both; }
      .nota-entrance-front { animation: entrance-front 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 1.8s both; }
      .nota-stack-container { animation: float-notes 4s ease-in-out 3.5s infinite; }
      .nota-stack-guardian { animation: entrance-guardian 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1s both, float-guardian 5.5s ease-in-out 3.5s infinite; }
      .nota-stack-backback { animation: entrance-backback 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s both, float-backback 5s ease-in-out 3.5s infinite; }
      .nota-stack-back { animation: entrance-back 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.4s both, float-back 4.5s ease-in-out 3.5s infinite; }
      .nota-stack-front { animation: entrance-front 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 1.8s both, float-front 4s ease-in-out 3.5s infinite; }
      .nota-stack-side { animation: entrance-side 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.6s both, float-side 3.5s ease-in-out 3.5s infinite; }
      @keyframes float-notes { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes float-guardian { 0%, 100% { transform: rotate(-15deg) translateY(3px) translateX(-4px); } 50% { transform: rotate(-15deg) translateY(-3px) translateX(-4px); } }
      @keyframes float-backback { 0%, 100% { transform: rotate(-10deg) translateY(2px); } 50% { transform: rotate(-10deg) translateY(-4px); } }
      @keyframes float-back { 0%, 100% { transform: rotate(-5deg) translateY(1px); } 50% { transform: rotate(-5deg) translateY(-6px); } }
      @keyframes float-front { 0%, 100% { transform: rotate(2deg) translateY(0); } 50% { transform: rotate(2deg) translateY(-10px); } }
      @keyframes float-side { 0%, 100% { transform: rotate(10deg) translateX(12px) translateY(0); } 50% { transform: rotate(10deg) translateX(12px) translateY(-8px); } }
    `}</style>
  );
}