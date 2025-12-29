from fastapi import FastAPI
from db import Base, engine
from sync import router as sync_router
from insights_api import router as insights_router

app = FastAPI(title="Teacher Assist Backend")

@app.on_event("startup")
def startup():
  Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
  return {"ok": True}

app.include_router(sync_router)
app.include_router(insights_router)