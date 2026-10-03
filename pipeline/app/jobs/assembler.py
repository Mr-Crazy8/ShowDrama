import os
import subprocess

def assemble_final_video(job_dir: str, scene_images: list, audio_clips: list, script: dict) -> str:
    output_path = os.path.join(job_dir, "final.mp4")
    concat_list_path = os.path.join(job_dir, "concat.txt")

    scene_files = []

    for idx, (img_path, clips) in enumerate(zip(scene_images, audio_clips), start=1):
        scene_mp4 = os.path.join(job_dir, f"scene_{idx}_final.mp4")
        scene_srt = os.path.join(job_dir, f"scene_{idx}.srt")

        # 1. Build SRT file for scene subtitles
        srt_content = ""
        start_sec = 0.0
        for l_idx, clip in enumerate(clips, start=1):
            dur = 3.0 # clip duration
            end_sec = start_sec + dur
            start_str = f"00:00:{int(start_sec):02d},000"
            end_str = f"00:00:{int(end_sec):02d},000"
            srt_content += f"{l_idx}\n{start_str} --> {end_str}\n{clip['character']}: {clip['text']}\n\n"
            start_sec = end_sec + 0.5

        with open(scene_srt, "w") as f:
            f.write(srt_content)

        # 2. Build audio file for scene by concatenating audio clips or synth
        scene_audio = os.path.join(job_dir, f"scene_{idx}_audio.wav")
        if clips:
            inputs = []
            for c in clips:
                inputs.extend(["-i", c["file"]])
            filter_str = "".join([f"[{i}:a]" for i in range(len(clips))]) + f"concat=n={len(clips)}:v=0:a=1[a]"
            cmd_audio = ["ffmpeg", "-y"] + inputs + ["-filter_complex", filter_str, "-map", "[a]", scene_audio]
            subprocess.run(cmd_audio, stderr=subprocess.DEVNULL)
        else:
            cmd_audio = ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=5", scene_audio]
            subprocess.run(cmd_audio, stderr=subprocess.DEVNULL)

        # 3. Create MP4 with image + scene audio
        cmd_scene = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", img_path,
            "-i", scene_audio,
            "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p", "-shortest",
            scene_mp4
        ]
        subprocess.run(cmd_scene, stderr=subprocess.DEVNULL)
        scene_files.append(scene_mp4)

    # Concat all scenes into final video
    with open(concat_list_path, "w") as f:
        for sf in scene_files:
            f.write(f"file '{sf}'\n")

    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_list_path,
        "-c", "copy",
        output_path
    ]
    subprocess.run(concat_cmd, stderr=subprocess.DEVNULL)

    return output_path
