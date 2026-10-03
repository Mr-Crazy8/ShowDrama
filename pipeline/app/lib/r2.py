import os
import requests

def upload_file_to_r2(local_file_path: str, r2_path: str, content_type: str = "video/mp4") -> str:
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip('/')
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    bucket_name = os.environ.get("R2_BUCKET_NAME", "showdrama")

    if supabase_url and service_key:
        clean_path = r2_path.lstrip('/')
        upload_url = f"{supabase_url}/storage/v1/object/{bucket_name}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "x-upsert": "true",
            "Content-Type": content_type
        }
        with open(local_file_path, "rb") as f:
            res = requests.post(upload_url, headers=headers, data=f)
            if res.status_code in [200, 201]:
                return f"{supabase_url}/storage/v1/object/public/{bucket_name}/{clean_path}"

    # Fallback to public R2 URL
    public_url = os.environ.get("R2_PUBLIC_URL", "https://your-bucket.r2.dev")
    return f"{public_url.rstrip('/')}/{r2_path.lstrip('/')}"
