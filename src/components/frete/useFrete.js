// useFrete — estado da cotação de frete (Melhor Envio via função cotarFrete).
// Guarda o último CEP digitado no navegador, pra não pedir de novo ao cliente.
// Não mexe em saldo, pedido nem comissão: só cotação.
import { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CEP_KEY = 'nz_ultimo_cep';

export function formatarCep(valor) {
  const d = String(valor || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export default function useFrete({ items = [], autoCalcular = false } = {}) {
  const [cep, setCep] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [opcoes, setOpcoes] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [erro, setErro] = useState('');
  const [jaCalculou, setJaCalculou] = useState(false);

  // recupera o último CEP usado
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CEP_KEY);
      if (salvo) setCep(formatarCep(salvo));
    } catch (_) { /* storage indisponível */ }
  }, []);

  const calcular = useCallback(async (cepAlvo) => {
    const limpo = String(cepAlvo ?? cep).replace(/\D/g, '');
    if (limpo.length !== 8) {
      setErro('Digite o CEP completo (8 números).');
      return;
    }
    setCarregando(true);
    setErro('');
    setOpcoes([]);
    setSelecionada(null);
    try {
      // o adapter devolve o JSON da função direto (não vem embrulhado em .data)
      const data = await base44.functions.invoke('cotarFrete', { cep: limpo, items });
      if (data?.success && Array.isArray(data.opcoes) && data.opcoes.length) {
        setOpcoes(data.opcoes);
        setSelecionada(data.opcoes[0]); // a mais barata já vem selecionada
        try { localStorage.setItem(CEP_KEY, limpo); } catch (_) { /* ignora */ }
      } else if (data?.error === 'not_implemented' || data?.error === 'network_or_not_implemented') {
        // acontece no ambiente de teste, onde as rotas /api não existem
        setErro('Cálculo de frete disponível no site publicado.');
      } else {
        setErro(data?.error || 'Não conseguimos calcular o frete para esse CEP.');
      }
    } catch (e) {
      setErro('Falha de conexão ao calcular o frete. Tente novamente.');
    } finally {
      setCarregando(false);
      setJaCalculou(true);
    }
  }, [cep, items]);

  // cotação automática quando já existe CEP salvo
  useEffect(() => {
    if (!autoCalcular || jaCalculou) return;
    if (String(cep).replace(/\D/g, '').length === 8) calcular(cep);
  }, [autoCalcular, cep, jaCalculou, calcular]);

  return {
    cep,
    setCep: (v) => setCep(formatarCep(v)),
    carregando,
    opcoes,
    selecionada,
    setSelecionada,
    erro,
    calcular,
    limpar: () => { setOpcoes([]); setSelecionada(null); setErro(''); },
  };
}