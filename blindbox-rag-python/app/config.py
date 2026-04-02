from pathlib import Path
import os
from dotenv import load_dotenv
load_dotenv()

class Settings:
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "deepseek-chat")
    DOCS_DIR: Path = Path(os.getenv("DOCS_DIR", "data/docs"))
    TOP_K: int = int(os.getenv("TOP_K", "4"))

settings = Settings()