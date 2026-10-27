"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { marcarLacunasVazias } from "@/features/cards/empty-gaps";
import type { ParseIssue } from "@/features/cards/parser";

import { saveNote, setNoteKind } from "../actions";
import { isNoteKind, noteKindOptions, type NoteKind } from "../kind";
import {
  idleStatus,
  saveStatusLabel,
  shouldAutosave,
  type NoteDraft,
  type SaveStatus,
} from "../status";

import { linkifyTags } from "@/features/tags/linkify";
import { cn } from "@/shared/cn";
import { MathMarkdown } from "@/shared/markdown";

import { cascaDeCampo } from "./campo";

/** Janela de silêncio antes de gravar. SPEC §5: 900ms, como o handoff. */
const DEBOUNCE_MS = 900;

type Texto = NoteDraft;

/** Onde a nota mora, para o fio do cabeçalho: curso · aula, sem o módulo. */
export type Trilha = {
  courseTitle: string;
  courseHref: string;
  lessonTitle: string;
  lessonHref: string;
};

/** Um aviso do cabeçalho do editor: título em 600 e corpo, ou só corpo. */
function Aviso({ titulo, corpo }: { titulo: string | null; corpo: string }) {
  return (
    <div className="grid gap-1">
      {titulo === null ? null : (
        <strong className="font-semibold">{titulo}</strong>
      )}
      <span>{corpo}</span>
    </div>
  );
}

/**
 * Seletor do tipo da nota, no cabeçalho. Troca na hora: o tipo é um valor de
 * uma lista fechada, não texto a digitar, então não entra no debounce do
 * autosave. Sem rótulo visível porque o próprio valor se lê — o handoff não
 * tem esse controle no editor, e inventar uma etiqueta seria inventar tela.
 *
 * Não desabilita durante a gravação: com o `<select>` fechado, cada seta já
 * dispara `change`, e desabilitar o elemento em foco joga o foco para o
 * `body` — quem fosse de "Anotação de aula" até "Resolução" pelo teclado
 * gravaria "Resumo" e perderia o foco no caminho. Quem ordena as respostas é
 * `trocarTipo`, não o `disabled`.
 */
