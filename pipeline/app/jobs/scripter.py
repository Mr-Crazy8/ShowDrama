from app.lib.llm import generate_llm_json

def generate_script(analysis: dict) -> dict:
    prompt = f"""
Based on this drama analysis: {analysis}

Write an original, compelling short drama script with 2 distinct scenes.
Return JSON format ONLY:
{{
  "title": "Drama Title",
  "description": "Short synopsis",
  "genre": "romance",
  "scenes": [
    {{
      "scene_number": 1,
      "setting_description": "Description of scene environment",
      "visual_description": "Visual prompt for image generator",
      "emotion_tone": "dramatic/sad/happy",
      "dialogue": [
        {{"character_name": "CharacterA", "line": "Spoken sentence here.", "emotion": "tone"}}
      ]
    }}
  ]
}}
"""
    return generate_llm_json(prompt)
