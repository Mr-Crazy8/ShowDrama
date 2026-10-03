import os
import subprocess
from app.lib.llm import generate_llm_json

def analyze_video(job_dir: str, video_path: str) -> dict:
    frames_dir = os.path.join(job_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    # 1. Extract 1 frame per second
    frame_cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", "fps=1",
        os.path.join(frames_dir, "frame_%04d.jpg")
    ]
    subprocess.run(frame_cmd, stderr=subprocess.DEVNULL)

    # 2. Whisper transcription
    transcript_text = "Background music with minimal dialogue."
    try:
        import whisper
        model = whisper.load_model("base")
        res = model.transcribe(video_path)
        transcript_text = res.get("text", transcript_text)
    except Exception as e:
        print(f"Whisper transcription skipped/failed: {e}")

    # 3. LLM Analysis
    prompt = f"""
Analyze this source video transcript:
"{transcript_text}"

Return JSON with keys:
genre (romance/action/thriller/comedy),
setting,
main_characters (array of objects with name, gender, personality),
plot_summary,
emotional_arc.
"""
    return generate_llm_json(prompt)
