# GamConversao Backend (FastAPI + PostgreSQL + RBAC)

Backend funcional com autenticação JWT, refresh token persistido em banco, hash de senha com bcrypt e RBAC completo (Users, Roles, Permissions).

## Stack
- FastAPI
- PostgreSQL
- SQLAlchemy 2
- Alembic
- JWT (access token de 15 min)
- Refresh token persistido e rotacionado
- Passlib (bcrypt)

## Estrutura
```text
/backend
  /app
    main.py
    /core
    /db
    /models
    /schemas
    /services
    /api/v1
  /alembic
  requirements.txt
  Dockerfile
docker-compose.yml
```

## Como rodar com Docker (recomendado)
1. Na raiz do projeto:
   ```bash
   docker compose up --build
   ```
2. API disponível em `http://localhost:8000`
3. Docs em `http://localhost:8000/docs`

> O container do backend executa `alembic upgrade head` no startup.

## Como rodar local (sem Docker)
### Pré-requisitos
- Python 3.12+
- PostgreSQL rodando localmente

### 1) Instalar dependências
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Configurar ambiente
Exemplo de variáveis:
```bash
export DATABASE_URL='postgresql+psycopg2://postgres:postgres@localhost:5432/gam_conversao'
export JWT_SECRET_KEY='super-secret-key'
export ADMIN_EMAIL='admin@gamconversao.com'
export ADMIN_PASSWORD='Admin123!'
```

### 3) Rodar migrations
```bash
alembic upgrade head
```

### 4) Subir API
```bash
uvicorn app.main:app --reload
```

## Usuário inicial
No startup, a aplicação garante:
- permissões padrão:
  - `users:create`
  - `users:read`
  - `users:update`
  - `users:delete`
- role `admin` com todas as permissões
- usuário admin com email/senha vindos das variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD`

## Fluxo de autenticação
1. `POST /api/v1/auth/login` com email e senha
2. Recebe:
   - `access_token` (expira em 15 min)
   - `refresh_token` (persistido no banco)
3. `POST /api/v1/auth/refresh` rotaciona refresh token
4. `POST /api/v1/auth/logout` revoga refresh token

## RBAC e proteção por permissão
As rotas de usuários são protegidas por middleware de permissão, com decorator de permissões:
- `GET /api/v1/users` -> `users:read`
- `GET /api/v1/users/{id}` -> `users:read`
- `POST /api/v1/users` -> `users:create`
- `PUT /api/v1/users/{id}` -> `users:update`
- `DELETE /api/v1/users/{id}` -> `users:delete`

## Exemplo rápido
### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@gamconversao.com","password":"Admin123!"}'
```

### Listar usuários
```bash
curl http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
