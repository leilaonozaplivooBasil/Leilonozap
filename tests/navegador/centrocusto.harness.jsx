/**
 * Banca do Centro de Custo / Categoria — NÃO vai para o bundle da loja.
 *
 * 🔴 POR QUE ISTO EXISTE (05/09/2026)
 * Aline: "Eu já criei alguns, sendo que não estão ficando salvos, estou tendo que criar a
 * cada lançamento."
 *
 * O que só um navegador mede: o que a pessoa REALMENTE vê quando abre o dropdown, e o que
 * sai gravado quando ela digita um valor no "+ Novo". Monta o ExpenseFormModal DE VERDADE,
 * com as listas montadas do mesmo jeito que Financial.jsx monta.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import ExpenseFormModal from '@/components/financial/ExpenseFormModal';
import { montarOpcoes, CATEGORIAS_DE_FABRICA } from '@/lib/listasDoFinanceiro';
import { COST_CENTERS } from '@/lib/costCenters';

// Exatamente o que estava gravado em financial_expenses em 05/09/2026.
const GASTOS = [
  { id: '1', cost_center: 'custo fixo', category: 'Salario' },
  { id: '2', cost_center: 'Custo Fixo', category: 'salario' },
  { id: '3', cost_center: 'custo variável ', category: 'alimentação' },
  { id: '4', cost_center: 'Distribuicao de lucro', category: 'Alimentacao' },
  { id: '5', cost_center: 'investimento', category: 'Aluguel Escritório ' },
];
const RECEITAS = [{ id: 'r1', cost_center: 'Loja Virtual' }, { id: 'r2', cost_center: 'Leilões' }];

function Banca() {
  const [salvo, setSalvo] = React.useState(null);
  const [extras, setExtras] = React.useState([]); // o que foi salvo nesta sessão entra na lista

  // MESMA montagem de Financial.jsx
  const categorias = montarOpcoes(CATEGORIAS_DE_FABRICA, GASTOS.map((g) => g.category));
  const centrosDeCusto = montarOpcoes(
    COST_CENTERS,
    [...GASTOS.map((g) => g.cost_center), ...extras],
    RECEITAS.map((r) => r.cost_center),
  );

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <ExpenseFormModal
        open
        onClose={() => {}}
        onSave={(d) => { setSalvo(d); if (d.cost_center) setExtras((e) => [...e, d.cost_center]); }}
        onBulkSave={() => {}}
        editingExpense={null}
        categorias={categorias}
        centrosDeCusto={centrosDeCusto}
      />
      {/* espelhos para o teste ler sem depender de portal do Radix */}
      <div data-teste="centros" hidden>{JSON.stringify(centrosDeCusto)}</div>
      <div data-teste="categorias" hidden>{JSON.stringify(categorias)}</div>
      <div data-teste="salvo" hidden>{salvo ? JSON.stringify(salvo) : ''}</div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
