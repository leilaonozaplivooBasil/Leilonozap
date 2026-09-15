// Banners que vêm do Painel de Mídia (tabela banner_images).
//
// 🖼️ 15/09/2026 — o painel tem duas colunas: Desktop e Mobile. O carrossel
// (RotatingBanner) mostra só a arte do dispositivo em que a pessoa está. Isso é
// correto quando as DUAS colunas estão preenchidas — e vira tela preta quando
// uma delas está vazia, porque o filtro não encontra nada e o banner some.
//
// Regra desta função: se NÃO existe arte para algum dispositivo, a arte que
// existe passa a servir os dois (`device_type: 'any'`). Quando o dono preencher
// as duas colunas, cada dispositivo volta a receber a sua arte — sem mexer aqui.
export function normalizarBannersPorDispositivo(lista) {
  const banners = Array.isArray(lista) ? lista.filter(Boolean) : [];
  if (banners.length === 0) return [];

  const tipo = (b) => b.device_type || 'desktop';
  const temDesktop = banners.some((b) => tipo(b) === 'desktop' || tipo(b) === 'any');
  const temMobile = banners.some((b) => tipo(b) === 'mobile' || tipo(b) === 'any');

  // Só falta arte de um lado → a que existe atende os dois.
  if (temDesktop && temMobile) return banners;
  return banners.map((b) => ({ ...b, device_type: 'any' }));
}

// 🎬 15/09/2026 — O CARROSSEL DE BANNERS NÃO TOCA VÍDEO.
//
// ⚠️ CORREÇÃO DO COMENTÁRIO ANTERIOR (mesmo dia). Quando isto foi escrito, a
// explicação dada era que existiam linhas de vídeo cadastradas no Painel de
// Mídia. ESTAVA ERRADO: `banner_images` não tem coluna de vídeo — conferido no
// banco. Os vídeos que o dono via em /leiloes vinham do bundle antigo em cache
// no navegador dele, e sumiram sozinhos no recarregamento.
//
// A função fica porque a regra continua valendo e custa uma linha: `RotatingBanner`
// toca `video_url` em qualquer banner que tenha o campo, venha de onde vier — foi
// assim que os 3 vídeos institucionais entravam, pelas listas fixas que saíram do
// código. Isto é o cinto que impede a lista fixa de voltar por outro caminho.
// Ordem do dono, ao pé da letra: as artes novas "devem ser os únicos banners".
export function semVideos(lista) {
  return (Array.isArray(lista) ? lista : []).filter((b) => b && !b.video_url);
}

// Ordena pelo campo `order` do painel (o dono decide quem é o principal),
// descarta vídeo e normaliza o dispositivo. É o que toda página deve chamar
// depois do fetch.
export function prepararBannersDoPainel(lista) {
  // `filter` já devolve array NOVO — é o que permite o `sort` abaixo ser in-place
  // sem tocar na lista de quem chamou. Importa porque as páginas guardam essa
  // lista no sessionStorage e reaproveitam o mesmo objeto.
  const ordenados = semVideos(Array.isArray(lista) ? lista.filter(Boolean) : [])
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  return normalizarBannersPorDispositivo(ordenados);
}
