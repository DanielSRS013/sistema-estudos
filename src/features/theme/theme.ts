// Tema claro / escuro / sistema. Puro: nada de React, nada de banco. Quem
// chama é o script inline do layout (antes da pintura) e o controle no rail.
//
// `globals.css` traz as duas metades: o bloco `.dark` e a guarda
// `:root:not(.light)` sob `prefers-color-scheme`. Por isso o tema resolvido
// vira sempre uma classe explícita no `<html>` — inclusive "light", que é o
// que faz a guarda vencer o sistema quando o usuário escolhe o claro.

export const TEMAS = ["claro", "escuro", "sistema"] as const;

export type Tema = (typeof TEMAS)[number];

/** Classe aplicada ao `<html>`. Nunca as duas ao mesmo tempo. */
export type ClasseTema = "light" | "dark";

/** Onde a escolha mora. O servidor não a conhece: é preferência do aparelho. */
export const CHAVE_TEMA = "tema";

export const TEMA_PADRAO: Tema = "sistema";

/** Valor cru do `localStorage` virando escolha. Lixo vira o padrão. */
export function lerTema(bruto: string | null): Tema {
  return TEMAS.includes(bruto as Tema) ? (bruto as Tema) : TEMA_PADRAO;
}

/** A escolha mais o que o sistema operacional diz, numa classe só. */
export function classeDoTema(tema: Tema, prefereEscuro: boolean): ClasseTema {
  if (tema === "sistema") return prefereEscuro ? "dark" : "light";

  return tema === "escuro" ? "dark" : "light";
}

export const CONSULTA_ESCURO = "(prefers-color-scheme: dark)";

/**
 * O mesmo cálculo, numa string que roda no `<head>` antes da primeira pintura
 * — sem isso a página nasce no tema do sistema e pisca ao hidratar. Duplica a
 * lógica acima de propósito: aqui não há bundle, só texto. `theme.test.ts`
 * executa esta string contra um DOM de mentira para as duas não divergirem.
 */
export const SCRIPT_TEMA = `(function(){
var t=${JSON.stringify(TEMA_PADRAO)};
try{var g=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});if(${JSON.stringify([...TEMAS])}.indexOf(g)>=0){t=g}}catch(e){}
var d=t==="escuro"||(t==="sistema"&&!!window.matchMedia&&window.matchMedia(${JSON.stringify(CONSULTA_ESCURO)}).matches);
var c=document.documentElement.classList;
c.remove(d?"light":"dark");
c.add(d?"dark":"light");
})();`;
