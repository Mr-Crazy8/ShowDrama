from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from app.jobs.generate_drama import run_pipeline
from app.lib.db import get_supabase_client

app = FastAPI(title="ShowDrama AI Pipeline Service", version="1.0.0")

class ProcessJobRequest(BaseModel):
    job_id: str
    source_url: Optional[str] = None
    source_file: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "ok", "service": "showdrama-pipeline"}

@app.post("/jobs/process")
async def process_job(payload: ProcessJobRequest, background_tasks: BackgroundTasks):
    if not payload.job_id:
        raise HTTPException(status_code=400, detail="job_id is required")

    background_tasks.add_task(
        run_pipeline,
        payload.job_id,
        payload.source_url,
        payload.source_file
    )

    return {"status": "started", "job_id": payload.job_id}

@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    try:
        supabase = get_supabase_client()
        res = supabase.table("pipeline_jobs").select("*").eq("id", job_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"job": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
