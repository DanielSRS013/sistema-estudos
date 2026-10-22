// As duas decisões dos formulários destas telas, fora do React — é onde o
// defeito caro mora, e aqui ele tem teste.
//
// Ambas nasceram de bug visto no navegador: o formulário que se fechava
// sozinho na montagem (e travava a página inteira) e o Enter que gravava duas
// vezes porque o blur seguinte reenviava.

import type { ActionState } from "@/shared/action-state";

/**
 * Se o formulário acabou de concluir: houve uma submissão nova e ela deu
 * certo.
 *
 * O estado ocioso de uma Server Action é `{ ok: true }` — o mesmo formato do
 * sucesso. Olhar só para `state.ok` dá "concluiu" já na montagem, antes de
 * qualquer envio. Quem decide é a troca de identidade do estado: `anterior`
 * é `null` enquanto nada foi enviado.
 */
export function concluiu(
  anterior: ActionState | null,
  atual: ActionState,
): boolean {
  if (anterior === null) return false;

  return anterior !== atual && atual.ok;
}

export type Renomeacao = "enviar" | "fechar" | "ignorar";

/**
 * O que fazer com o campo de renomear quando a pessoa tecla Enter ou sai dele.
 *
 * - `ignorar` enquanto a gravação anterior está em voo: Enter grava e o campo
 *   perde o foco logo depois, e sem isto o blur mandaria o mesmo título de
 *   novo. Em voo também não se fecha, ou a mensagem de erro que está por vir
 *   não teria onde aparecer.
 * - `fechar` quando não há o que gravar: título vazio ou igual ao que já está
 *   lá. Desistir é o caso comum, e gravar o mesmo nome marcaria uma edição
 *   que não houve.
 * - `enviar` no resto.
 */
export function decidirRenomeacao({
  valor,
  atual,
  pendente,
}: {
  valor: string;
  atual: string;
  pendente: boolean;
}): Renomeacao {
  if (pendente) return "ignorar";
  if (valor.trim() === "" || valor === atual) return "fechar";

  return "enviar";
}
