# Axiom — Setup

## 1. Install dependencies (if needed)

```bash
npm install
```

## 2. Environment variables

```bash
copy .env.example .env.local
```

Edit `.env.local`:

- `ANAKIN_API_KEY` — from [anakin.io](https://anakin.io) dashboard
- `GEMINI_API_KEY` — free at [Google AI Studio](https://aistudio.google.com/apikey)

## 3. Run

```bash
npm run dev
```

Open http://localhost:3000

## 4. Smoke-test Wire actions

```bash
npm run recon -- --test "Tesla"
```
