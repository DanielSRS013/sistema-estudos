// Stub de next/cache para a suíte de banco: registra as chamadas em vez de
// invalidar cache, para o teste afirmar o que a action revalidou.
export const revalidacoes: { path: string; type?: string }[] = [];

export function revalidatePath(path: string, type?: string): void {
  // A chave `type` só existe quando o argumento veio.
  revalidacoes.push(type === undefined ? { path } : { path, type });
}

export function revalidateTag(tag: string): void {
  revalidacoes.push({ path: `tag:${tag}` });
}

export function limparRevalidacoes(): void {
  revalidacoes.length = 0;
}
