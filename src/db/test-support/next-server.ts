// Stub de next/server para a suíte de banco: `connection()` de verdade lança
// fora de uma requisição. Ela é chamada por `cards/queries.ts`,
// `notes/queries.ts` e `review/queries.ts`, só para marcar a leitura como
// dinâmica; aqui não há nada a marcar.
//
// O stub NÃO torna o relógio determinístico: as queries seguem usando o
// `new Date()` real. Quem precisar de instante fixo tem de obtê-lo de outro
// jeito (por exemplo, injetando o relógio), e este stub não o substitui.
export async function connection(): Promise<void> {}
