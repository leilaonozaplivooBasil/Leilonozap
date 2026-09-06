// 🏛️ O GRUPO TO THE TOP — a cultura, num lugar só (06/09/2026).
//
// O dono mandou as marcas e a página da cultura "só pra você ter a visão e
// já inserir as empresas, pra todo mundo ficar tendo a visão geral". Então
// aqui mora o que a página diz, palavra por palavra: a visão, a missão e os
// valores inegociáveis. As empresas (os cinco pilares) estão em funcoes.js,
// porque é de lá que sai o dia de cada função.
import { EMPRESAS } from './funcoes.js';

export const GRUPO = {
  nome: 'To The Top Corporate',
  papel: 'Venture Builder, Venture Capital e Holding Estratégica das empresas do grupo',
  frase: 'Não apenas investimos — construímos sistemas empresariais sólidos, replicáveis e duradouros.',
  principio: 'Recrutar caráter e treinar habilidades.',
  numeros: [['10+', 'anos de atuação'], ['5000+', 'vidas transformadas'], ['200+', 'profissionais'], ['8+', 'empresas no grupo']],
};

export const VISAO = {
  titulo: 'Estamos lendo o jornal de 2044.',
  texto: 'Nossa visão é desenvolver negócios atemporais através de um método e cultura que permitirá a humanidade pensar e viver de forma livre. Projetamos continuidade institucional, formação de líderes e expansão estruturada de empresas sólidas.',
};

export const MISSAO = {
  titulo: 'Expandir o capital intelectual humano em escala global até 2044',
  texto: 'formando líderes, estruturando empresas sólidas e influenciando a maneira como pessoas pensam, trabalham e constroem negócios.',
  nota: 'Não queremos ser medidos apenas por faturamento, mas pelo impacto gerado na sociedade. Nossa missão não termina em resultados trimestrais. Ela se consolida em legado.',
};

/** Os valores inegociáveis, na ordem da página. Não são slogans: são critérios de decisão, de liderança e de permanência. */
export const VALORES = [
  'Gratidão', 'Verdade', 'Integridade', 'Responsabilidade', 'Propósito', 'Ética', 'Compromisso', 'Palavra', 'Disciplina', 'Paciência',
  'Fidelidade', 'Continuidade', 'Resiliência', 'Respeito', 'Coragem', 'Humildade', 'Autodomínio', 'Excelência',
];

/** Os cinco pilares, cada um uma empresa — na ordem da página da cultura. */
export const PILARES = EMPRESAS.filter((e) => e.id !== 'to_the_top');
