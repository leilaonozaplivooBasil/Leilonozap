/**
 * Converte um arquivo de imagem (PNG, JPG, BMP, etc.) para WebP no frontend.
 * Reduz tamanho em ~25-35% sem perda visível de qualidade.
 * Se o browser não suportar WebP ou a conversão falhar, retorna o arquivo original.
 * 
 * @param {File} file - Arquivo de imagem original
 * @param {number} quality - Qualidade WebP (0.0 a 1.0), padrão 0.85
 * @param {number} maxWidth - Largura máxima (redimensiona se maior), padrão 1920
 * @returns {Promise<File>} - Arquivo convertido para WebP (ou original se falhar)
 * @param {boolean} force - Força a conversão mesmo se o arquivo WebP ficar maior
 */
export async function convertToWebP(file, quality = 0.85, maxWidth = 1920, force = false) {
  // Se já é WebP, retorna sem converter
  if (file.type === 'image/webp') {
    return file;
  }

  // Se não é imagem, retorna original
  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);

    // Calcula dimensões mantendo proporção
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: 'image/webp', quality });

    // Só usa WebP se for menor que o original, ou se force for true
    if (!force && blob.size >= file.size) {
      return file;
    }

    const fileName = file.name.replace(/\.[^.]+$/, '.webp');
    return new File([blob], fileName, { type: 'image/webp', lastModified: Date.now() });
  } catch (e) {
    // OffscreenCanvas não suportado (Safari antigo) — fallback com canvas normal
    try {
      return await convertToWebPFallback(file, quality, maxWidth, force);
    } catch {
      // Se tudo falhar, retorna original — sem quebrar nada
      console.debug('WebP conversion not supported, using original');
      return file;
    }
  }
}

function convertToWebPFallback(file, quality, maxWidth, force = false) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || (!force && blob.size >= file.size)) {
            resolve(file);
            return;
          }
          const fileName = file.name.replace(/\.[^.]+$/, '.webp');
          resolve(new File([blob], fileName, { type: 'image/webp', lastModified: Date.now() }));
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}