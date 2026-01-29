# Fullstack React + Express Counter Example

This project has been restructured into a frontend (React + Vite + TypeScript) and backend (Node + Express) setup.

The frontend is a counter app using [@x-skills-for-ai/react](https://www.npmjs.com/package/@x-skills-for-ai/react).

The backend provides a simple REST API for counter operations (in-memory state).

## Project Structure

\`\`\`
.
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.mts
│   ├── index.html
│   └── src/
│       ├── index.tsx
│       ├── App.tsx
│       ├── Counter.tsx
│       └── Counter-Original.tsx
├── backend/
│   ├── package.json
│   └── server.js
├── README.md
└── deploy/ (build artifacts)
\`\`\`

## Quick Start

### Backend

\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

Server runs on \`http://localhost:3001\`

Test API:

\`\`\`bash
curl http://localhost:3001/api/count
curl -X POST http://localhost:3001/api/count/increment
\`\`\`

### Frontend

In a new terminal:

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

App runs on \`http://localhost:5173\`

API calls to \`/api/*\` are proxied to backend.

## Backend API

- \`GET /api/count\` - Get current count
- \`POST /api/count/increment\` - Increment count
- \`POST /api/count/decrement\` - Decrement count
- \`POST /api/count/reset\` - Reset count to 0

## Frontend Features

- React counter with local state and x-skills integration (\`increment\`, \`decrement\`).
- Vite proxy setup for seamless API development.

To integrate API with frontend state, update \`frontend/src/Counter.tsx\` to use \`fetch\`.

## Deployment

- **Frontend**: \`cd frontend && npm run build && npm run deploy\` (gh-pages, note base path in vite.config).
- **Backend**: Deploy to Heroku, Render, Vercel (serverless), etc.
