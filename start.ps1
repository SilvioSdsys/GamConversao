# GamConversao - Script de Inicializacao para Windows
# Uso: .\start.ps1 [all | backend | frontend | stop | status]
# Requisitos: Python 3.12, Node.js, PostgreSQL local, Redis local
#
# Primeira execucao (PowerShell como Administrador):
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

param(
    [string]$Cmd = "all"
)

# --- Configuracoes -----------------------------------------------------------
$ROOT          = $PSScriptRoot
$BE_DIR        = Join-Path $ROOT "backend"
$FE_DIR        = Join-Path $ROOT "frontend"
$BACKEND_PORT  = 8000
$FRONTEND_PORT = 5173
$HEALTH_URL    = "http://localhost:$BACKEND_PORT/health"
$PID_DIR       = "$env:TEMP\gamconversao"
$BACKEND_LOG   = "$PID_DIR\backend.log"
$FRONTEND_LOG  = "$PID_DIR\frontend.log"
$BACKEND_PID   = "$PID_DIR\backend.pid"
$FRONTEND_PID  = "$PID_DIR\frontend.pid"

# --- Helpers de output -------------------------------------------------------
function Log($msg)  { Write-Host "[GAM] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host " [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host " [!]  $msg" -ForegroundColor Yellow }
function Err($msg)  { Write-Host "[ERR] $msg" -ForegroundColor Red }
function Sep($msg)  { Write-Host "`n---  $msg  ---`n" -ForegroundColor Magenta }

# --- Banner ------------------------------------------------------------------
function Show-Banner {
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "       GamConversao  v2.0" -ForegroundColor Cyan
    Write-Host "   FastAPI + React + PostgreSQL + Redis" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
}

# --- Verificar dependencias --------------------------------------------------
function Check-Deps {
    $missing = $false
    foreach ($tool in @("python", "node", "npm")) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            Err "Nao encontrado: $tool"
            $missing = $true
        }
    }
    if ($missing) {
        Write-Host ""
        Err "Instale as dependencias ausentes e tente novamente."
        exit 1
    }
    Ok "Python, Node e npm encontrados."
}

# --- Verificar PostgreSQL local ----------------------------------------------
# PostgreSQL e iniciado automaticamente pelo Windows como servico.
# O script apenas confirma que a porta esta acessivel antes de prosseguir.
function Check-Postgres {
    Sep "Verificando PostgreSQL"
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $conn.Connect("127.0.0.1", 5432)
        $conn.Close()
        Ok "PostgreSQL respondendo na porta 5432."
    } catch {
        Err "PostgreSQL nao respondeu na porta 5432."
        Err "O servico deveria iniciar automaticamente - verifique o Windows Services."
        exit 1
    }
}

# --- Verificar Redis local ---------------------------------------------------
function Check-Redis {
    Sep "Verificando Redis"

    $redisRunning = $false
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $conn.Connect("127.0.0.1", 6379)
        $conn.Close()
        $redisRunning = $true
    } catch { }

    if ($redisRunning) {
        Ok "Redis respondendo na porta 6379."
        return
    }

    # Tenta como servico Windows
    $redisSvc = Get-Service -Name "Redis*" -ErrorAction SilentlyContinue |
                Select-Object -First 1
    if ($redisSvc) {
        Warn "Redis parado. Iniciando servico '$($redisSvc.Name)'..."
        Start-Service $redisSvc.Name
        Start-Sleep -Seconds 2
        Ok "Redis iniciado."
        return
    }

    # Tenta redis-server.exe diretamente
    $redisCmd = Get-Command "redis-server" -ErrorAction SilentlyContinue
    $candidates = @(
        $(if ($redisCmd) { $redisCmd.Source } else { $null }),
        "$ROOT\redis\redis-server.exe",
        "C:\Redis\redis-server.exe",
        "C:\Program Files\Redis\redis-server.exe"
    ) | Where-Object { $_ -and (Test-Path $_) }

    if ($candidates.Count -gt 0) {
        $redisExe = $candidates[0]
        Log "Iniciando $redisExe em background..."
        if (-not (Test-Path $PID_DIR)) {
            New-Item -ItemType Directory -Path $PID_DIR | Out-Null
        }
        $redisProc = Start-Process -FilePath $redisExe `
            -RedirectStandardOutput "$PID_DIR\redis.log" `
            -PassThru -WindowStyle Hidden
        $redisProc.Id | Out-File "$PID_DIR\redis.pid"
        Start-Sleep -Seconds 2
        Ok "redis-server iniciado (PID $($redisProc.Id))."
        return
    }

    Warn "Redis nao encontrado - o sistema continuara sem blacklist JWT."
    Warn "Para instalar: https://github.com/tporadowski/redis/releases"
    Warn "Ou: choco install redis-64"
}

