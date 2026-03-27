"""
Voice Blueprint — audio upload and TTS endpoints.
"""
from __future__ import annotations

import logging
import os
import tempfile

from flask import Blueprint, current_app, jsonify, request

from app.services.voice_service import VoiceService

voice_bp = Blueprint("voice", __name__)
_svc     = VoiceService()
_log     = logging.getLogger(__name__)

_AUDIO_EXTS = {
    "audio/webm": ".webm", "audio/ogg": ".ogg",
    "audio/mp4":  ".mp4",  "audio/mpeg": ".mp3",
    "audio/wav":  ".wav",  "audio/wave": ".wav",
    "audio/x-wav":".wav",  "audio/flac": ".flac",
    "audio/x-m4a":".m4a",
}
MAX_BYTES = 25 * 1024 * 1024


# ── POST /api/voice/transcribe-form  (multipart — React frontend) ────

@voice_bp.post("/transcribe-form")
def transcribe_form():
    file = request.files.get("audio")

    if file is None or file.filename == "":
        return jsonify({"error": "No 'audio' file in request"}), 400

    audio_bytes = file.read()
    if not audio_bytes:
        return jsonify({"error": "Uploaded file is empty"}), 400
    if len(audio_bytes) > MAX_BYTES:
        return jsonify({"error": f"File too large ({len(audio_bytes)//1048576} MB, max 25 MB)"}), 400

    # Resolve MIME type
    mime = (file.content_type or "").split(";")[0].strip().lower()
    if not mime or mime == "application/octet-stream":
        mime = request.form.get("mimeType", "audio/webm").split(";")[0].strip().lower()

    ext      = _AUDIO_EXTS.get(mime, ".webm")
    tmp_path = None

    print(f"[VoiceRoute] AUDIO RECEIVED — {len(audio_bytes)} bytes  mime={mime}  ext={ext}")
    current_app.logger.info("AUDIO RECEIVED — size=%d  mime=%s", len(audio_bytes), mime)

    try:
        # Write audio to temp file
        fd, tmp_path = tempfile.mkstemp(suffix=ext)
        with os.fdopen(fd, "wb") as f:
            f.write(audio_bytes)

        result = _svc.transcribe_file(tmp_path, mime)

    except RuntimeError as exc:
        # Log full traceback for debugging
        current_app.logger.error("Transcription failed:\n%s", exc)
        print(f"[VoiceRoute] ERROR: {exc}")
        return jsonify({"error": str(exc)}), 500

    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        current_app.logger.error("Unexpected error:\n%s", tb)
        print(f"[VoiceRoute] UNEXPECTED ERROR: {exc}\n{tb}")
        return jsonify({"error": f"Unexpected error: {exc}"}), 500

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    print(f"[VoiceRoute] TRANSCRIBED: {result.get('transcript')!r}  provider={result.get('provider')}")
    current_app.logger.info("Transcription OK: %s", result)
    return jsonify(result), 200


# ── POST /api/voice/transcribe  (JSON base64 — server-to-server) ────

@voice_bp.post("/transcribe")
def transcribe_base64():
    import base64 as b64lib

    data = request.get_json(silent=True)
    if not data or "audio" not in data:
        return jsonify({"error": "Missing 'audio' (base64) field"}), 400

    mime = data.get("mimeType", "audio/webm").split(";")[0].strip().lower()
    try:
        audio_bytes = b64lib.b64decode(data["audio"])
    except Exception as exc:
        return jsonify({"error": f"Invalid base64: {exc}"}), 400

    if not audio_bytes:
        return jsonify({"error": "Decoded audio is empty"}), 400

    ext      = _AUDIO_EXTS.get(mime, ".webm")
    tmp_path = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=ext)
        with os.fdopen(fd, "wb") as f:
            f.write(audio_bytes)
        result = _svc.transcribe_file(tmp_path, mime)
    except RuntimeError as exc:
        current_app.logger.error("Transcription failed: %s", exc)
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        current_app.logger.error("Unexpected error: %s", exc)
        return jsonify({"error": str(exc)}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return jsonify(result), 200


# ── POST /api/voice/synthesize ───────────────────────────────────────

@voice_bp.post("/synthesize")
def synthesize():
    data = request.get_json(silent=True)
    if not data or not data.get("text", "").strip():
        return jsonify({"error": "Missing or empty 'text' field"}), 400
    try:
        return jsonify(_svc.synthesize(data["text"])), 200
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500