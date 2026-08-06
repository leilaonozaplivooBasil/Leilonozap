// 🏅 FONTE ÚNICA dos SELOS OFICIAIS por cargo (imagem 3D circular da marca).
//
// Antes o cargo aparecia só como texto colorido (ex: "Loja Física" em azul
// escuro, ilegível no fundo preto da árvore). Agora cada cargo tem um selo
// oficial — a identidade visual entra automática, sem ninguém subir foto.
//
// A CHAVE é o id de careerLevels.js (fonte única dos cargos). Sempre passe o
// cargo por normalizeLevel antes de buscar aqui (getSeloCargo já faz isso).
import { normalizeLevel } from '@/lib/careerLevels';

const SELOS = {
  // ── Bloco REDE ────────────────────────────────────────────────
  usuario: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/97cd41fb5_generated_image.png',
  influenciador: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/d4cd142ec_generated_image.png',
  vendedor: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/179239212_generated_image.png',
  licenciado: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/335104412_generated_image.png',
  parceiro: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/62fabc6ac_generated_image.png',
  ponto_retirada: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/8e2b4b2d5_generated_image.png',
  loja_fisica: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/c0bb85205_generated_image.png',
  distribuidor: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/8bf50ed34_image.png',
  // ── Bloco DIRETOR ─────────────────────────────────────────────
  trainee_diretor: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/3d5ab9799_generated_image.png',
  executivo_conta: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/2e058ea71_generated_image.png',
  diretoria_operacao: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/8fba80b1f_generated_image.png',
  diretoria_executiva: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/3d1970471_generated_image.png',
  ceo: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/3583b9183_generated_image.png',
  livoo_live: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/94ec1ee29_generated_image.png',
  embaixador: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/3fc3b55a9_generated_image.png',
  conselheiro: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/b0999bb6b_generated_image.png',
  fundador: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/48494122a_generated_image.png',
};

/** URL do selo oficial do cargo (aceita ids legados). null se não houver. */
export function getSeloCargo(cargo) {
  return SELOS[normalizeLevel(cargo || 'usuario')] || null;
}

/** Foto de perfil real da pessoa (a que ela mesma cadastrou). null se não tiver. */
export function getFotoPerfil(user) {
  return user?.avatar_url || user?.profile_photo_url || null;
}