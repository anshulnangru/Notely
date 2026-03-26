from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
import models  # ensure tables are registered
from routers import auth, pages, blocks, tasks, tags, dashboard, comments, notifications, uploads, activity
import os

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Notion Clone API", version="2.0.0")

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files statically
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(pages.router)
app.include_router(blocks.router)
app.include_router(tasks.router)
app.include_router(tags.router)
app.include_router(dashboard.router)
app.include_router(comments.router)
app.include_router(notifications.router)
app.include_router(uploads.router)
app.include_router(activity.router)


@app.get("/")
def root():
    return {"message": "Notion Clone API v2 — visit /docs for Swagger UI"}
