from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models  # ensure tables are registered
from routers import auth, pages, blocks

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Notion Clone API", version="1.0.0")

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pages.router)
app.include_router(blocks.router)


@app.get("/")
def root():
    return {"message": "Notion Clone API — visit /docs for Swagger UI"}
