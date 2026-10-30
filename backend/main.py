from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from database import engine, Base, SQLALCHEMY_DATABASE_URL
import models  # ensure tables are registered
from routers import auth, pages, blocks, tasks, tags, dashboard, comments, notifications, uploads, activity, collaboration, inbox
from scheduler import send_due_soon_notifications, start_scheduler
from sqlalchemy.engine import make_url
import os
import logging
import time
import traceback

# ── Structured logging setup ──────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("notely")

# Quieten noisy third-party loggers
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def ensure_runtime_schema():
    """Apply lightweight additive schema fixes for environments without migrations."""
    try:
        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            return

        existing_columns = {column["name"] for column in inspector.get_columns("users")}
        statements = []

        if "is_email_verified" not in existing_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT FALSE"
            )
        if "email_verification_token" not in existing_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN email_verification_token VARCHAR"
            )
        if "email_verification_sent_at" not in existing_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN email_verification_sent_at TIMESTAMP"
            )
        if "email_verified_at" not in existing_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP"
            )
        if "password_reset_token" not in existing_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN password_reset_token VARCHAR"
            )
        if "password_reset_expires_at" not in existing_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP"
            )

        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS "
                    "ix_users_email_verification_token ON users (email_verification_token)"
                )
            )
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS "
                    "ix_users_password_reset_token ON users (password_reset_token)"
                )
            )
    except Exception:
        log.warning("Could not apply runtime schema updates", exc_info=True)


# Create all tables after the engine is fully resolved.
Base.metadata.create_all(bind=engine)
ensure_runtime_schema()

_scheduler_stop = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_stop
    log.info("  Notely API starting up")
    log.info(" Database engine ready: %s", make_url(SQLALCHEMY_DATABASE_URL).render_as_string(hide_password=True))
    send_due_soon_notifications()
    _scheduler_stop = start_scheduler(interval_seconds=60)
    yield
    log.info(" Notely API shutting down")
    if _scheduler_stop:
        _scheduler_stop.set()


app = FastAPI(title="Notely API", version="2.0.0", lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────
_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",   # fallback Vite port
    "http://127.0.0.1:5174",
]
# Comma-separated extra origins, e.g. CORS_ORIGINS=https://notely.vercel.app
_EXTRA_ORIGINS = [o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_LOCAL_ORIGINS + _EXTRA_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response logging middleware ─────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    log.info(f"→  {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        log.log(level, f"←  {request.method} {request.url.path} [{response.status_code}] {elapsed:.1f}ms")
        return response
    except Exception as exc:
        elapsed = (time.perf_counter() - start) * 1000
        log.error(
            f"💥  UNHANDLED {request.method} {request.url.path} ({elapsed:.1f}ms)\n"
            + traceback.format_exc()
        )
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"},
        )


# ── Static uploads ────────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(pages.router)
app.include_router(blocks.router)
app.include_router(tasks.router)
app.include_router(tags.router)
app.include_router(dashboard.router)
app.include_router(comments.router)
app.include_router(notifications.router)
app.include_router(inbox.router)
app.include_router(uploads.router)
app.include_router(activity.router)
app.include_router(collaboration.router)


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    """Liveness check for Render and uptime monitors."""
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Notely API v2 — visit /docs for Swagger UI"}