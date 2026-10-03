import os
import json
import requests
import anthropic

def generate_llm_json(prompt: str, system_prompt: str = "You are an expert film and drama scriptwriter. Output raw valid JSON only.") -> dict:
    groq_key = os.environ.get("GROQ_API_KEY")
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if groq_key:
        try:
            response = requests.post(
                url="https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                data=json.dumps({
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }),
                timeout=60
            )
            res_data = response.json()
            content = res_data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            print(f"Groq LLM request failed: {e}. Trying fallback.")

    if openrouter_key:
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json",
                },
                data=json.dumps({
                    "model": "meta-llama/llama-3.3-70b-instruct:free",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }),
                timeout=60
            )
            res_data = response.json()
            content = res_data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            print(f"OpenRouter LLM request failed: {e}. Falling back to Anthropic.")

    if anthropic_key:
        try:
            client = anthropic.Anthropic(api_key=anthropic_key)
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2048,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )
            text = message.content[0].text
            return json.loads(text)
        except Exception as e:
            print(f"Anthropic LLM request failed: {e}")

    # Fallback default script structure if keys missing in dev
    return {
        "genre": "romance",
        "title": "Unspoken Promises",
        "description": "A heart-wrenching short drama about secret lovers meeting at dawn.",
        "scenes": [
            {
                "scene_number": 1,
                "setting_description": "Rainy city street corner at night",
                "visual_description": "A lonely young man standing under a streetlight holding a wet umbrella, looking sad",
                "emotion_tone": "melancholy",
                "dialogue": [
                    {"character_name": "Leo", "line": "I never thought we would end up like this.", "emotion": "sad"}
                ]
            },
            {
                "scene_number": 2,
                "setting_description": "Cozy coffee shop interior",
                "visual_description": "A young woman sitting near a misty glass window holding a warm tea cup",
                "emotion_tone": "hopeful",
                "dialogue": [
                    {"character_name": "Maya", "line": "Some endings are just new beginnings in disguise.", "emotion": "gentle"}
                ]
            }
        ]
    }
