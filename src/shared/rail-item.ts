// A receita dos itens de pé do rail: 13px em `--ink-soft`, alinhados à
// esquerda. Mora aqui porque três features a consomem — a barra em
// `features/courses`, o tema em `features/theme` e o sair em `features/auth` —
// e no handoff elas são a mesma linha, uma embaixo da outra.
//
// Abaixo de 900px o rail é a barra do topo e todo item precisa de 44px de alvo
// (SPEC §6); ao lado da coluna o alvo volta ao padding de 6px do handoff.
export const CLASSE_ITEM_RODAPE =
  "flex min-h-11 items-center px-1 text-left text-xs text-ink-soft hover:text-ink rail:min-h-0 rail:px-0 rail:py-1.5";
