"use client";

import { useCallback, useEffect, useState } from "react";

import { saveNote } from "../actions";
import { idleStatus, saveStatusLabel, type SaveStatus } from "../status";

import { NoteMarkdown } from "./markdown";

/** Janela de silêncio antes de gravar. SPEC: 1,5s. */
const DEBOUNCE_MS = 1500;

type Texto = { title: string; content: string };

/**
 * Editor da nota: Markdown à esquerda, render à direita, coluna única abaixo
 * de 900px. Grava sozinho 1,5s depois da última tecla, e na hora quando o
 * campo perde o foco ou o usuário pede `Ctrl+S` — assim um refresh no meio da
 * digitação não leva o parágrafo embora.
 */
export function Editor({
  noteId,
  initialTitle,
  initialContent,
}: {
  noteId: string;
  initialTitle: string;
  initialContent: string;
}) {
  const [texto, setTexto] = useState<Texto>({
    title: initialTitle,
    content: initialContent,
  });
  // Último texto que o servidor confirmou. A diferença com `texto` é o que
  // ainda falta gravar.
  const [gravado, setGravado] = useState<Texto>(texto);
  const [gravando, setGravando] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(idleStatus);

  const sujo =
    texto.title !== gravado.title || texto.content !== gravado.content;

  // O texto vai por argumento: o efeito abaixo re-arma a cada tecla, então o
  // timer que estoura sempre carrega o estado mais recente.
  const gravar = useCallback(async (enviado: Texto) => {
    setGravando(true);
    setStatus({ kind: "saving" });

    const result = await saveNote({ id: noteId, ...enviado });

    setGravando(false);

    if (!result.ok) {
      setStatus({ kind: "error", message: result.message });
      return;
    }

    // Só o que foi enviado conta como gravado: o que o usuário digitou durante
    // a ida ao servidor continua sujo e dispara a gravação seguinte.
    setGravado(enviado);
    setStatus({ kind: "saved", at: new Date(result.savedAt) });
  }, [noteId]);

  useEffect(() => {
    if (!sujo || gravando) return;

    const timer = setTimeout(() => void gravar(texto), DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [sujo, gravando, texto, gravar]);

  // Fechar a aba com texto não gravado pede confirmação. Notas e histórico de
  // revisão são insubstituíveis; 1,5s de texto também conta.
  useEffect(() => {
    if (!sujo) return;

    const avisar = (event: BeforeUnloadEvent) => event.preventDefault();

    window.addEventListener("beforeunload", avisar);

    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  const agora = useCallback(() => {
    if (sujo && !gravando) void gravar(texto);
  }, [sujo, gravando, gravar, texto]);

  const atalho = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "s" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      agora();
    },
    [agora],
  );

  const rotulo = saveStatusLabel(status);

  return (
    <div className="space-y-4" onKeyDown={atalho}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <input
          value={texto.title}
          onChange={(event) =>
            setTexto((anterior) => ({ ...anterior, title: event.target.value }))
          }
          onBlur={agora}
          aria-label="Título da nota"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-2xl font-semibold tracking-tight text-ink hover:border-rule focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none"
        />
        <p
          aria-live="polite"
          className="shrink-0 px-1 font-mono text-xs text-ink-soft"
        >
          {status.kind === "error" ? (
            <span className="text-destructive">{rotulo}</span>
          ) : (
            (rotulo ?? (sujo ? "Não salvo" : ""))
          )}
        </p>
      </div>

      <div className="grid gap-4 editor:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="note-markdown"
            className="block px-1 font-mono text-xs text-ink-soft"
          >
            markdown
          </label>
          <textarea
            id="note-markdown"
            value={texto.content}
            onChange={(event) =>
              setTexto((anterior) => ({
                ...anterior,
                content: event.target.value,
              }))
            }
            onBlur={agora}
            spellCheck
            // O `$$` em linha própria é o que vira fórmula em display; numa
            // linha só, o remark-math o trata como inline.
            placeholder={
              "# Título\n\nInline: $a^2 + b^2 = c^2$.\n\nEm bloco:\n\n$$\nx^2 + y^2 = r^2\n$$"
            }
            className="min-h-[24rem] w-full resize-y rounded-md border border-rule bg-paper px-3 py-2 font-mono text-sm leading-relaxed text-ink placeholder:text-ink-soft focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none editor:min-h-[60vh]"
          />
        </div>

        <div className="space-y-1">
          <p className="px-1 font-mono text-xs text-ink-soft">
            pré-visualização
          </p>
          <div className="min-h-[24rem] overflow-x-auto rounded-md border border-rule px-3 py-2 editor:min-h-[60vh]">
            {texto.content.trim() === "" ? (
              <p className="font-serif text-base text-ink-soft">
                O que você escrever à esquerda aparece aqui.
              </p>
            ) : (
              <NoteMarkdown content={texto.content} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
