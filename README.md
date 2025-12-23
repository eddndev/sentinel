# Sentinel

**Sentinel** is a high-performance bot orchestration platform designed for robust session management and message deduplication across WhatsApp and Telegram. It leverages modern, high-throughput technologies to ensure reliability and speed.

## Architecture

Sentinel is built on a high-performance stack focusing on I/O speed and concurrency:

*   **Runtime:** [Bun](https://bun.sh) (v1.0+) - Chosen for superior I/O performance and startup time.
*   **Web Framework:** [Elysia](https://elysiajs.com) - A high-performance, type-safe web framework for Bun.
*   **Message Queue:** [BullMQ](https://bullmq.io) - Robust message processing and background jobs implementation.
*   **Database:** PostgreSQL - Primary persistent storage for session data and logs.
*   **Cache/State:** Redis - Used for BullMQ job management and idempotency caching.
*   **Frontend:** Vite + TypeScript (Vanilla) + Tailwind CSS v4.

## Prerequisites

*   [Docker](https://www.docker.com/) & Docker Compose
*   [Bun](https://bun.sh/) (for local development)

## Getting Started

### Quick Start (Docker)

To spin up the entire environment (Backend, Frontend, Postgres, Redis):

```bash
docker compose up -d
```

The services will be available at:
*   **Dashboard:** `http://localhost:3000` (or configured port)
*   **API:** `http://localhost:8080`

### Local Development

**Backend:**
```bash
cd backend
bun install
bun dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. See the `LICENSE` file for details.
