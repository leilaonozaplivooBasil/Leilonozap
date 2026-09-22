// 🖼️ AS FOTOS DA JANELA — a pasta, num lugar só
//
// Elas moram aqui e não dentro do .jsx porque quem troca a semana de fotos
// não deveria precisar abrir uma tela de 1.400 linhas pra fazer isso: é
// acrescentar (ou tirar) uma linha desta lista, e pronto.
//
// ⚠️ SOBRE A RESOLUÇÃO (22/09/2026, dito na cara do dono): estas três têm
// 894, 894 e 424 pixels de largura. Um celular de 414pt em 3x pede ~1.240.
// Elas vão aparecer MAIS MACIAS que a cena desenhada — isso foi medido, não
// achado, e o dono decidiu subir assim mesmo pra ver na tela real. O grão de
// filme e o véu por cima ajudam a disfarçar. No dia em que existir foto
// licenciada em resolução alta, é trocar o arquivo: nada mais muda.
//
// 🪟 As três já trazem a PRÓPRIA janela dentro da imagem — por isso o fundo
// esconde a janela desenhada quando há foto. Duas molduras, uma por cima da
// outra, viram erro visual.
import marPassaros from '@/assets/ritual/mar-passaros.webp';
import solNoPier from '@/assets/ritual/sol-no-pier.webp';
import janelaDoCafe from '@/assets/ritual/janela-do-cafe.webp';

export const FOTOS_DA_JANELA = Object.freeze([marPassaros, solNoPier, janelaDoCafe]);
