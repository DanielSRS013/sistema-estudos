// Estado de retorno das Server Actions. Erro de validação volta como mensagem
// legível — nunca como throw cru.

export type ActionState = { ok: true } | { ok: false; message: string };

export const idleState: ActionState = { ok: true };
