# Sistema de Autenticação (inspirado no GAM)

Projeto inicial com FastAPI + PostgreSQL + SQLAlchemy + JWT + RBAC.

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
/docker-compose.yml
```

## Funcionalidades implementadas

- Login com `username/password`
- `access_token` JWT com expiração de 15 minutos
- `refresh_token` persistido no banco
- Rotação de refresh token no endpoint de refresh
- Logout com revogação de refresh token
- Hash de senha com bcrypt
- RBAC com entidades `User`, `Role`, `Permission`
- Middleware de proteção por permissão para rotas específicas

## Endpoints

Base URL: `http://localhost:8000/api/v1`

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /users/me`

### Usuário inicial

No startup, é criado um usuário padrão:

- username: `admin`
- senha: `admin123`

## Como rodar

### Com Docker Compose

```bash
docker compose up --build
```

A API sobe em `http://localhost:8000`.

### Teste rápido com cURL

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Usar access token no /users/me
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Migrações

As migrações são executadas automaticamente no start do container API com:

```bash
alembic upgrade head
```
