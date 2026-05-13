import uuid
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings

UPLOAD_DIR = Path(settings.UPLOAD_DIR)


async def save_upload(file: UploadFile, subdir: str = "documentos") -> str:
    ext = Path(file.filename).suffix if file.filename else ""
    filename = f"{uuid.uuid4()}{ext}"
    target_dir = UPLOAD_DIR / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    file_path = target_dir / filename
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    return f"{subdir}/{filename}"


def get_file_path(relative_path: str) -> Path:
    return UPLOAD_DIR / relative_path
