/**
 * Banca da exportação do Financeiro — NÃO vai para o bundle da loja.
 *
 * 🔴 POR QUE ISTO EXISTE (03/09/2026)
 * "A opção de exportar em planilha ainda não está disponível."
 *
 * O que só um navegador mede: o clique realmente baixa um arquivo, o conteúdo
 * que sai é o da LISTA FILTRADA (não a base toda), e o botão desliga quando não
 * há linha nenhuma na tela.
 *
 * Monta um Financeiro de mentira com a MESMA montagem da tela real:
 * `conteudoDoArquivo(filtered)` + Blob + download.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { conteudoDoArquivo, nomeDoArquivo } from '@/lib/planilhaFinanceiro';
import ExpenseTable from '@/components/financial/ExpenseTable';

// Duas linhas do print do dono, mais duas armadilhas.
const BASE = [
  { id: '1', description: 'Hotel Restaurante', company: 'Hotel Restaurante', category: 'alimentação',
    expense_type: 'fixo', payment_status: 'pendente', payment_method: 'pix',
    due_date: '2026-09-30', amount: 23629, total_amount: 23629 },
  { id: '2', description: 'Concorcio Bradesco', company: 'Concorcio Bradesco',
    category: 'carta consorcio custo fixo', expense_type: 'fixo', payment_status: 'pendente',
    payment_method: 'pix', due_date: '2026-09-27', amount: 1010, total_amount: 1010 },
  // ponto-e-vírgula na descrição: escorregaria a linha de coluna
  { id: '3', description: 'Hotel; diária de setembro', company: 'Hotel', category: 'alimentação',
    expense_type: 'unico', payment_status: 'pago_integral', payment_method: 'boleto',
    due_date: '2026-09-15', payment_date: '2026-09-15', amount: 500, amount_paid: 500,
    total_amount: 500, cost_center: 'Matriz', notes: 'sem observação', created_by: 'luiz' },
  // fórmula disfarçada: viraria conta executável na máquina de quem abrir
  { id: '4', description: '=1+1', company: '@REF', category: 'teste',
    expense_type: 'parcelado', payment_status: 'vencido', payment_method: 'pix',
    due_date: '2026-08-20', amount: 59.9, total_amount: 59.9,
    installment_current: 3, installment_total: 12 },
];

function Banca() {
  // simula o filtro da tela: só os "pendente" (2 das 4 linhas)
  const [soPendentes, setSoPendentes] = React.useState(false);
  const [vazio, setVazio] = React.useState(false);
  const filtered = vazio ? [] : (soPendentes ? BASE.filter((g) => g.payment_status === 'pendente') : BASE);

  // MESMA montagem da tela real
  const baixarPlanilha = () => {
    const url = URL.createObjectURL(
      new Blob([conteudoDoArquivo(filtered)], { type: 'text/csv;charset=utf-8' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeDoArquivo();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 12 }}>
      <button data-teste="filtrar-pendentes" onClick={() => setSoPendentes((v) => !v)}>
        filtro: {soPendentes ? 'só pendentes' : 'todos'}
      </button>
      <button data-teste="esvaziar" onClick={() => setVazio((v) => !v)}>esvaziar</button>
      <button
        data-teste="exportar"
        onClick={baixarPlanilha}
        disabled={filtered.length === 0}
      >
        Exportar Planilha
      </button>
      <span data-teste="na-tela">{filtered.length}</span>

      {/* a tabela real, para conferir que a planilha fala a mesma língua */}
      <div data-teste="tabela">
        <ExpenseTable expenses={filtered} onEdit={() => {}} onDelete={() => {}} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
