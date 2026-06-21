# Yukti AI Environment Setup

Yukti AI is split into a backend in `server/` and a frontend in `client/`. Both apps read their configuration from local `.env` files, and those files are ignored by Git. The backend explicitly loads `server/.env` from its startup path.

## Required Environment Variables

### Server

- `DATABASE_URL`: PostgreSQL connection string for Prisma.
- `JWT_SECRET`: used to sign and verify authentication tokens.
- `OPENAI_API_KEY` or `GROQ_API_KEY`: required for chat, brainstorm, code generation, writing, and solver features.
- `HF_TOKEN`: Hugging Face access token for image generation (uses direct model inference with `black-forest-labs/FLUX.1-schnell`).

### Client

- `VITE_API_BASE_URL`: backend API root used by the frontend.

## Local Setup

1. Copy the example files:

```bash
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

2. Fill in `server/.env` with at least `DATABASE_URL`, `JWT_SECRET`, and one text-generation provider (`OPENAI_API_KEY` or `GROQ_API_KEY`).

3. For image generation, add your Hugging Face access token in `HF_TOKEN`. Get one at https://huggingface.co/settings/tokens.

4. Install dependencies for each app and run them as usual.

## Notes

- Do not commit `.env` files. They are already ignored by the repository `.gitignore` rules.
- The frontend keeps a localhost fallback for `VITE_API_BASE_URL`, so existing local development behavior remains unchanged when that variable is omitted.
- The backend loads `server/.env` directly, so variables must be placed there rather than only in the repository root.
- Image generation uses direct Hugging Face model inference (not the Inference Providers SDK). Console logs tagged `[HF Image]` show the status of each request.