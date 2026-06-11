# Download and run WorkYodha locally

Use this when you want to share the project as a zip and run it on another machine.

## 1. Create the zip

From this repository:

```bash
npm run package:zip
```

This creates:

```text
release/workyodha-mern-task-board.zip
```

The zip intentionally excludes `node_modules`, build output, Git metadata, and old release zips.

## 2. Unzip on the target machine

```bash
unzip workyodha-mern-task-board.zip
cd ai-seo-backend
```

If your unzip tool creates a folder with a different name, `cd` into that folder instead.

## 3. Install dependencies

```bash
npm run setup:local
```

This installs backend dependencies at the project root and React/Vite dependencies in `client/`.

## 4. Run locally

```bash
npm run dev:local
```

Open:

```text
http://localhost:5173/
```

The React dev server proxies `/api` calls to the Express backend at `http://localhost:3000`.

## 5. Build and serve from Express only

If you want one server instead of the Vite dev server:

```bash
npm run client:build
npm start
```

Open:

```text
http://localhost:3000/
```

## Optional environment variables

Copy `.env.example` to `.env` if you want to customize ports or add production integrations:

```bash
cp .env.example .env
```

The task-board demo does not require MongoDB, Razorpay, or Anthropic credentials to run locally.
