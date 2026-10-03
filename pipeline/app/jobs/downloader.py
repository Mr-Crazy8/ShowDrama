import os
import shutil
import subprocess

def download_or_use_upload(job_dir: str, source_url: str = None, source_file: str = None) -> str:
    target_path = os.path.join(job_dir, "source.mp4")

    if source_file and os.path.exists(source_file):
        shutil.copy(source_file, target_path)
        return target_path

    if source_url:
        cmd = [
            "yt-dlp",
            "-f", "b[ext=mp4]/best",
            "-o", target_path,
            source_url
        ]
        subprocess.run(cmd, check=True)
        return target_path

    # Fallback placeholder video generation if no input provided
    dummy_cmd = [
        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=1280x720:d=5",
        "-c:v", "libx264", target_path
    ]
    subprocess.run(dummy_cmd, check=True)
    return target_path
