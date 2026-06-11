# WorkYodha Interactive Organizational Task Board

WorkYodha is a MERN-style operational command board served by the existing Node/Express app. It provides a React-powered organizational task map where active tasks are connected to departments, assignees, reviewers, evidence requirements, deadlines, estimated hours, and labor overhead cost.

## What is included

- **Express/Node API** for task-board data, role-filtered views, and task/evidence updates.
- **MongoDB-ready document shape** for tasks, assignees, reviewers, evidence, and computed cost/risk rollups. The current demo uses an in-memory store so it runs without database credentials; map the same document shape to MongoDB/Mongoose when `MONGODB_URI` is configured in production.
- **React UI** served from `/public` with board, list, filter, metric, role, and detail-panel interactions.
- **Jest API tests** that verify board retrieval, computed labor cost, and task/evidence updates.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000/` for the interactive board.

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
