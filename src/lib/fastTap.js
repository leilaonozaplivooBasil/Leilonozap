// 📱 fastTap — resposta no PRIMEIRO toque no iOS (Safari e PWA standalone).
// O iOS às vezes segura/descarta o clique sintético em controles de headers fixos
// (usuário precisa tocar 2x). Aqui a ação dispara direto no touchend, com
// preventDefault pra cancelar o clique sintético (sem disparo duplo) e guarda de
// arrasto (se o dedo moveu >10px é scroll, não toque). No desktop segue o onClick.
export function fastTap(action) {
  let sx = 0, sy = 0, moved = false;
  return {
    onClick: (e) => action(e),
    onTouchStart: (e) => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; moved = false;
    },
    onTouchMove: (e) => {
      const t = e.touches[0];
      if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) moved = true;
    },
    onTouchEnd: (e) => {
      if (moved) return;
      e.preventDefault(); // cancela o clique sintético atrasado do iOS
      action(e);
    },
  };
}
