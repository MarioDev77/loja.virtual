/**
 * lib/format.js — helpers de formatação. Réplica fiel de brl() no front
 * vanilla (front/assets/app.js).
 */
export function brl(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
