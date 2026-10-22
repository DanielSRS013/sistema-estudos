import { describe, expect, it } from "vitest";

import { concluiu, decidirRenomeacao } from "./form-flow";

const ocioso = { ok: true } as const;

describe("concluiu", () => {
  it("não conclui na montagem: o estado ocioso é `ok` como o de sucesso", () => {
    // Era este o defeito que travava a tela inteira: "se ok, feche" fechava
    // o formulário antes de qualquer submissão.
    expect(concluiu(null, ocioso)).toBe(false);
  });

  it("não conclui quando o estado não mudou", () => {
    expect(concluiu(ocioso, ocioso)).toBe(false);
  });

  it("conclui quando uma submissão nova volta bem-sucedida", () => {
    expect(concluiu(ocioso, { ok: true })).toBe(true);
  });

  it("não conclui quando a submissão volta com erro", () => {
    expect(concluiu(ocioso, { ok: false, message: "x" })).toBe(false);
  });

  it("conclui no acerto depois de um erro", () => {
    const erro = { ok: false, message: "x" } as const;
    expect(concluiu(erro, { ok: true })).toBe(true);
  });
});

describe("decidirRenomeacao", () => {
  it("envia o título novo", () => {
    expect(
      decidirRenomeacao({ valor: "Vetores e bases", atual: "Vetores", pendente: false }),
    ).toBe("enviar");
  });

  it("fecha sem gravar quando o título não mudou", () => {
    expect(
      decidirRenomeacao({ valor: "Vetores", atual: "Vetores", pendente: false }),
    ).toBe("fechar");
  });

  it("fecha sem gravar o título vazio", () => {
    expect(
      decidirRenomeacao({ valor: "   ", atual: "Vetores", pendente: false }),
    ).toBe("fechar");
  });

  it("ignora enquanto a gravação anterior está em voo", () => {
    // Enter grava e o campo perde o foco em seguida: sem isto, o blur
    // mandaria o mesmo título uma segunda vez.
    expect(
      decidirRenomeacao({ valor: "Vetores e bases", atual: "Vetores", pendente: true }),
    ).toBe("ignorar");
  });

  it("ignora o valor repetido mesmo em voo, sem fechar o campo", () => {
    // Fechar em voo esconderia a mensagem de erro que está por vir.
    expect(
      decidirRenomeacao({ valor: "Vetores", atual: "Vetores", pendente: true }),
    ).toBe("ignorar");
  });
});
