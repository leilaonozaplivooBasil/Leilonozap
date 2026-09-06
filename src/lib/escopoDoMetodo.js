// 🔒 O ESCOPO DO MÉTODO — a lista, o contato e o agendamento são INDIVIDUAIS
// (dono, 06/09/2026): "cada um só vê a sua lista individual. A mesma coisa no
// agendamento e no contato. Só quem pode ver tudo é o super admin."
//
// O resto do CRM segue a matriz de papéis (visibilidadePorPapel.js: visão
// total pra admins e diretoria, rede própria pra todo o resto). Os Hábitos
// 3, 4 e 5 do Método são mais fechados que isso: a lista de networking é
// patrimônio de cada um — nem diretor, nem admin, nem a rede abaixo enxerga a
// lista do outro. Só o super_admin (o dono) vê todas.
//
// Puro, sem React: quem cadastrou (created_by_id) é o dono da pessoa da
// lista; a oportunidade de captação é de quem responde por ela ou a criou.
// Cadastro legado sem carimbo de dono fica só com o super admin — melhor
// esconder do que vazar.

export function escopoDoMetodo({ clientes = [], oportunidades = [], uid = null, superAdmin = false } = {}) {
  if (superAdmin) return { clientes, oportunidades, total: true };
  if (!uid) return { clientes: [], oportunidades: [], total: false };
  return {
    clientes: clientes.filter((c) => c?.created_by_id === uid),
    oportunidades: oportunidades.filter((o) => o?.responsavel_id === uid || o?.criado_por_id === uid),
    total: false,
  };
}
