import os
import requests
import urllib.parse
from PIL import Image, ImageDraw

def generate_scene_images(job_dir: str, script: dict) -> list:
    scenes_dir = os.path.join(job_dir, "scenes")
    os.makedirs(scenes_dir, exist_ok=True)

    replicate_token = os.environ.get("REPLICATE_API_TOKEN")
    image_paths = []

    for idx, scene in enumerate(script.get("scenes", []), start=1):
        target_path = os.path.join(scenes_dir, f"scene_{idx}.jpg")
        prompt = scene.get("visual_description", "Cinematic short drama scene")

        generated = False
        if replicate_token:
            try:
                res = requests.post(
                    "https://api.replicate.com/v1/predictions",
                    headers={
                        "Authorization": f"Token {replicate_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "version": "black-forest-labs/flux-schnell",
                        "input": {
                            "prompt": prompt,
                            "aspect_ratio": "16:9",
                            "output_format": "jpg"
                        }
                    },
                    timeout=30
                )
                if res.status_code == 201:
                    pred = res.json()
                    output_urls = pred.get("output", [])
                    if output_urls:
                        img_data = requests.get(output_urls[0]).content
                        with open(target_path, "wb") as f:
                            f.write(img_data)
                        generated = True
            except Exception as e:
                print(f"Replicate image gen failed for scene {idx}: {e}")

        # Free Pollinations FLUX image generation fallback
        if not generated:
            try:
                encoded_prompt = urllib.parse.quote(prompt)
                pollination_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&model=flux&nologo=true"
                res = requests.get(pollination_url, timeout=30)
                if res.status_code == 200:
                    with open(target_path, "wb") as f:
                        f.write(res.content)
                    generated = True
            except Exception as e:
                print(f"Pollinations free AI image gen error: {e}")

        if not generated:
            # Fallback PIL image creation
            img = Image.new('RGB', (1280, 720), color=(30, 30, 50))
            d = ImageDraw.Draw(img)
            title_text = f"Scene {idx}: {scene.get('setting_description', 'Drama Scene')}"
            d.text((100, 300), title_text, fill=(255, 255, 255))
            img.save(target_path)

        image_paths.append(target_path)

    return image_paths
