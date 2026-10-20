import { sair } from "../actions";

/** Sair, no pé do rail. Formulário: a sessão é um cookie do servidor. */
export function SignOut() {
  return (
    <form action={sair}>
      <button
        type="submit"
        className="rounded-sm px-1 font-mono text-xs tracking-wide text-ink-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-accent/30 focus-visible:outline-none"
      >
        sair
      </button>
    </form>
  );
}