# --- Backend -----------------------------------------------------------------
function Start-Backend {
    Sep "Backend - FastAPI"

    # Verificar .env
    $envFile = "$BE_DIR\.env"
    if (-not (Test-Path $envFile)) {
        $envExample = "$BE_DIR\.env.example"
        if (Test-Path $envExample) {
            Warn ".env nao encontrado. Copiando de .env.example..."
            Copy-Item $envExample $envFile
            Warn "ATENCAO: Edite o arquivo backend\.env com suas credenciais!"
        } else {
            Err "Arquivo backend\.env nao encontrado. Crie-o manualmente."
            exit 1
        }
    }

    # Criar venv se nao existir
    $venvPython = "$BE_DIR\.venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        Log "Criando ambiente virtual Python..."
        python -m venv "$BE_DIR\.venv"
        if ($LASTEXITCODE -ne 0) {
            Err "Falha ao criar ambiente virtual."
            exit 1
        }
        Ok "Ambiente virtual criado."
    }

    # Instalar dependencias se necessario
    $depsFlag = "$BE_DIR\.venv\.deps_ok"
    $reqFile  = "$BE_DIR\requirements.txt"
    $needsInstall = (-not (Test-Path $depsFlag))
    if ((-not $needsInstall) -and (Test-Path $reqFile)) {
        $needsInstall = (Get-Item $reqFile).LastWriteTime -gt (Get-Item $depsFlag).LastWriteTime
    }
    if ($needsInstall) {
        Log "Instalando dependencias Python (pode demorar na primeira vez)..."
        & "$BE_DIR\.venv\Scripts\pip.exe" install -r $reqFile -q
        if ($LASTEXITCODE -ne 0) {
            Err "Falha ao instalar dependencias Python."
            exit 1
        }
        New-Item -ItemType File -Path $depsFlag -Force | Out-Null
        Ok "Dependencias instaladas."
    } else {
        Ok "Dependencias ja instaladas."
    }

    # Rodar migrations
    Log "Aplicando migrations (alembic upgrade head)..."
    Push-Location $BE_DIR
    & "$BE_DIR\.venv\Scripts\alembic.exe" upgrade head
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -ne 0) {
        Err "Falha ao aplicar migrations."
        Err "Verifique DATABASE_URL em backend\.env e se o banco existe."
        exit 1
    }
    Ok "Migrations aplicadas."

    # Criar diretorio de logs
    if (-not (Test-Path $PID_DIR)) {
        New-Item -ItemType Directory -Path $PID_DIR | Out-Null
    }

    # Iniciar uvicorn em background
    Log "Iniciando uvicorn na porta $BACKEND_PORT..."
    $beProc = Start-Process `
        -FilePath "$BE_DIR\.venv\Scripts\uvicorn.exe" `
        -ArgumentList "app.main:app", "--host", "0.0.0.0", "--port", "$BACKEND_PORT", "--reload" `
        -WorkingDirectory $BE_DIR `
        -RedirectStandardOutput $BACKEND_LOG `
        -RedirectStandardError "$PID_DIR\backend_err.log" `
        -PassThru -WindowStyle Hidden
    $beProc.Id | Out-File $BACKEND_PID

    # Aguardar API responder
    Log "Aguardando API responder..."
    $attempts = 0
    $apiOk = $false
    while ($attempts -lt 30) {
        Start-Sleep -Seconds 1
        $attempts++
        try {
            Invoke-WebRequest -Uri $HEALTH_URL -UseBasicParsing -ErrorAction Stop | Out-Null
            $apiOk = $true
            break
        } catch { }
    }

    if (-not $apiOk) {
        Err "Backend nao respondeu apos 30s."
        Err "Veja o log em: $BACKEND_LOG"
        exit 1
    }

    Ok "Backend rodando em http://localhost:$BACKEND_PORT"
    Ok "API Docs: http://localhost:$BACKEND_PORT/docs"
}

