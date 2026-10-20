// Validação da entrada da Server Action dos limites.
//
// Escrito à mão, sem `drizzle-zod`: o que chega é `FormData`, logo dois
// campos de texto. `z.coerce.number()` não serve — `Number("")` é 0, e campo
// vazio gravaria "nenhum card novo por dia" em silêncio.

import { z } from "zod";

/** Tetos de sanidade. O CHECK do banco guarda a linha única, não a faixa. */
export const MAX_NEW_PER_DAY = 999;
export const MAX_REVIEWS_PER_DAY = 9999;

function contagem(rotulo: string, max: number) {
  return z
    .string({ error: `${rotulo}: use um número inteiro de 0 a ${max}.` })
    .trim()
    .regex(/^\d+$/, `${rotulo}: use um número inteiro de 0 a ${max}.`)
    .transform(Number)
    .refine((n) => n <= max, `${rotulo}: o máximo é ${max}.`);
}

export const saveLimitsSchema = z.object({
  newPerDay: contagem("Novos por dia", MAX_NEW_PER_DAY),
  reviewsPerDay: contagem("Revisões por dia", MAX_REVIEWS_PER_DAY),
});

export type SaveLimitsInput = z.output<typeof saveLimitsSchema>;
