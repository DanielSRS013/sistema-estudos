import { describe, expect, it } from "vitest";

import {
  CHAVE_TEMA,
  SCRIPT_TEMA,
  classeDoTema,
  lerTema,
  type Tema,
} from "./theme";

describe("lerTema", () => {
  it.each(["claro", "escuro", "sistema"] as const)(
    "aceita %s, que é o que o controle grava",
    (bruto) => {
      expect(lerTema(bruto)).toBe(bruto);
    },
  );

  it("cai no sistema quando nada foi gravado ainda", () => {
    expect(lerTema(null)).toBe("sistema");
  });

  it("cai no sistema diante de lixo no localStorage", () => {
    expect(lerTema("dark")).toBe("sistema");
  });
});

describe("classeDoTema", () => {
  it.each<[Tema, boolean, string]>([
    ["claro", false, "light"],
    ["claro", true, "light"],
    ["escuro", false, "dark"],
    ["escuro", true, "dark"],
    ["sistema", false, "light"],
    ["sistema", true, "dark"],
  ])(
    "com %s e prefers-color-scheme: dark = %s aplica .%s",
    (tema, prefereEscuro, classe) => {
      expect(classeDoTema(tema, prefereEscuro)).toBe(classe);
    },
  );
});

/* O script inline roda antes da pintura para a página não piscar no tema
   errado. Como ele vive dentro de uma string, o teste o executa de verdade
   contra um DOM de mentira — é o único jeito de não deixá-lo sem rede. */

function rodarScript({
  gravado,
  prefereEscuro,
  classeInicial = "",
  quebrarStorage = false,
}: {
  gravado: string | null;
  prefereEscuro: boolean;
  classeInicial?: string;
  quebrarStorage?: boolean;
}): string[] {
  const classes = new Set(classeInicial.split(" ").filter(Boolean));

  const documento = {
    documentElement: {
      classList: {
        add: (nome: string) => classes.add(nome),
        remove: (nome: string) => classes.delete(nome),
      },
    },
  };

  const armazenamento = {
    getItem: (chave: string) => {
      if (quebrarStorage) throw new Error("armazenamento bloqueado");
      return chave === CHAVE_TEMA ? gravado : null;
    },
  };

  const janela = {
    matchMedia: (consulta: string) => ({
      matches: consulta.includes("dark") && prefereEscuro,
    }),
  };

  const executar = new Function(
    "window",
    "document",
    "localStorage",
    SCRIPT_TEMA,
  ) as (w: unknown, d: unknown, s: unknown) => void;

  executar(janela, documento, armazenamento);

  return [...classes];
}

describe("SCRIPT_TEMA", () => {
  it("aplica o tema gravado antes da pintura", () => {
    expect(rodarScript({ gravado: "escuro", prefereEscuro: false })).toContain(
      "dark",
    );
  });

  it("segue o sistema quando a escolha é sistema", () => {
    expect(rodarScript({ gravado: "sistema", prefereEscuro: true })).toContain(
      "dark",
    );
  });

  it("marca claro explicitamente, para a guarda :root:not(.light) valer", () => {
    expect(rodarScript({ gravado: "claro", prefereEscuro: true })).toEqual([
      "light",
    ]);
  });

  it("tira a classe do tema anterior em vez de acumular as duas", () => {
    expect(
      rodarScript({
        gravado: "escuro",
        prefereEscuro: false,
        classeInicial: "light",
      }),
    ).toEqual(["dark"]);
  });

  it("não derruba a página quando o armazenamento está bloqueado", () => {
    expect(
      rodarScript({
        gravado: "escuro",
        prefereEscuro: true,
        quebrarStorage: true,
      }),
    ).toEqual(["dark"]);
  });

  it("preserva as classes de fonte que o layout põe no <html>", () => {
    const classes = rodarScript({
      gravado: "claro",
      prefereEscuro: false,
      classeInicial: "font-plex-sans antialiased",
    });

    expect(classes).toEqual(["font-plex-sans", "antialiased", "light"]);
  });
});

describe("contrato entre o script e o controle", () => {
  it("usa a mesma chave de localStorage que o controle lê", () => {
    expect(SCRIPT_TEMA).toContain(JSON.stringify(CHAVE_TEMA));
  });
});
