# GamConversao - Commit organizado por contexto
# Uso: .\scripts\commit.ps1 "mensagem opcional"
# Se nao passar mensagem, usa mensagens padrao por contexto.

param(
    [string]$Msg = ""
)

function Ok($msg)   { Write-Host " [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host " [!]  $msg" -ForegroundColor Yellow }
function Err($msg)  { Write-Host "[ERR] $msg" -ForegroundColor Red }
function Sep($msg)  { Write-Host "`n---  $msg  ---" -ForegroundColor Cyan }

function Has-Changes($paths) {
    foreach ($p in $paths) {
        $status = git status --porcelain $p 2>&1
        if ($status) { return $true }
    }
    return $false
}

function Do-Commit($label, $defaultMsg, $paths) {
    if (-not (Has-Changes $paths)) {
        Warn "$label - nenhuma alteracao, pulando."
        return
    }
    Sep $label
    git add @($paths)
    $finalMsg = if ($Msg) { "$Msg ($label)" } else { $defaultMsg }
    git commit -m $finalMsg
    if ($LASTEXITCODE -eq 0) {
        Ok "Commit realizado: $finalMsg"
    } else {
        Err "Falha no commit de $label"
    }
}

Write-Host ""
Write-Host "GamConversao - Commit por contexto" -ForegroundColor Magenta
Write-Host ""

# 1. Backend - arquivos base modificados
Do-Commit `
    "Backend core" `
    "refactor: consolida modelos, seguranca e configuracoes" `
    @(
        "backend/app/api",
        "backend/app/core/config.py",
        "backend/app/db",
        "backend/app/main.py",
        "backend/app/models",
        "backend/app/services/cleanup_service.py",
        "backend/app/services/rbac_service.py",
        "backend/app/services/user_service.py",
        "backend/requirements.txt",
        "backend/.env.example",
        "docker-compose.yml"
    )

# 2. Backend - features SaaS novas
Do-Commit `
    "Backend SaaS" `
    "feat: audit log, sessoes ativas, JWT blacklist e lockout" `
    @(
        "backend/alembic/versions",
        "backend/app/core/redis.py",
        "backend/app/schemas/audit.py",
        "backend/app/services/audit_service.py",
        "backend/app/services/jwt_blacklist_service.py",
        "backend/app/services/lockout_service.py",
        "backend/app/services/session_service.py",
        "backend/tests"
    )

# 3. Backend - scripts de producao
Do-Commit `
    "Backend scripts" `
    "chore: scripts de verificacao e checklist de producao" `
    @("backend/scripts")

# 4. Frontend
Do-Commit `
    "Frontend" `
    "feat: frontend completo - auth, CRUD, audit log e sessoes" `
    @("frontend")

# 5. Infra e automacao
Do-Commit `
    "Infra" `
    "chore: pre-commit hook e script de inicializacao Windows" `
    @("scripts", "start.ps1")

# Resumo
Write-Host ""
Write-Host "Historico recente:" -ForegroundColor White
git log --oneline -6
Write-Host ""