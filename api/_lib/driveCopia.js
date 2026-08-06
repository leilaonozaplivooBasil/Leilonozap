// 📁 Cópia de conveniência no Google Drive da empresa — SEMPRE best-effort.
//
// Regra dura: se qualquer coisa aqui falhar (ou se o Drive nem estiver
// configurado), a função que chama IGNORA e segue com sucesso. O cofre oficial
// é o Supabase Storage; o Drive é só para a equipe abrir do celular.
//
// Autenticação por refresh token da conta da empresa (mesmo padrão do Melhor
// Envio), porque as functions rodam na Vercel. Segredos necessários:
//   GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET · GOOGLE_DRIVE_REFRESH_TOKEN
//   GOOGLE_DRIVE_FOLDER_ID (opcional — pasta raiz onde tudo é gravado)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export const driveConfigurado = () => Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);

async function obterToken() {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) throw new Error('Token do Drive não renovado');
  const json = await resp.json();
  if (!json.access_token) throw new Error('Token do Drive ausente');
  return json.access_token;
}

// Devolve a URL do arquivo no Drive, ou null se não deu (nunca lança).
export async function copiarParaDrive(nomeArquivo, pdfBuffer) {
  if (!driveConfigurado()) return null;
  try {
    const token = await obterToken();
    const metadados = { name: nomeArquivo, mimeType: 'application/pdf' };
    if (FOLDER_ID) metadados.parents = [FOLDER_ID];

    const limite = '-------leilaonozap' + Date.now();
    const corpo = Buffer.concat([
      Buffer.from(
        `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`
        + JSON.stringify(metadados)
        + `\r\n--${limite}\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      pdfBuffer,
      Buffer.from(`\r\n--${limite}--\r\n`),
    ]);

    const resp = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${limite}`,
        },
        body: corpo,
      },
    );
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.webViewLink || (json?.id ? `https://drive.google.com/file/d/${json.id}/view` : null);
  } catch {
    return null;
  }
}