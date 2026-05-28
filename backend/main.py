import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from config import CORS_ORIGINS
from routers import auth, topics, courses, tracking, webhook, ai_tutor
from routers.admin import students, chapters as admin_courses


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Block-to-Script LMS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(topics.router)
app.include_router(courses.router)
app.include_router(tracking.router)
app.include_router(webhook.router)
app.include_router(ai_tutor.router)
app.include_router(students.router)
app.include_router(admin_courses.router)


# In production, serve the built frontend from ../frontend/dist
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "Block-to-Script LMS API running (frontend not built yet)"}
