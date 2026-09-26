// 🔨 A FESTA DO FIM: o "VENDIDO!" é do leilão, não da requisição (26/09/2026)
//
// O caso: o Luciano assistiu ao PS5 até o fim e a animação do leiloeiro não
// apareceu. A festa (3 marteladas, balão "VENDIDO para …", modal do vencedor)
// só disparava DENTRO da resposta da chamada `finalizeAuction` feita por
// aquele aparelho. O celular dele estava com a rede falhando para o servidor
// das funções ("Load failed" das 17:46 às 18:01): as três tentativas caíram,
// a sala soube do fim pela sincronização normal (que passa por outro caminho
// e funcionava), mostrou "Encerrado" e o card do vencedor no chat — e ficou
// muda. Quem não tinha a sala aberta no segundo exato também nunca via.
//
// Regra nova: a sala celebra quando VÊ o leilão passar de `active` para
// `ended`/`sold`, venha isso da própria chamada, da sincronização ou do
// realtime. Uma vez só. Quem abre a sala de um leilão já encerrado não vê
// festa — não é "ao vivo".
const FINAIS = ['ended', 'sold'];

/**
 * Deve celebrar agora?
 * @param {{anterior: string|null|undefined, atual: string|null|undefined, jaCelebrou: boolean}} x
 */
export function deveCelebrar({ anterior, atual, jaCelebrou }) {
  if (jaCelebrou) return false;
  if (anterior !== 'active') return false;
  return FINAIS.includes(String(atual || ''));
}

/** A frase do balão do leiloeiro na fase 4. */
export function fraseDoVendido(winnerName) {
  return winnerName ? `🎉 VENDIDO para ${winnerName}! 🎉` : '🔨 Leilão encerrado!';
}
