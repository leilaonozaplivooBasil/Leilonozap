import { plataforma } from '@/api/plataformaClient';

// Wrapper do Superagente (Heloim IA). Invoca a Backend Function 'askAgente'
// e normaliza o retorno para { data } — formato esperado pela página HeloimIA.
export async function askAgente(params) {
  const data = await plataforma.functions.invoke('askAgente', params);
  return { data };
}