function SeletorDeTipo({
  value,
  onChange,
}: {
  value: NoteKind;
  onChange: (kind: NoteKind) => void;
}) {
  return (
    <select
      value={value}
      aria-label="Tipo da nota"
      onChange={(event) => {
        // O `<select>` só oferece os valores da lista; o guarda existe porque
        // o tipo dele é `string`, e asserção não é verificação.
        if (isNoteKind(event.target.value)) onChange(event.target.value);
      }}
      className={cn(
        cascaDeCampo,
        "w-fit justify-self-start px-2 py-1 text-xs text-ink-soft",
      )}
    >
      {noteKindOptions().map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** O cabeçalho de cada painel: 13px soft sobre filete, dentro do painel. */
function Painel({ titulo }: { titulo: string }) {
  return (
    <div className="border-b border-rule px-4 py-2 text-xs text-ink-soft">
      {titulo}
    </div>
  );
}

/**
 * Editor da nota: um retângulo com divisória — Markdown à esquerda, render à
 * direita, coluna única abaixo de 900px. Grava sozinho 900ms depois da última
 * tecla, e na hora quando o campo perde o foco ou o usuário pede `Ctrl+S` —
 * assim um refresh no meio da digitação não leva o parágrafo embora.
 */
export function Editor({
  noteId,
  initialTitle,
  initialKind,
  initialContent,
  trilha,
}: {
  noteId: string;
  initialTitle: string;
  initialKind: NoteKind;
  initialContent: string;
  trilha: Trilha;
}) {
  // O título é estático nesta tela: o handoff não tem campo de título no
  // editor. Fica no rascunho porque é o que a gravação envia junto do corpo.
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
  // O tipo da nota. `tipo` é o que a tela mostra; `tipoGravado` é o que o
  // servidor confirmou, e é para ele que uma recusa volta. Fica em `ref`
  // porque quem o lê é a resposta de uma gravação que já estava em voo.
  const [tipo, setTipo] = useState<NoteKind>(initialKind);
  const tipoGravado = useRef<NoteKind>(initialKind);
  // Número da última troca pedida. Setas no teclado disparam uma troca por
  // tecla: sem isto, a resposta atrasada da primeira sobrescreveria a última.
  const pedidoDeTipo = useRef(0);
  const [erroDoTipo, setErroDoTipo] = useState<string | null>(null);
  // O que a última gravação disse sobre a sintaxe dos cards. `null` enquanto
  // nada foi gravado nesta sessão.
  const [issues, setIssues] = useState<ParseIssue[] | null>(null);

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
    setIssues(result.issues);
    setStatus({ kind: "saved", at: new Date(result.savedAt) });
  }, [noteId]);

  const trocarTipo = useCallback(
    async (escolhido: NoteKind) => {
      const pedido = (pedidoDeTipo.current += 1);

      setTipo(escolhido);
      setErroDoTipo(null);

      const result = await setNoteKind({ id: noteId, kind: escolhido });

      // Chegou fora de hora: o usuário já escolheu outro tipo depois deste, e
      // quem manda na tela é a escolha mais nova.
      if (pedido !== pedidoDeTipo.current) return;

      if (!result.ok) {
        setTipo(tipoGravado.current);
        setErroDoTipo(result.message);
        return;
      }

      tipoGravado.current = escolhido;
      // A troca é uma edição da nota: o indicador passa a marcar esta hora, e
      // não a do último texto gravado.
      setStatus({ kind: "saved", at: new Date(result.savedAt) });
    },
    [noteId],
  );

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
  // revisão são insubstituíveis; 900ms de texto também conta.
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

  // O indicador diz duas coisas e só duas, como o handoff: "Salvando…" e
  // "Salvo 18:42". Gravação recusada é erro de validação, e vai para o bloco
  // de alerta junto das reclamações do parser — é lá que o erro se diz nesta
  // tela, com filete de 2px e `role="alert"`.
  const indicador =
    visivel.kind === "saving" || visivel.kind === "saved" ? (rotulo ?? "") : "";
  const erro = visivel.kind === "error" ? rotulo : null;
  const reclamacoes = issues ?? [];

  return (
    <div className="grid gap-4" onKeyDown={atalho}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="grid min-w-0 gap-1">
          <nav
            aria-label="Migalhas"
            className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-ink-soft"
          >
            <Link href={trilha.courseHref} className="text-accent hover:underline">
              {trilha.courseTitle}
            </Link>
            <span aria-hidden>·</span>
            <Link href={trilha.lessonHref} className="text-accent hover:underline">
              {trilha.lessonTitle}
            </Link>
          </nav>
          <h1 className="text-lg leading-tight font-medium">{texto.title}</h1>
          <SeletorDeTipo
            value={tipo}
            onChange={(escolhido) => void trocarTipo(escolhido)}
          />
        </div>
        <div className="flex items-baseline gap-4 text-xs">
          {/* Permanente: um `role=status` que nasce junto com a mensagem não é
              lido por leitor de tela nenhum. */}
          <span role="status" className="text-ink-soft">
            {indicador}
          </span>
          <Link href={`/notes/${noteId}`} className="text-accent hover:underline">
            Ver nota
          </Link>
        </div>
      </header>

      {erro === null && erroDoTipo === null && reclamacoes.length === 0 ? null : (
        <div
          role="alert"
          className="grid gap-3 rounded-md border-2 border-ink px-4 py-3 text-sm leading-normal"
        >
          {erro === null ? null : <Aviso titulo={null} corpo={erro} />}
          {erroDoTipo === null ? null : (
            <Aviso titulo="Tipo não alterado" corpo={erroDoTipo} />
          )}
          {/* Sintaxe torta é erro de validação, não silêncio — SPEC §3.3. */}
          {reclamacoes.map((issue, indice) => (
            <Aviso
              // Duas lacunas vazias na mesma linha dão título e linha iguais:
              // a ordem é o que separa as duas reclamações.
              key={`${issue.line}-${issue.title}-${indice}`}
              titulo={`Card não criado: ${issue.title} na linha ${issue.line}`}
              corpo={issue.message}
            />
          ))}
        </div>
      )}

      <div className="grid rounded-md border border-rule rail:grid-cols-2">
        <section
          aria-label="Markdown"
          className="flex min-w-0 flex-col border-b border-rule rail:border-r rail:border-b-0"
        >
          <Painel titulo="Markdown" />
          <textarea
            value={texto.content}
            onChange={(event) =>
              setTexto((anterior) => ({
                ...anterior,
                content: event.target.value,
              }))
            }
            onBlur={agora}
            spellCheck={false}
            aria-label="Texto da nota em Markdown"
            className="min-h-105 w-full flex-1 resize-y bg-paper p-4 font-mono text-sm leading-prose text-ink rail:min-h-180"
          />
        </section>

        <section aria-label="Pré-visualização" className="min-w-0">
          <Painel titulo="Pré-visualização" />
          <div className="max-w-170 overflow-x-auto px-6 pt-5 pb-8">
            {/* A mesma classe da leitura: "renderização idêntica" é medida,
                não só fonte. A marca da lacuna vazia entra depois das tags,
                que não tocam o `{{}}`. */}
            <MathMarkdown
              content={marcarLacunasVazias(linkifyTags(texto.content))}
              vazias
            />
          </div>
        </section>
      </div>
    </div>
  );
}
