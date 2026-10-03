import os
import subprocess

def generate_voice_clips(job_dir: str, script: dict) -> list:
    audio_dir = os.path.join(job_dir, "audio")
    os.makedirs(audio_dir, exist_ok=True)

    use_local_tts = os.environ.get("USE_LOCAL_TTS", "true").lower() == "true"
    scene_audio_clips = []

    tts_model = None
    if use_local_tts:
        try:
            from TTS.api import TTS
            tts_model = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)
        except Exception as e:
            print(f"Coqui TTS init skipped/failed: {e}")

    for s_idx, scene in enumerate(script.get("scenes", []), start=1):
        line_clips = []
        for l_idx, line in enumerate(scene.get("dialogue", []), start=1):
            file_path = os.path.join(audio_dir, f"scene_{s_idx}_line_{l_idx}.wav")
            text = line.get("line", "...")

            generated = False
            if tts_model:
                try:
                    tts_model.tts_to_file(text=text, file_path=file_path)
                    generated = True
                except Exception as e:
                    print(f"TTS synth error: {e}")

            if not generated:
                # Generate 3s spoken tone replacement audio using ffmpeg
                cmd = [
                    "ffmpeg", "-y", "-f", "lavfi",
                    "-i", "sine=frequency=440:duration=3",
                    file_path
                ]
                subprocess.run(cmd, stderr=subprocess.DEVNULL)

            line_clips.append({"file": file_path, "text": text, "character": line.get("character_name")})
        scene_audio_clips.append(line_clips)

    return scene_audio_clips
