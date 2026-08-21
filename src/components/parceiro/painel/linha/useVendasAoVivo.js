import React from 'react';
import { plataforma } from '@/api/plataformaClient';

// 🕒 REGISTRO DAS VENDAS AO VIVO — a venda que cai na frente do parceiro passa a
// ter horário REAL, gravado no banco (GiroVendaAoVivo). Assim ela aparece com o
// MESMO horário no computador, no celular e no app — e nunca sai do histórico.
// localStorage é só cache de leitura rápida (e rede de segurança se a rede cair).
export default function useVendasAoVivo({ seed, dataLocal, diaCiclo }) {
  const chave = `giro-aovivo-${seed}-${dataLocal}`;
  const [registros, setRegistros] = React.useState([]);

  const lerCache = React.useCallback(() => {
    try {
      const bruto = localStorage.getItem(chave);
      const lista = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }, [chave]);

  const salvarCache = React.useCallback(
    (lista) => {
      try {
        localStorage.setItem(chave, JSON.stringify(lista));
      } catch {
        /* storage indisponível: segue só com o banco */
      }
    },
    [chave]
  );

  // Carrega o dia: cache primeiro (instantâneo), banco depois (verdade oficial).
  React.useEffect(() => {
    let vivo = true;
    setRegistros(lerCache());
    (async () => {
      try {
        const linhas = await plataforma.entities.GiroVendaAoVivo.filter({ seed, data_local: dataLocal });
        if (!vivo || !Array.isArray(linhas)) return;
        const doBanco = linhas.map((l) => ({ indice: Number(l.indice), hora: l.hora_real }));
        // une banco + cache mantendo SEMPRE o horário mais antigo por índice
        const mapa = new Map();
        [...doBanco, ...lerCache()].forEach((r) => {
          const atual = mapa.get(r.indice);
          const ts = new Date(r.hora).getTime();
          if (!atual || ts < new Date(atual.hora).getTime()) mapa.set(r.indice, r);
        });
        const unido = Array.from(mapa.values());
        setRegistros(unido);
        salvarCache(unido);
      } catch {
        /* sem rede: o cache já está aplicado */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [seed, dataLocal, lerCache, salvarCache]);

  // Grava uma venda que acabou de cair (idempotente por índice do dia).
  const gravar = React.useCallback(
    (indice) => {
      const hora = new Date().toISOString();
      let jaTinha = false;
      setRegistros((prev) => {
        if (prev.some((r) => r.indice === indice)) {
          jaTinha = true;
          return prev;
        }
        const proximo = [...prev, { indice, hora }];
        salvarCache(proximo);
        return proximo;
      });
      if (jaTinha) return;
      plataforma.entities.GiroVendaAoVivo.create({
        seed,
        data_local: dataLocal,
        dia_ciclo: diaCiclo,
        indice,
        hora_real: hora,
      }).catch(() => {
        /* falha de rede: o cache mantém o horário neste aparelho */
      });
    },
    [seed, dataLocal, diaCiclo, salvarCache]
  );

  return { registros, gravar };
}