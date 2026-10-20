# CardsCreator Backend

## Auth API

Dieses Backend bietet ein einfach erweiterbares Auth-System mit:

- Registrierung über `/auth/register`
- Login über `/auth/login`
- Abruf des aktuellen Nutzers über `/auth/me`
- Passwort-Hashing mit bcrypt
- JWT-Token basierter Authentifizierung
- SQLAlchemy-Modelle mit SQLite als Standard-Datenbank

## Konfiguration

- `JWT_SECRET`: Geheimnis für JWT-Signing (im Produktivbetrieb unbedingt setzen)
- `DATABASE_URL`: Datenbank-URL (Standard: `sqlite:///./cardscreator.db`)

## Starten

```bash
cd CardsCreator.Backend
source .venv/bin/activate
uvicorn main:app --reload
```
