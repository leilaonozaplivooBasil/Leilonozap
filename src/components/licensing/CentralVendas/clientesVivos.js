import { createContext } from 'react';

// 🔗 25/09/2026 — os nomes VIVOS das pessoas que os cards apontam.
// O quadro busca todos numa consulta só (pessoasDosCartoes) e põe aqui; o chip
// de cada card lê daqui em vez de mostrar a cópia gravada na hora do vínculo.
// Mapa cliente_id → { full_name } | null (null = a pessoa foi apagada da lista).
// Fica num arquivo próprio pra LeadDoCartao não importar o QuadroCompromisso
// (que importa o LeadDoCartao — seria um círculo).
export const ClientesVivosContext = createContext(null);
