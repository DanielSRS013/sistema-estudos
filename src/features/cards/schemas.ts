// Validação da entrada das Server Actions desta feature. Escrito à mão: o que
// chega é `FormData`, e `cards.suspended` não é campo de inserção — o parser é
// quem cria card, nunca um formulário.

import { z } from "zod";

const id = z.uuid({ error: "Card não encontrado." });

// "true"/"false" porque a origem é um <input type="hidden"> de formulário.
const suspended = z
  .enum(["true", "false"], { error: "Valor inválido." })
  .transform((value) => value === "true");

export const setCardSuspendedSchema = z.object({ id, suspended });

export type SetCardSuspendedInput = z.output<typeof setCardSuspendedSchema>;
