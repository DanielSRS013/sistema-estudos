// Porta única: toda rota passa por aqui e, sem sessão, volta para `/entrar`.
// A autorização está no callback `authorized` de `auth.ts`.
//
// `proxy` é a convenção do Next 16; o antigo `middleware` está depreciado.

export { auth as proxy } from "@/features/auth/auth";

export const config = {
  /**
   * Fora da trava: as rotas do próprio Auth.js, a página de entrada e os
   * estáticos. Incluir `/entrar` aqui criaria laço de redirecionamento.
   */
  matcher: [
    "/((?!api/auth|entrar|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
