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

/* ───────────────────────── decisão do autosave ───────────────────────── */

export type NoteDraft = { title: string; content: string };

function igual(a: NoteDraft, b: NoteDraft): boolean {
  return a.title === b.title && a.content === b.content;
}

/**
 * Se o debounce que acabou de estourar deve virar gravação.
 *
 * `failed` é o texto exato da última tentativa que o servidor recusou — um
 * título vazio, por exemplo. Sem ele o editor reenviaria o mesmo texto a cada
 * 1,5s enquanto o erro durasse; com ele, a próxima tentativa só sai quando o
 * usuário mudar alguma coisa (ou pedir na mão, por `Ctrl+S`).
 */
export function shouldAutosave({
  draft,
  saved,
  saving,
  failed,
}: {
  draft: NoteDraft;
  saved: NoteDraft;
  saving: boolean;
  failed: NoteDraft | null;
}): boolean {
  if (saving) return false;
  if (igual(draft, saved)) return false;
  if (failed !== null && igual(draft, failed)) return false;

  return true;
}
