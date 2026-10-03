import os
import shutil
import requests
from app.lib.db import update_job_status, get_supabase_client
from app.lib.r2 import upload_file_to_r2
from app.jobs.downloader import download_or_use_upload
from app.jobs.analyzer import analyze_video
from app.jobs.scripter import generate_script
from app.jobs.image_gen import generate_scene_images
from app.jobs.voice_gen import generate_voice_clips
from app.jobs.assembler import assemble_final_video

async def run_pipeline(job_id: str, source_url: str = None, source_file: str = None):
    job_dir = f"/tmp/jobs/{job_id}"
    os.makedirs(job_dir, exist_ok=True)

    try:
        # Step 1: Downloading
        update_job_status(job_id, "downloading", progress_step="downloading")
        video_path = download_or_use_upload(job_dir, source_url, source_file)

        # Step 2: Analyzing
        update_job_status(job_id, "analyzing", progress_step="analyzing")
        analysis = analyze_video(job_dir, video_path)

        # Step 3: Scripting
        update_job_status(job_id, "scripting", progress_step="scripting")
        script = generate_script(analysis)

        # Step 4: Image Generation
        update_job_status(job_id, "generating_images", progress_step="generating_images")
        scene_images = generate_scene_images(job_dir, script)

        # Step 5: Voice Audio Generation
        update_job_status(job_id, "generating_voice", progress_step="generating_voice")
        audio_clips = generate_voice_clips(job_dir, script)

        # Step 6: Assembling Video
        update_job_status(job_id, "assembling", progress_step="assembling")
        final_video_path = assemble_final_video(job_dir, scene_images, audio_clips, script)

        # Step 7: Uploading to R2
        update_job_status(job_id, "uploading", progress_step="uploading")
        video_r2_url = upload_file_to_r2(final_video_path, f"dramas/{job_id}/episode_1.mp4", "video/mp4")
        thumbnail_r2_url = upload_file_to_r2(scene_images[0], f"dramas/{job_id}/thumbnail.jpg", "image/jpeg")

        # Create database records
        supabase = get_supabase_client()
        drama_res = supabase.table("dramas").insert({
            "title": script.get("title", "Generated Drama"),
            "description": script.get("description", "AI Generated drama series"),
            "genre": script.get("genre", "romance"),
            "thumbnail_url": thumbnail_r2_url,
            "status": "pending",
            "source_url": source_url or "uploaded_file"
        }).execute()

        drama_id = drama_res.data[0]["id"]

        supabase.table("episodes").insert({
            "drama_id": drama_id,
            "episode_number": 1,
            "title": f"Episode 1: {script.get('title')}",
            "video_url": video_r2_url,
            "duration_seconds": 30,
            "token_cost": 3,
            "status": "pending"
        }).execute()

        # Notify backend completion webhook
        backend_url = os.environ.get("BACKEND_URL", "http://localhost:3000")
        internal_secret = os.environ.get("PIPELINE_INTERNAL_SECRET", "shared-secret-between-backend-and-pipeline")

        requests.post(
            f"{backend_url}/internal/pipeline/complete",
            headers={"X-Internal-Secret": internal_secret},
            json={
                "job_id": job_id,
                "drama_id": drama_id,
                "r2_url": video_r2_url
            },
            timeout=10
        )

        update_job_status(job_id, "done", progress_step="done")

    except Exception as e:
        print(f"Pipeline error for job {job_id}: {e}")
        update_job_status(job_id, "failed", progress_step="failed", error_message=str(e))
        backend_url = os.environ.get("BACKEND_URL", "http://localhost:3000")
        internal_secret = os.environ.get("PIPELINE_INTERNAL_SECRET", "shared-secret-between-backend-and-pipeline")
        try:
            requests.post(
                f"{backend_url}/internal/pipeline/complete",
                headers={"X-Internal-Secret": internal_secret},
                json={"job_id": job_id, "error_message": str(e)},
                timeout=10
            )
        except Exception:
            pass
    finally:
        # Clean up temporary processing directory
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir, ignore_errors=True)
