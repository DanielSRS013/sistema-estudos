"use client";

import { useCallback, useEffect, useState } from "react";

import type { ParseIssue } from "@/features/cards/parser";

import { saveNote } from "../actions";
import {
  idleStatus,
  saveStatusLabel,
  shouldAutosave,
  type NoteDraft,
  type SaveStatus,
} from "../status";

import { linkifyTags } from "@/features/tags/linkify";
import { MathMarkdown } from "@/shared/markdown";

/** Janela de silêncio antes de gravar. SPEC: 1,5s. */
const DEBOUNCE_MS = 1500;

type Texto = NoteDraft;

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
  // Texto da última tentativa recusada pelo servidor. Enquanto nada mudar, o
  // autosave não insiste sozinho — ver `shouldAutosave`.
  const [falhou, setFalhou] = useState<Texto | null>(null);
  const [status, setStatus] = useState<SaveStatus>(idleStatus);
  // O que a última gravação disse sobre os cards do texto. `null` enquanto
  // nada foi gravado nesta sessão.
  const [cards, setCards] = useState<{
    total: number;
    issues: ParseIssue[];
  } | null>(null);

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
      setFalhou(enviado);
      setStatus({ kind: "error", message: result.message });
      return;
    }

    // Só o que foi enviado conta como gravado: o que o usuário digitou durante
    // a ida ao servidor continua sujo e dispara a gravação seguinte.
    setFalhou(null);
    setGravado(enviado);
    setCards({ total: result.cardCount, issues: result.issues });
    setStatus({ kind: "saved", at: new Date(result.savedAt) });
  }, [noteId]);

  useEffect(() => {
    if (
      !shouldAutosave({
        draft: texto,
        saved: gravado,
        saving: gravando,
        failed: falhou,
      })
    ) {
      return;
    }

    const timer = setTimeout(() => void gravar(texto), DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [texto, gravado, gravando, falhou, gravar]);

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

  // Texto de volta ao que o servidor já tem: o erro anterior deixou de valer,
  // e não há nada pendente para anunciar.
  const visivel: SaveStatus =
    status.kind === "error" && !sujo ? idleStatus : status;
  const rotulo = saveStatusLabel(visivel);

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
          {visivel.kind === "error" ? (
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
          {cards === null ? null : (
            <div className="space-y-1 px-1 pt-1">
              <p className="font-mono text-xs text-ink-soft">
                {cards.total === 1 ? "1 card" : `${cards.total} cards`}
              </p>
              {/* Sintaxe torta é erro de validação, não silêncio — SPEC §3.3. */}
              {cards.issues.map((issue) => (
                <p
                  key={`${issue.line}-${issue.message}`}
                  role="alert"
                  className="text-xs text-destructive"
                >
                  Linha {issue.line}: {issue.message}
                </p>
              ))}
            </div>
          )}
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
              <MathMarkdown content={linkifyTags(texto.content)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
