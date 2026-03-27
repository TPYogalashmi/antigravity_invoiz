from __future__ import annotations

import logging
import os
from flask import Flask
from flask_cors import CORS

from config import config


def create_app(config_name: str | None = None) -> Flask:
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config[config_name])
    app.config["MAX_CONTENT_LENGTH"] = 30 * 1024 * 1024  # 30 MB for audio

    CORS(
        app,
        origins=app.config.get("CORS_ORIGINS", ["http://localhost:5173"]),
        supports_credentials=True,
    )

    logging.basicConfig(
        level=logging.DEBUG if app.config.get("DEBUG") else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )

    from app.routes.health import health_bp
    from app.routes.voice  import voice_bp      # ← correct name
    from app.routes.nlp    import nlp_bp

    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(voice_bp,  url_prefix="/api/voice")
    app.register_blueprint(nlp_bp,    url_prefix="/api/nlp")

    app.logger.info("Flask AI service started — env=%s", config_name)
    return app