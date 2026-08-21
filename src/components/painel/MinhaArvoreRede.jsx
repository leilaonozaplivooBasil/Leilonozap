import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { Loader2, Network, Maximize2, Minimize2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import TreeHierarchy from '@/components/network/TreeHierarchy';
import UserEditModal from '@/components/admin/UserEditModal';

// 🌳 MINHA ÁRVORE GENEALÓGICA — A MESMA DO PAINEL DE CONTROLE (08/08/2026)
//
// É exatamente o mesmo componente de árvore do Painel de Controle
// (NetworkOverview), só que a RAIZ é a própria pessoa: ela aparece como uma
// bolinha única no topo e, abaixo, todos os níveis da árvore dela.
//
// Quem pode mexer:
//   • super admin e admin → mesmos poderes do Painel de Controle (arrastar para
//     mudar o indicador, editar dados, promover/mudar cargo).
//   • demais cargos → somente leitura (vê a árvore inteira, não altera nada).
//
// Nenhuma regra de comissão é tocada aqui: mudar o indicador usa a MESMA rota do
// Painel de Controle (adminUpdateUser), que é quem valida permissão e grava.

const AppUser = plataforma.entities.AppUser;

export default function MinhaArvoreRede({ user }) {
  const [todos, setTodos] = useState(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [editando, setEditando] = useState(null);

  const podeEditar = user?.role === 'admin' || user?.role === 'super_admin';

  const carregar = useCallback(async () => {
    try {
      const lista = await AppUser.list('-created_date', 1000);
      setTodos(Array.isArray(lista) ? lista : []);
    } catch {
      setTodos([]);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Eu + todo mundo abaixo de mim. Como meu indicador fica FORA da lista,
  // a árvore me desenha automaticamente como a raiz (bolinha única no topo).
  const minhaRede = useMemo(() => {
    if (!todos || !user?.id) return [];
    const ativos = todos.filter((u) => u.active !== false);
    const eu = ativos.find((u) => u.id === user.id);
    if (!eu) return [];
    const filhosDe = {};
    ativos.forEach((u) => {
      const pai = u.referred_by_id || u.recruited_by_id;
      if (!pai || pai === u.id) return;
      (filhosDe[pai] = filhosDe[pai] || []).push(u);
    });
    const saida = [{ ...eu, referred_by_id: null }];
    const vistos = new Set([eu.id]);
    const fila = [eu.id];
    while (fila.length) {
      const atual = fila.shift();
      for (const f of filhosDe[atual] || []) {
        if (vistos.has(f.id)) continue;
        vistos.add(f.id);
        // quem veio por recrutamento entra na árvore pelo mesmo caminho
        saida.push({ ...f, referred_by_id: atual });
        fila.push(f.id);
      }
    }
    return saida;
  }, [todos, user?.id]);

  // Mudar o indicador — mesma rota do Painel de Controle
  const aoMover = useCallback(async (idMovido, idNovoPai) => {
    if (!podeEditar) {
      toast.error('Só o administrador pode mudar a posição na árvore.');
      throw new Error('sem permissão');
    }
    const r = await plataforma.functions.invoke('adminUpdateUser', {
      userId: idMovido,
      updates: { referred_by_id: idNovoPai },
      actorId: user.id,
    });
    if (!r || r.success !== true) throw new Error(r?.error || 'o servidor não confirmou a gravação');
    await carregar();
  }, [podeEditar, user?.id, carregar]);

  const aoEditar = useCallback((alvo) => {
    if (!podeEditar) {
      toast.info('Aqui a árvore é só para acompanhar. Alterações são feitas pelo administrador.');
      return;
    }
    setEditando(alvo);
  }, [podeEditar]);

  const aoExcluir = useCallback(() => {
    toast.info('Excluir cadastro é feito no Painel de Controle, com confirmação e lixeira.');
  }, []);

  if (todos === null) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-10">
        <Loader2 className="w-5 h-5 animate-spin" /> Montando sua árvore…
      </div>
    );
  }

  if (!minhaRede.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-8 text-center text-gray-400">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
        Não foi possível localizar seu cadastro na árvore. Atualize a página.
      </div>
    );
  }

  return (
    // nz-escuro: a árvore mantém o visual escuro do Painel de Controle mesmo
    // dentro do painel claro (é a MESMA tela, não pode mudar de cara).
    <div className={telaCheia
      ? 'nz-escuro fixed inset-0 z-[120] bg-gray-950 flex flex-col'
      : 'nz-escuro rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden'}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-900/60">
        <Network className="w-4 h-4 text-green-400 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-green-400">Minha Árvore Genealógica</span>
        <span className="text-[11px] text-gray-500 hidden sm:inline">
          {podeEditar
            ? 'arraste uma pessoa sobre outra para mudar o indicador (pede confirmação)'
            : 'toda a sua rede, nível por nível — só leitura'}
        </span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setTelaCheia((v) => !v)}
          className="h-7 text-[11px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white hover:text-black"
        >
          {telaCheia
            ? <><Minimize2 className="w-3.5 h-3.5 mr-1.5" />Sair da tela cheia</>
            : <><Maximize2 className="w-3.5 h-3.5 mr-1.5" />Tela cheia</>}
        </Button>
      </div>

      <div className={telaCheia ? 'flex-1 min-h-0 overflow-hidden' : ''}>
        <TreeHierarchy
          users={minhaRede}
          allUsers={todos}
          fullHeight={telaCheia}
          onEdit={aoEditar}
          onPromote={aoEditar}
          onDelete={aoExcluir}
          onRelink={podeEditar ? aoMover : undefined}
          onAtualizado={carregar}
        />
      </div>

      {editando && (
        <UserEditModal
          user={editando}
          isOpen={true}
          onClose={() => setEditando(null)}
          onSuccess={async () => { setEditando(null); await carregar(); toast.success('Cadastro atualizado!'); }}
          allUsers={todos}
        />
      )}
    </div>
  );
}