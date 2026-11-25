# Local-first Collaborative Markdown & Diagramming Pad

A browser workspace with Markdown notes on the left and a Yjs-backed flowchart
canvas on the right. Open the same `#/doc/<name>` link in two browsers and edits,
cursors and node changes merge live; keep working with the network off and your
changes persist locally, then converge when you reconnect. The server stores
documents durably in PostgreSQL and keeps manual and automatic version snapshots.

## Requirements

- Node.js **20 or newer**
- PostgreSQL **18** (local install on Windows lives under
  `C:\Program Files\PostgreSQL\18\bin`)
- npm (ships with Node)

The project is an npm-workspaces monorepo with three packages:

| Package | Role |
| --- | --- |
| `@pad/shared` | Document-name rules and Yjs document helpers shared by client and server |
| `@pad/server` | Hocuspocus sync server (WebSocket) + snapshot REST API (Express) |
| `@pad/client` | Vite/React single-page app with an IndexedDB-backed local `Y.Doc` |

## Setup

### 1. Create the databases

Using the PostgreSQL 18 command-line tools (add the `bin` directory above to
your `PATH`, or run the commands from that folder):

```powershell
psql -U postgres -c "CREATE DATABASE pad;"
psql -U postgres -c "CREATE DATABASE pad_test;"
```

`pad` is the application database; `pad_test` is the conventional test database
(the automated test suite itself uses an embedded in-memory PGlite instance, so
it does not need a running PostgreSQL server).

### 2. Install dependencies and configure the environment

From the repository root:

```powershell
npm install
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to your local database, for example:

```dotenv
DATABASE_URL=postgresql://postgres:<your-password>@localhost:5432/pad
TEST_DATABASE_URL=postgresql://postgres:<your-password>@localhost:5432/pad_test
PORT_HOCUSPOCUS=1234
PORT_API=3001
```

> The server reads these values from `process.env` directly — it does not
> auto-load `.env`. Export them in the shell you start the server from (see the
> next step). Vite's dev proxy expects the default ports 1234 and 3001.

### 3. Run the app

Start the server from the repository root (the `vite-node` runner is already
available through the dev dependencies):

```powershell
$env:DATABASE_URL = "postgresql://postgres:<your-password>@localhost:5432/pad"
$env:PORT_HOCUSPOCUS = "1234"
$env:PORT_API = "3001"
npx vite-node packages/server/src/index.ts
```

Then, in a second terminal, start the client:

```powershell
npm run dev -w @pad/client
```

Open <http://localhost:5173>. The URL hash holds the document name (for example
`#/doc/k7Qp_9xLm2`) — that name is the room, the database key and the share link.

Ports: **Vite 5173**, **Hocuspocus 1234**, **REST API 3001**.

Useful commands from the repository root:

```powershell
npm run typecheck --workspaces --if-present
npm test --workspaces --if-present
npm run build --workspaces --if-present
```


