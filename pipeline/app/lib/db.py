import os
from supabase import create_client, Client

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL", "https://placeholder.supabase.co")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "placeholder-key")
    return create_client(url, key)

def update_job_status(job_id: str, status: str, progress_step: str = None, error_message: str = None):
    try:
        supabase = get_supabase_client()
        payload = {"status": status}
        if progress_step:
            payload["progress_step"] = progress_step
        if error_message:
            payload["error_message"] = error_message
        supabase.table("pipeline_jobs").update(payload).eq("id", job_id).execute()
    except Exception as e:
        print(f"Failed to update job status for {job_id}: {e}")
