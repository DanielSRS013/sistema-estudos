import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full flex-1 flex-col justify-center gap-10 px-6 py-16 sm:px-10">
      <header className="measure space-y-3">
        <p className="font-mono text-xs tracking-wide text-ink-soft">
          fatia 0 — fundação
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Olá.</h1>
        <p className="font-serif text-base leading-[1.65] text-ink">
          O terreno está pronto: Next com App Router, Drizzle contra o Neon,
          tokens de cor e a superfamília IBM Plex. A casca navegável já está de
          pé em{" "}
          <Link href="/courses" className="text-accent underline">
            cursos
          </Link>
          . O painel desta tela chega na fatia 4.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-ink-soft">
          Paradas do viridis
        </h2>
        <ul className="flex flex-wrap gap-3 font-sans text-sm">
          <li className="rounded-md bg-again px-4 py-2 text-paper">Again</li>
          <li className="rounded-md bg-hard px-4 py-2 text-paper">Hard</li>
          <li className="rounded-md bg-good px-4 py-2 text-ink">Good</li>
          <li className="rounded-md bg-easy px-4 py-2 text-ink">Easy</li>
        </ul>
      </section>

      <hr className="border-rule" />

      <p className="font-mono text-xs text-ink-soft">
        parse(markdown) → cards · schedule(card, rating, now) → due
      </p>
    </main>
  );
}
