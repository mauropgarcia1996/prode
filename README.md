# Prode Mundial 2026

Prode privado para predecir resultados del Mundial 2026.

## Stack

- TanStack Start + Query + Router
- Better Auth (email/password)
- Drizzle + Neon Postgres
- football-data.org API
- shadcn/ui + Tailwind

## Setup

1. Copiá `.env.example` a `.env.local` y completá las variables.
2. Creá una base en [Neon](https://neon.tech) y usá la URL pooled.
3. Migrá la base:

```bash
pnpm db migrate
```

4. Cargá usuarios desde `data/users.json`:

```bash
pnpm db:seed
```

Usuario inicial: `admin@test.com` / `Test123!`

5. Corré la app:

```bash
pnpm dev
```

## Usuarios

Agregá jugadores en `data/users.json` y corré `pnpm db:seed`:

```json
{
  "name": "Juan",
  "email": "juan@test.com",
  "password": "Test123!"
}
```

## Reglas

- Resultado exacto: 3 puntos
- Ganador correcto: 1 punto
- Error: 0 puntos
- Las predicciones se bloquean al kickoff

## Deploy (Vercel)

- Configurá todas las env vars del `.env.example`
- Usá la URL pooled de Neon
- Cron diario opcional en `/api/cron/sync`
