# Teacher Assist (Offline-first, PWA, Mobile-first)

Monorepo pronto para **GitHub → Vercel** (regra inviolável).
- **Frontend:** Flutter Web (PWA instalável, offline-first) em `app_flutter/`
- **API:** FastAPI serverless na Vercel em `api/` (rotas `/api/*`)
- **Offline DB:** Hive (funciona no **mobile e no web** via IndexedDB)
- **Sync:** push/pull via outbox (resiliente)

## Rodar localmente (App)
Pré-requisito: Flutter instalado (stable).
```bash
cd app_flutter
flutter pub get
flutter run
```

## Rodar localmente (Web)
```bash
cd app_flutter
flutter pub get
flutter run -d chrome
```

## Deploy na Vercel (INVIOLÁVEL)
1. Suba este repo no GitHub.
2. Na Vercel: **New Project → Import Git Repository**.
3. Em **Environment Variables** na Vercel, configure:
   - `DATABASE_URL` = Postgres online (Neon/Supabase/Render etc).
4. Deploy.

### Endpoints
- `GET /api/health`
- `POST /api/sync/push` (Bearer `dev-token`)
- `GET /api/sync/pull?since=1970-01-01T00:00:00Z` (Bearer `dev-token`)

## Observação importante (MVP)
O token `dev-token` é apenas para testes. Em produção, implemente login real.
