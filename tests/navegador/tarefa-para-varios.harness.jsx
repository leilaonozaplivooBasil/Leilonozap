/**
 * Banca da TAREFA PARA VÁRIAS PESSOAS — NÃO vai para o bundle do app.
 *
 * A régua (quem recebe, uma cópia por pessoa) tem provas no Node. Isto mede o
 * que só a tela responde: marcar pessoas na lista, o botão contar quantas, e
 * ao distribuir cada uma ganhar a PRÓPRIA tarefa, o próprio card ligado a ela
 * e o próprio sino — num insert só por tabela.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import DistribuirTarefa from '@/components/licensing/CentralVendas/DistribuirTarefa';
import { PARTICIPANTE_PADRAO } from '@/lib/xgame';

window.__bancoFalso = { tabelas: { metodo_tarefas: [], metodo_quadro: [], xgame_mensagens: [] }, escritas: [] };

const EQUIPE = [
  { id: 'emannuel', nome: 'Emannuel Lima', funcao: 'Diretoria de Operação' },
  { id: 'ailton', nome: 'Ailton Avilla', funcao: 'Vendedor' },
  { id: 'iara', nome: 'Iara Figueiredo', funcao: 'Executivo de Conta' },
  { id: 'sophia', nome: "Sophia Sant'anna", funcao: 'Loja Física' },
  { id: 'vinicius', nome: 'Vinicius Silva', funcao: 'Vendedor' },
];
const nomeDe = (id) => EQUIPE.find((p) => p.id === id)?.nome || id;
const participanteDe = (id) => ({ ...PARTICIPANTE_PADRAO, user_id: id, fixo_mes: 3000, temFixo: true });

function Banca() {
  const [pessoa, setPessoa] = useState('ailton');
  const [dia, setDia] = useState('2026-09-25');
  return (
    <div style={{ padding: 16, maxWidth: 980, background: '#0A1410', minHeight: '100vh' }}>
      <DistribuirTarefa
        currentUser={{ id: 'emannuel', full_name: 'Emannuel Alves de Lima' }}
        equipe={EQUIPE.slice(0, 3)} pessoasMetodo={EQUIPE}
        participanteDe={participanteDe} nomeDe={nomeDe}
        pessoa={pessoa} onPessoa={setPessoa} dia={dia} onDia={setDia}
      />
      <Toaster richColors position="top-center" />
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<Banca />);
