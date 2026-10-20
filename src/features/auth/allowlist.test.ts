import { describe, expect, it } from "vitest";

import { isPermitido, parseAllowlist } from "./allowlist";

describe("parseAllowlist", () => {
  it("separa por vírgula, apara espaço e normaliza caixa", () => {
    expect(parseAllowlist(" Daniel@Exemplo.com , danielsrs ")).toEqual([
      "daniel@exemplo.com",
      "danielsrs",
    ]);
  });

  it("descarta entradas vazias", () => {
    expect(parseAllowlist("danielsrs,,  ,")).toEqual(["danielsrs"]);
  });

  it("variável ausente vira lista vazia", () => {
    expect(parseAllowlist(undefined)).toEqual([]);
  });
});

describe("isPermitido", () => {
  const lista = ["daniel@exemplo.com", "danielsrs"];

  it("aceita o e-mail listado, sem olhar caixa", () => {
    expect(isPermitido({ email: "Daniel@Exemplo.com" }, lista)).toBe(true);
  });

  it("aceita o login do GitHub listado", () => {
    expect(isPermitido({ login: "DanielSRS" }, lista)).toBe(true);
  });

  it("recusa quem não está na lista", () => {
    expect(isPermitido({ email: "outro@exemplo.com", login: "outro" }, lista)).toBe(
      false,
    );
  });

  it("recusa identidade sem e-mail nem login", () => {
    expect(isPermitido({ email: null, login: null }, lista)).toBe(false);
  });

  // Fail closed: env mal configurada tranca o app, não abre.
  it("lista vazia recusa todo mundo", () => {
    expect(isPermitido({ email: "daniel@exemplo.com" }, [])).toBe(false);
  });

  // Uma entrada com arroba é e-mail; não pode casar com um login homônimo.
  it("entrada de e-mail não casa com login", () => {
    expect(isPermitido({ login: "daniel@exemplo.com" }, lista)).toBe(false);
  });

  // E o inverso: uma entrada sem arroba é login; não vale como e-mail.
  it("entrada de login não casa com e-mail", () => {
    expect(isPermitido({ email: "danielsrs" }, lista)).toBe(false);
  });
});
