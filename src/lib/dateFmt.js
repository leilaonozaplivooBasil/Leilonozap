// Substitui o moment() (removido — módulo pesado ~70KB gzip, só usado no
// financeiro) por date-fns, que já é dependência do projeto em outras telas.
// toDate() imita o comportamento do moment(valor) usado nesse código antes:
// string vira Date LOCAL (parseISO, não `new Date(str)` — string "YYYY-MM-DD"
// pura vira UTC meia-noite no Date nativo, o que troca o dia exibido em fusos
// negativos como o do Brasil), e vazio/ausente/invalido caem em "agora" em
// vez de travar a tela.
import { parseISO, isValid } from 'date-fns';

export function toDate(value) {
  if (value instanceof Date) return value;
  if (!value) return new Date();
  const d = parseISO(value);
  return isValid(d) ? d : new Date();
}
