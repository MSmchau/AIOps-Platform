"""测试配置"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["DATABASE_URL"] = "sqlite:///./test_aiops.db"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["DEBUG"] = "false"

from app import config as app_config
from app.config import Settings


class TestSettings(Settings):
    @property
    def database_url(self) -> str:
        return os.environ.get("DATABASE_URL", "sqlite:///./test_aiops.db")

    class Config:
        env_file = None


app_config.settings = TestSettings()