# --- Frontend ----------------------------------------------------------------
function Start-Frontend {
    Sep "Frontend - React + Vite"

    # Criar .env se nao existir
    $envFile = "$FE_DIR\.env"
    if (-not (Test-Path $envFile)) {
        Warn ".env do frontend nao encontrado. Criando com valores padrao..."
        Set-Content -Path $envFile -Encoding UTF8 -Value @"
VITE_API_URL=http://localhost:$BACKEND_PORT/api/v1
VITE_APP_NAME=GamConversao
VITE_ENV=development
"@
        Ok ".env do frontend criado."
    }

    # Instalar node_modules se necessario
    if (-not (Test-Path "$FE_DIR\node_modules")) {
        Log "Instalando dependencias npm (pode demorar na primeira vez)..."
        Push-Location $FE_DIR
        npm install
        Pop-Location
        if ($LASTEXITCODE -ne 0) {
            Err "Falha ao instalar dependencias npm."
            exit 1
        }
        Ok "Dependencias npm instaladas."
    } else {
        Ok "node_modules ja existe."
    }

    # Criar diretorio de logs
    if (-not (Test-Path $PID_DIR)) {
        New-Item -ItemType Directory -Path $PID_DIR | Out-Null
    }

    # Iniciar Vite via cmd (compatibilidade maxima com Windows)
    Log "Iniciando Vite na porta $FRONTEND_PORT..."
    $feProc = Start-Process `
        -FilePath "cmd.exe" `
        -ArgumentList "/c npm run dev -- --port $FRONTEND_PORT" `
        -WorkingDirectory $FE_DIR `
        -RedirectStandardOutput $FRONTEND_LOG `
        -RedirectStandardError "$PID_DIR\frontend_err.log" `
        -PassThru -WindowStyle Hidden
    $feProc.Id | Out-File $FRONTEND_PID

    # Aguardar Vite responder
    Log "Aguardando Vite responder..."
    $attempts = 0
    $feOk = $false
    while ($attempts -lt 30) {
        Start-Sleep -Seconds 1
        $attempts++
        try {
            Invoke-WebRequest -Uri "http://localhost:$FRONTEND_PORT" -UseBasicParsing -ErrorAction Stop | Out-Null
            $feOk = $true
            break
        } catch { }
    }

    if (-not $feOk) {
        Err "Frontend nao respondeu apos 30s."
        Err "Veja o log em: $FRONTEND_LOG"
        exit 1
    }

    Ok "Frontend rodando em http://localhost:$FRONTEND_PORT"
}

# --- Status ------------------------------------------------------------------
function Show-Status {
    Sep "Status dos Servicos"

    Write-Host "PostgreSQL:" -ForegroundColor White
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $conn.Connect("127.0.0.1", 5432); $conn.Close()
        Ok "  porta 5432 respondendo"
    } catch { Warn "  porta 5432 sem resposta" }

    Write-Host "Redis:" -ForegroundColor White
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $conn.Connect("127.0.0.1", 6379); $conn.Close()
        Ok "  porta 6379 respondendo"
    } catch { Warn "  porta 6379 sem resposta" }

    Write-Host "Backend:" -ForegroundColor White
    try {
        $h = Invoke-RestMethod -Uri $HEALTH_URL -ErrorAction Stop
        Ok "  http://localhost:$BACKEND_PORT"
        Write-Host "  $($h | ConvertTo-Json -Compress)" -ForegroundColor DarkGray
    } catch { Warn "  nao responde em http://localhost:$BACKEND_PORT" }

    Write-Host "Frontend:" -ForegroundColor White
    try {
        Invoke-WebRequest -Uri "http://localhost:$FRONTEND_PORT" -UseBasicParsing -ErrorAction Stop | Out-Null
        Ok "  http://localhost:$FRONTEND_PORT"
    } catch { Warn "  nao responde em http://localhost:$FRONTEND_PORT" }

    Write-Host ""
}

# --- Stop --------------------------------------------------------------------
function Stop-All {
    Sep "Encerrando Servicos"

    foreach ($pidFile in @($FRONTEND_PID, $BACKEND_PID)) {
        if (Test-Path $pidFile) {
            $id    = Get-Content $pidFile
            $label = if ($pidFile -match "frontend") { "Frontend" } else { "Backend" }
            try {
                Get-CimInstance Win32_Process |
                    Where-Object { $_.ParentProcessId -eq $id } |
                    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
                Stop-Process -Id $id -Force -ErrorAction Stop
                Ok "$label encerrado (PID $id)."
            } catch {
                Warn "$label nao estava ativo (PID $id)."
            }
            Remove-Item $pidFile -Force
        }
    }

    $redisPid = "$PID_DIR\redis.pid"
    if (Test-Path $redisPid) {
        $id = Get-Content $redisPid
        try { Stop-Process -Id $id -Force; Ok "Redis encerrado (PID $id)." } catch { }
        Remove-Item $redisPid -Force
    }

    Ok "Servicos encerrados."
}

# --- Resumo ------------------------------------------------------------------
function Show-Summary {
    Write-Host ""
    Write-Host "  Ambiente pronto!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Frontend : http://localhost:$FRONTEND_PORT" -ForegroundColor White
    Write-Host "  Backend  : http://localhost:$BACKEND_PORT"  -ForegroundColor White
    Write-Host "  API Docs : http://localhost:$BACKEND_PORT/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "  Logs: $PID_DIR\" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Para encerrar: .\start.ps1 stop" -ForegroundColor Yellow
    Write-Host ""
}

# --- Main --------------------------------------------------------------------
Show-Banner
Check-Deps

switch ($Cmd.ToLower()) {
    "all" {
        Check-Postgres
        Check-Redis
        Start-Backend
        Start-Frontend
        Show-Summary
    }
    "backend" {
        Check-Postgres
        Check-Redis
        Start-Backend
        Show-Status
    }
    "frontend" {
        Start-Frontend
        Show-Status
    }
    "stop"   { Stop-All }
    "status" { Show-Status }
    default {
        Write-Host "Uso: .\start.ps1 [all | backend | frontend | stop | status]"
        exit 1
    }
}