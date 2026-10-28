// A casca dos campos da nota: o que o campo de mover e o seletor de tipo têm
// igual. Os dois moram nesta pasta e nenhum outro lugar os usa, então a casca
// fica aqui e não em `shared/`.
//
// Só a casca — borda, raio e fundo. Tamanho de texto, espaçamento e largura
// são de cada campo: o de mover a nota é uma linha de formulário que ocupa a
// faixa inteira em 15px; o seletor de tipo é um controle de 13px que mede o
// próprio conteúdo no cabeçalho do editor.

export const cascaDeCampo = "rounded-md border border-rule bg-paper";
