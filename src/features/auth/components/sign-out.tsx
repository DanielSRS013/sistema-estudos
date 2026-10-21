import { CLASSE_ITEM_RODAPE } from "@/shared/rail-item";

import { sair } from "../actions";

/** Sair, no pé do rail. Formulário: a sessão é um cookie do servidor. */
export function SignOut() {
  return (
    <form action={sair}>
      <button type="submit" className={CLASSE_ITEM_RODAPE}>
        Sair
      </button>
    </form>
  );
}
