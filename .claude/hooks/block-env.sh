#!/usr/bin/env bash
# Barra qualquer chamada de shell que mencione um arquivo .env (inclusive .env.example).
# Regra do usuario: nada de nenhum arquivo .env, em nenhuma hipotese.
# Sem dependencia externa (jq nao existe nesta maquina): le o payload bruto do stdin.
set -u
payload=$(cat)
if printf '%s' "$payload" | grep -qiE '(^|[^A-Za-z0-9_-])\.env([^A-Za-z0-9_]|$)'; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Bloqueado: este projeto proibe qualquer acesso a arquivos .env."}}'
fi
exit 0
