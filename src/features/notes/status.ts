// Estado do autosave do editor. Puro: o editor decide quando mudar de estado,
// este módulo só diz como ele se lê na tela.

/** Fuso do usuário. O corte de dia lógico de SPEC §4 mora no scheduler. */
const FUSO = "America/Sao_Paulo";

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

export const idleStatus: SaveStatus = { kind: "idle" };

const hora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Texto do indicador discreto do editor. `null` significa "não mostre nada":
 * antes da primeira gravação não há o que anunciar.
 */
export function saveStatusLabel(status: SaveStatus): string | null {
  switch (status.kind) {
    case "idle":
      return null;
    case "saving":
      return "Salvando…";
    case "saved":
      return `Salvo ${hora.format(status.at)}`;
    case "error":
      return status.message;
  }
}
