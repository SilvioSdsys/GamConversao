# GamConversao - Verificacoes pre-commit
# Arquivo: scripts/pre-commit.ps1
# Chamado automaticamente pelo hook .git/hooks/pre-commit antes de cada commit.
# Para pular em emergencia: git commit --no-verify

$ROOT     = git rev-parse --show-toplevel
$FAILED   = $false

function Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  [X]  $msg" -ForegroundColor Red;    $script:FAILED = $true }
function Warn($msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Sep($msg)  { Write-Host "`n--- $msg ---" -ForegroundColor Cyan }

Write-Host ""
Write-Host "GamConversao - Verificacoes pre-commit" -ForegroundColor Magenta
Write-Host ""

# Arquivos no stage
$CHANGED = git diff --cached --name-only

$HAS_BACKEND  = ($CHANGED | Where-Object { $_ -match "^backend/" }).Count
$HAS_FRONTEND = ($CHANGED | Where-Object { $_ -match "^frontend/" }).Count

# =============================================================================
# BACKEND
# =============================================================================
if ($HAS_BACKEND -gt 0) {
    Sep "Backend"

    # 1. Queries legadas SQLAlchemy 1.x
    $dbQuery = Get-ChildItem "$ROOT\backend\app" -Recurse -Filter "*.py" |
               Select-String "db\.query\(" -ErrorAction SilentlyContinue
    if ($dbQuery) {
        Fail "db.query() encontrado - use select() do SQLAlchemy 2.x"
        $dbQuery | Select-Object -First 3 | ForEach-Object {
            Write-Host "       $($_.Filename):$($_.LineNumber)" -ForegroundColor DarkGray
        }
    } else {
        Ok "Sem queries legadas (db.query)"
    }

    # 2. create_all() proibido
    $createAll = Get-ChildItem "$ROOT\backend\app" -Recurse -Filter "*.py" |
                 Select-String "create_all" -ErrorAction SilentlyContinue
    if ($createAll) {
        Fail "create_all() encontrado - use apenas Alembic"
    } else {
        Ok "Sem create_all()"
    }

    # 3. Credenciais hardcoded
    $hardcoded = Get-ChildItem "$ROOT\backend\app" -Recurse -Filter "*.py" |
                 Select-String 'SECRET_KEY\s*=\s*["''].{8,}' -ErrorAction SilentlyContinue
    if ($hardcoded) {
        Fail "Possivel SECRET_KEY hardcoded encontrada"
    } else {
        Ok "Sem credenciais hardcoded"
    }

    # 4. .env no stage
    if ($CHANGED | Where-Object { $_ -eq "backend/.env" }) {
        Fail ".env do backend no stage - remova com: git reset HEAD backend/.env"
    } else {
        Ok ".env do backend nao esta no commit"
    }

    # 5. Testes do backend
    $venvPytest = "$ROOT\backend\.venv\Scripts\pytest.exe"
    $testsDir   = "$ROOT\backend\tests"
    if ((Test-Path $venvPytest) -and (Test-Path $testsDir)) {
        Write-Host "  [..] Rodando pytest..." -ForegroundColor DarkGray
        $result = & $venvPytest "$testsDir" -q --tb=no 2>&1 | Select-String "passed|failed|error" | Select-Object -Last 1
        if ($LASTEXITCODE -eq 0) {
            Ok "pytest passou ($result)"
        } else {
            Fail "pytest falhou - corrija os testes antes de commitar"
            Write-Host "       $result" -ForegroundColor DarkGray
        }
    } else {
        Warn "pytest ou pasta tests nao encontrado - pulando testes de backend"
    }
}

# =============================================================================
# FRONTEND
# =============================================================================
if ($HAS_FRONTEND -gt 0) {
    Sep "Frontend"

    # 6. localStorage proibido
    $localStorage = Get-ChildItem "$ROOT\frontend\src" -Recurse -Include "*.ts","*.tsx" |
                    Select-String "localStorage" -ErrorAction SilentlyContinue
    if ($localStorage) {
        Fail "localStorage encontrado - tokens devem ficar apenas em memoria (Zustand)"
        $localStorage | Select-Object -First 3 | ForEach-Object {
            Write-Host "       $($_.Filename):$($_.LineNumber)" -ForegroundColor DarkGray
        }
    } else {
        Ok "Sem localStorage"
    }

    # 7. URL hardcoded
    $hardUrl = Get-ChildItem "$ROOT\frontend\src" -Recurse -Include "*.ts","*.tsx" |
               Select-String "localhost:8000" -ErrorAction SilentlyContinue
    if ($hardUrl) {
        Fail "URL hardcoded (localhost:8000) - use VITE_API_URL do .env"
    } else {
        Ok "Sem URLs hardcoded"
    }

    # 8. .env do frontend no stage
    if ($CHANGED | Where-Object { $_ -eq "frontend/.env" }) {
        Fail ".env do frontend no stage - remova com: git reset HEAD frontend/.env"
    } else {
        Ok ".env do frontend nao esta no commit"
    }

    # 9. TypeScript
    $nodeModules = "$ROOT\frontend\node_modules"
    if (Test-Path $nodeModules) {
        Write-Host "  [..] Verificando TypeScript..." -ForegroundColor DarkGray
        Push-Location "$ROOT\frontend"
        $tscOut = npm run typecheck --silent 2>&1
        Pop-Location
        $tsErrors = $tscOut | Where-Object { $_ -match "error TS" }
        if ($tsErrors) {
            Fail "Erros de TypeScript encontrados - execute: npm run typecheck"
            $tsErrors | Select-Object -First 3 | ForEach-Object {
                Write-Host "       $_" -ForegroundColor DarkGray
            }
        } else {
            Ok "TypeScript sem erros"
        }
    } else {
        Warn "node_modules nao encontrado - pulando TypeScript check"
    }

    # 10. ESLint
    if (Test-Path $nodeModules) {
        Write-Host "  [..] Rodando ESLint..." -ForegroundColor DarkGray
        Push-Location "$ROOT\frontend"
        $lintOut = npm run lint --silent 2>&1
        Pop-Location
        $lintErrors = $lintOut | Where-Object { $_ -match "\s+error\s+" }
        if ($lintErrors) {
            Fail "ESLint encontrou erros - execute: npm run lint"
        } else {
            Ok "ESLint sem erros"
        }
    } else {
        Warn "node_modules nao encontrado - pulando ESLint"
    }
}

# =============================================================================
# Resultado final
# =============================================================================
Write-Host ""
if ($FAILED) {
    Write-Host "  Commit bloqueado - corrija os problemas acima." -ForegroundColor Red
    Write-Host "  Para pular em emergencia: git commit --no-verify" -ForegroundColor Yellow
    Write-Host ""
    exit 1
} else {
    Write-Host "  Todas as verificacoes passaram - commit liberado." -ForegroundColor Green
    Write-Host ""
    exit 0
}