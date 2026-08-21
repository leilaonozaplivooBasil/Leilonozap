// Ponte para a função `searchMercadoLivre` do Base44.
//
// Criado em 27/07/2026 ao integrar a branch de produção com a main. Os componentes
// de validação de lote importam '@/functions/searchMercadoLivre', mas o arquivo não
// existia em nenhum dos dois lados: dentro do Base44 o plugin resolve esses imports
// sozinho, e fora dele o build quebra ("Could not load /src/functions/searchMercadoLivre").
// Este wrapper segue o mesmo padrão dos vizinhos em src/functions/ e faz o build
// passar nos dois ambientes. A função em si vive em base44/functions/searchMercadoLivre.
import { plataforma } from '@/api/plataformaClient';

export async function searchMercadoLivre(params) {
    return plataforma.functions.invoke('searchMercadoLivre', params);
}
