# RAG Chat Service

This project is a robust backend service implementing a Retrieval Augmented Generation (RAG) system with chat functionalities, designed for efficient knowledge retrieval and response generation. It integrates various components for data processing, embedding generation, similarity search, and conversational history management.

## Submission / Output Delivery

**Output Delivery:** Push the full source code to a public GitHub repository and send us the repo link within 2-3 days. Include a README.md with setup instructions, API examples, and a brief explanation of design decisions (e.g., why Redis for caching, choice of embedding provider).

## Setup (Docker Compose only)

This project runs via Docker Compose. Local-only instructions have been removed to keep setup simple and consistent.

### Prerequisites

*   Docker Desktop with Docker Compose v2
*   Git (for cloning)

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/rag-chat-service.git # Replace with your repository URL
cd rag-chat-service
```

### 2. Environment Variables

Create a `.env` file in the project root for API keys and toggles.

Copy template to `.env`:

```powershell
# PowerShell (Windows)
Copy-Item env.example .env
```

```bash
# macOS/Linux
cp env.example .env
```

Then edit `.env` and set at minimum:

- `OPENROUTER_API_KEY` (required to enable LLM calls via OpenRouter)
- `COHERE_API_KEY` (optional; enables Cohere embeddings)
- `USE_CHROMADB` (`true` to use ChromaDB retriever; otherwise in-memory)

Note: In Docker Compose, `MONGODB_URI`, `REDIS_URL`, and `CHROMA_URL` are provided by the compose file; any values in `.env` for these are ignored.

### 3. Start the stack

This will start the app, MongoDB, Redis, and ChromaDB:

```bash
docker compose up --build -d
```

Follow logs:

```bash
docker compose logs -f app
```

The app will be available at `http://localhost:3000` and Swagger UI at `/api-docs`.
On first run, the Transformers.js model will download inside the container and be cached.

### 4. Stop and clean up

```bash
docker compose down
# also remove data volumes (Mongo/Chroma):
docker compose down -v
```

### 5. Useful commands

```bash
# restart only the app container
docker compose restart app

# list services
docker compose ps
```

### 6. Data & persistence

- MongoDB data: volume `mongo-data`
- ChromaDB data: volume `chroma-data`

### 7. Switch retrievers

- In-memory (default): set `USE_CHROMADB=false` in `.env`
- ChromaDB: set `USE_CHROMADB=true` in `.env`, then `docker compose up -d` (or restart)

## API Examples

The API documentation is available via Swagger UI, typically at `/api-docs` after the server starts. Here are some key endpoints:

### 1. Send Message to Chatbot

`POST /chat`

```http
POST /chat HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
    "message": "What is the capital of France?",
    "userId": "user123",
    "sessionId": "session456"
}
```

**Response (200 OK):**

```json
{
    "response": "The capital of France is Paris.",
  "cached": false,
    "timestamp": "2023-10-27T10:00:00Z"
}
```

### 2. Get User Chat History

`GET /history/{userId}`

```http
GET /history/user123?page=1&limit=5 HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**

```json
{
    "data": [
        {
            "userId": "user123",
            "message": "Hello",
            "response": "Hi there!",
            "timestamp": "2023-10-27T09:50:00Z",
            "sessionId": "session456"
        },
        // ... more chat entries
    ],
    "pagination": {
        "totalDocs": 15,
        "totalPages": 3,
        "currentPage": 1,
        "nextPage": 2,
        "prevPage": null,
        "limit": 5
    }
}
```

### 3. Check System Health

`GET /health`

```http
GET /health HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**

```json
{
    "uptime": 12345.67,
    "timestamp": 1678886400000,
    "status": "ok",
    "checks": {
        "mongodb": "connected",
        "redis": "connected"
    }
}
```

## Design Decisions

Here are some key design choices made in this project:

### Redis for Caching

Redis was chosen for caching due to its exceptional performance as an in-memory data store. Its ability to handle various data structures and high throughput makes it ideal for rapidly retrieving frequently asked questions and pre-computed embedding lookups. This significantly reduces the load on the Language Model (LLM) and embedding generation services, leading to lower latency and better overall system responsiveness.

### Choice of Embedding Provider

The `Xenova/all-MiniLM-L6-v2` Hugging Face model is utilized for generating embeddings. This model strikes a great balance between efficiency and accuracy, making it suitable for deployment within a containerized environment where resource consumption is a consideration. It provides robust semantic representations for effective knowledge retrieval. The inclusion of `cohere-ai` as a dependency suggests that there's flexibility to integrate more powerful, cloud-based embedding solutions if the need for higher accuracy or different model characteristics arises in the future.

### Approach to Dependency Injection (DI)

For this project, a straightforward, manual approach to dependency injection was implemented (as seen in `src/container.ts`). Instead of adopting a heavy-weight external DI framework, dependencies are explicitly created and passed where needed. This decision was made to keep the project's architecture lean and focused on its core Retrieval Augmented Generation (RAG) and chat functionalities. It minimizes the overhead and learning curve typically associated with complex DI libraries, while still achieving a good separation of concerns and maintaining testability for the current scope of the project. The aim was to deliver a functional and understandable system without introducing unnecessary architectural complexity.

## Architecture 

