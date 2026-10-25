// Stub de next/navigation: o redirect de verdade interrompe a execução lançando,
// e o teste captura o destino pelo erro.
export class ErroDeRedirect extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`redirect para ${url}`);
    this.name = "ErroDeRedirect";
    this.url = url;
  }
}

export function redirect(url: string): never {
  throw new ErroDeRedirect(url);
}
