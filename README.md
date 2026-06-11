# WorkYodha Interactive Organizational Task Board

WorkYodha is a MERN-style operational command board served by a Node/Express API with a dedicated React frontend. It provides an organizational task map where active work is connected to departments, assignees, reviewers, evidence requirements, deadlines, estimated hours, and labor overhead cost.

## What is included

- **Express/Node API** for task-board data, role-filtered views, and task/evidence updates.
- **MongoDB-ready document shape** for tasks, assignees, reviewers, evidence, and computed cost/risk rollups. The current demo uses an in-memory store so it runs without database credentials; map the same document shape to MongoDB/Mongoose when `MONGODB_URI` is configured in production.
- **React/Vite frontend** in `client/` with reusable components for metrics, filters, role tabs, connected board nodes, list view, and the task detail panel.
- **Production serving support**: Express serves `client/dist` after `npm run client:build`; if no build exists, it falls back to `public/` for backend-only local demos.
- **Jest API tests** that verify board retrieval, computed labor cost, and task/evidence updates.

## Run locally

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
npm --prefix client install
```

Start the backend API:

```bash
npm start
```

Start the React development server in another terminal:

```bash
npm run client:dev
```

Open the Vite URL shown in the terminal. API requests to `/api` are proxied to `http://localhost:3000`.

## Build and serve the React app from Express

```bash
npm run client:build
npm start
```

Open `http://localhost:3000/` for the compiled React task board.

## API endpoints

- `GET /api/workyodha/board?role=admin|manager|reviewer|employee|executive&personId=emp-101`
- `PATCH /api/workyodha/tasks/:taskId`

The patch endpoint accepts task fields such as `status`, `notes`, `deadline`, `estimatedHours`, partial `assignee` / `reviewer` objects, and evidence updates like:

```json
{
  "status": "In Review",
  "evidence": [{ "id": "ev-002", "status": "Approved" }]
}
```
