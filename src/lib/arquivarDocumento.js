// 🗄️ Arquivamento do documento assinado — disparo em SEGUNDO PLANO.
//
// Chamado logo depois que a assinatura foi registrada com sucesso. Manda o
// servidor gerar o PDF uma única vez, guardar no cofre privado (Supabase
// Storage) e copiar no Google Drive.
//
// ⚠️ REGRA DESTE ARQUIVO: nunca atrapalhar o parceiro.
// • Não bloqueia a tela (não é aguardado pelo fluxo).
// • Nunca lança erro pra cima — falha em silêncio e só registra no console.
// • Se falhar, o fluxo antigo (gerar o PDF na hora) continua atendendo.
// • O servidor é idempotente: chamar duas vezes não duplica arquivo.
import { base44 } from '@/api/base44Client';

export function arquivarDocumentoAssinado(assinaturaId) {
  if (!assinaturaId) return;

  // Fire-and-forget de propósito: o `catch` garante que nenhuma falha de rede
  // vire "unhandled rejection" na tela do parceiro.
  base44.functions
    .invoke('arquivarDocumentoAssinado', { assinatura_id: assinaturaId })
    .then((resp) => {
      if (resp?.success) {
        console.debug('[cofre] documento arquivado:', resp.arquivo_path);
      } else {
        console.debug('[cofre] arquivamento não concluído:', resp?.error);
      }
    })
    .catch((e) => {
      console.debug('[cofre] arquivamento indisponível:', e?.message || e);
    });
}