- Prompt building was extracted to `src/utils/prompt.ts` to keep LLM-specific prompt engineering separate from transport concerns.
- External LLM calls live in `src/external/llmExternal.ts`, isolating third‑party API integration (OpenRouter) from domain logic.
- `ChatService` and `HistoryService` encapsulate business logic; they are injected into controllers (`ChatController`, `HistoryController`) via the container.
- Retrieval is pluggable: in‑memory retriever for small data; ChromaDB retriever for scalable vector search (HNSW). Toggle with `USE_CHROMADB`.
- Custom error classes in `src/utils/errors.ts` plus centralized middleware provide consistent error responses.

## Docker Image Choice (Alpine vs Debian Slim)

We intentionally use `node:18-slim` (Debian‑based) instead of Alpine for the application image. In practice, Alpine (musl libc) has compatibility issues with `@xenova/transformers` and its transitive native dependencies, which expect glibc. This leads to build/runtime failures or complex workarounds. Using Debian Slim avoids these pitfalls and works well with Transformers.js downloading on first run.

Note: We still use `redis:7-alpine` for the Redis container, which is fine because Redis itself does not require the glibc toolchain expected by Xenova.

## Security & Observability Choices

- Security headers via Helmet (applied after mounting Swagger UI to avoid CSP conflicts).
- Simple rate limiting on the API with `express-rate-limit` to protect from abuse.
- Structured logging via Winston; health checks expose minimal status for quick diagnostics.

## Why Redis & Provider Choices (Short Recap)

- **Redis**: in‑memory speed, straightforward TTLs, great fit for caching LLM outputs and embedding results.
- **Embeddings**: default to on‑device Xenova model for determinism and zero external latency; optionally switch to Cohere if higher recall or hosted inference is needed.

## Testing Configurations (In‑Memory vs Chroma, HuggingFace vs Cohere)

### A) Retrieval Layer: In‑Memory vs ChromaDB

- In‑Memory (default):
  1. Ensure `.env` has `USE_CHROMADB=false` (or unset).
  2. Start the app and call `POST /chat`.
  3. Logs will show: `Using in-memory retrieval (O(n) search)` and knowledge loaded in memory.
  4. This is best for small datasets and fast iteration.

- ChromaDB:
  1. Set `USE_CHROMADB=true` and `CHROMA_URL` (e.g., `http://localhost:8000`).
  2. Start ChromaDB (via docker-compose or standalone).
  3. Start the app and call `POST /chat`.
  4. Logs will show: `Using ChromaDB with HNSW indexing (FAISS-like)` and stats after loading.
  5. This is best for larger datasets and scalable vector search.

### B) Embedding Provider: HuggingFace (Xenova) vs Cohere

- HuggingFace (default):
  1. Do not set `COHERE_API_KEY` in `.env`.
  2. Start the app; logs should include `Using HuggingFace on-device embeddings`.
  3. `POST /chat` will trigger local feature-extraction via Xenova.

- Cohere:
  1. Set `COHERE_API_KEY=your_key` in `.env`.
  2. Start the app; logs should include `Using Cohere for embeddings` / `CohereEmbedder initialized`.
  3. `POST /chat` will trigger remote embeddings via Cohere; caching still applies.

Tips:
- For repeat questions, verify cache hits (logs: `Cache hit` or faster responses).
- Toggle providers/retrievers by editing `.env` and restarting the app.

## Defaults & Rationale

- Retrieval default: **In‑Memory** (simplicity, zero external service).
- Embedding default: **HuggingFace Xenova** (no external API, deterministic, good perf on `node:18-slim`).
- Docker base: **Debian Slim** (avoids musl/glibc incompatibilities observed with `@xenova/transformers` on Alpine).

## Sample .env (All Settable Variables)

```dotenv
# Runtime & App
NODE_ENV=development
APP_URL=http://localhost:3000
PORT=3000

# LLM / Providers
OPENROUTER_API_KEY= # required for LLM via OpenRouter (leave empty to disable outbound calls)
COHERE_API_KEY=     # optional; if set, Cohere is used for embeddings; otherwise Xenova (on-device)
HUGGINGFACE_MODEL=Xenova/all-MiniLM-L6-v2

# Datastores
MONGODB_URI=mongodb://localhost:27017/rag
REDIS_URL=redis://localhost:6379

# Retrieval (ChromaDB)
USE_CHROMADB=false
CHROMA_URL=http://localhost:8000
CHROMA_HNSW_EF=200
CHROMA_HNSW_M=16

# Note: cache TTL is set in code (3600s) for now; promote to env if needed.
```

## Faster Docker Builds

- We avoid double `npm ci` by installing once in the builder, pruning devDependencies, and copying `node_modules` to the final image.
- Using Docker BuildKit cache for npm installs (`--mount=type=cache,target=/root/.npm`) significantly speeds up rebuilds.
- Do not mount an empty volume over `/app/.cache/huggingface` or you will mask the image cache and force a second download. If you need persistence across rebuilds, bind‑mount a host folder (pre‑populated after first run).

## Notes

Due to time constraints, only the Hugging Face (Transformers.js) path was finalized and tested. Other options (e.g., Cohere embeddings or fully offline model provisioning) were not exhaustively tested within the available time.

## Limitations & Future Work

- Add streaming responses from LLM for improved UX.
- Expand test coverage around retrieval ranking and prompt construction.
- Add per‑tenant configuration (models, cache TTLs, retriever choice).
