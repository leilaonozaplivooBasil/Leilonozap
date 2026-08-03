// Intercala banners de vídeo entre banners de imagem, mantendo a ordem relativa
// de cada grupo (nunca embaralha a ordem interna de imagens nem de vídeos).
// Ex: [img1,img2,img3,img4] + [v1,v2] => [img1,v1,img2,img3,v2,img4]
export function interleaveBanners(images, videos) {
  if (!Array.isArray(videos) || videos.length === 0) return images || [];
  if (!Array.isArray(images) || images.length === 0) return videos;

  const result = [];
  const ratio = images.length / videos.length;
  let videoIndex = 0;

  images.forEach((img, i) => {
    result.push(img);
    if (videoIndex < videos.length && (i + 1) >= Math.round(ratio * (videoIndex + 1))) {
      result.push(videos[videoIndex]);
      videoIndex++;
    }
  });

  while (videoIndex < videos.length) {
    result.push(videos[videoIndex]);
    videoIndex++;
  }

  return result;
}