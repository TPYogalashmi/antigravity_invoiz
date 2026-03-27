"""
NLP routes.

POST /api/nlp/intent           — transcript → structured billing intent
POST /api/nlp/extract-entities — transcript → raw entity dict
"""
from __future__ import annotations

import logging

from flask import Blueprint, current_app, jsonify, request

from app.services.nlp_service import NlpService

nlp_bp      = Blueprint("nlp", __name__)
_nlp        = NlpService()


@nlp_bp.post("/intent")
def detect_intent():
    """
    Body:  { "transcript": "Create invoice for Arun, 2 laptops and 3 phones" }

    Returns:
    {
        "intent":          "CREATE_INVOICE",
        "confidence":      0.95,
        "customerName":    "Arun",
        "customerId":      null,
        "items": [
            { "name": "laptop",  "rawName": "laptop",  "quantity": 2 },
            { "name": "mobile",  "rawName": "phone",   "quantity": 3 }
        ],
        "discountPercent": null,
        "notes":           null,
        "dueInDays":       30
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400
    if "transcript" not in data:
        return jsonify({"error": "Missing 'transcript' field"}), 400

    transcript = data["transcript"].strip()
    inventory  = data.get("inventory", [])
    if not isinstance(inventory, list):
        inventory = []

    if not transcript:
        return jsonify({"error": "Transcript cannot be empty"}), 400

    print(f"[NlpRoute] INTENT REQUEST — transcript: {transcript!r}  inventory size: {len(inventory)}")
    current_app.logger.info("NLP intent request — transcript=%r inventory_items=%d", transcript, len(inventory))

    try:
        result = _nlp.detect_intent(transcript, inventory)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception("Intent detection failed")
        return jsonify({"error": "Intent detection failed", "detail": str(exc)}), 500

    print(f"[NlpRoute] NLP RESPONSE: {result}")
    current_app.logger.info("NLP result — intent=%s  customer=%s  items=%d",
                             result.get("intent"),
                             result.get("customerName"),
                             len(result.get("items", [])))
    return jsonify(result), 200


@nlp_bp.post("/extract-entities")
def extract_entities():
    """
    Body:   { "transcript": "..." }
    Returns: { "entities": { customer, items, discount, notes, dueInDays } }
    """
    data = request.get_json(silent=True)
    if not data or "transcript" not in data:
        return jsonify({"error": "Missing 'transcript' field"}), 400

    transcript = data["transcript"].strip()
    if not transcript:
        return jsonify({"error": "Transcript cannot be empty"}), 400

    try:
        result = _nlp.extract_entities(transcript)
        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception("Entity extraction failed")
        return jsonify({"error": "Entity extraction failed", "detail": str(exc)}), 500