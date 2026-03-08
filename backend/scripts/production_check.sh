#!/bin/bash
# PASSO 8: Verificações de produção.
# Executar a partir do diretório backend/

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

echo "=== Verificações de produção (backend/) ==="

# 1. .env existe
if [ ! -f .env ]; then
    echo "ERRO: Arquivo .env não encontrado em backend/"
    exit 1
fi
echo "OK: .env existe"

# 2. .env está no .gitignore (raiz do projeto)
if [ -f ../.gitignore ] && grep -q '\.env' ../.gitignore; then
    echo "OK: .env está no .gitignore"
else
    echo "AVISO: .env pode não estar no .gitignore (verifique ../.gitignore)"
fi

# 3. Variáveis obrigatórias
for var in DATABASE_URL JWT_SECRET_KEY ADMIN_EMAIL ADMIN_PASSWORD; do
    if ! grep -q "^${var}=" .env 2>/dev/null; then
        echo "AVISO: ${var} pode não estar definida em .env"
    fi
done
echo "OK: Verificação de variáveis concluída"

# 4. Estrutura app/
if [ ! -d app ]; then
    echo "ERRO: Diretório app/ não encontrado"
    exit 1
fi
echo "OK: Diretório app/ existe"

# 5. ENVIRONMENT em produção
if grep -q "^ENVIRONMENT=production" .env 2>/dev/null; then
    echo "OK: ENVIRONMENT=production"
else
    echo "AVISO: ENVIRONMENT não está definido como production"
fi

echo "=== Verificações concluídas ==="
