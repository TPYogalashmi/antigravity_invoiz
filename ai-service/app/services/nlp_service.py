"""
NLP Service — production-grade, fully dynamic, zero fallback stubs.

Pipeline:
  1. Preprocess transcript (lowercase, punctuation strip)
  2. Extract customer name using positional patterns
  3. Extract item + quantity pairs using numeric + noun patterns
  4. Normalise item names (de-plural, synonym resolution)
  5. Return structured intent dict

No hardcoded product names.  No dummy data.
"""
from __future__ import annotations
import spacy
import re
import logging
from typing import Optional
from text2digits import text2digits
from app.utils.synonyms import normalize_item_name

nlp_model = spacy.load("en_core_web_sm")


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Compiled regex patterns (compiled once at import time for performance)
# ---------------------------------------------------------------------------

# "for <Name>" | "to <Name>" | "of <Name>"  — captures the customer name
_CUSTOMER_PATTERN = re.compile(
     r"\b(?:bill for|invoice for|bill to|invoice to|for|to)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})", 
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

class NlpService:
    """Stateless NLP processor — all extraction is fully dynamic."""
    def __init__(self):
        """Initialize the service with offline NLP tools."""
        # Setup text2digits for word-to-number conversion
        self.t2d = text2digits.Text2Digits()
        if "entity_ruler" not in nlp_model.pipe_names:
            ruler = nlp_model.add_pipe("entity_ruler", before="ner")
            patterns = [
                # Matches "5kg", "200ml", "1ltr" (Sticky units)
                {"label": "WEIGHT", "pattern": [{"LOWER": {"REGEX": r"^\d+(kg|g|mg|ltr|ml)$"}}]},
                # Matches "5 kg", "200 ml" (Separated units)
                {"label": "WEIGHT", "pattern": [{"LIKE_NUM": True}, {"LOWER": {"IN": ["kg", "g", "mg", "ltr", "ml"]}}]}
            ]
            ruler.add_patterns(patterns)

    def detect_intent(self, transcript: str, inventory: list[str] | None = None) -> dict:
        """
        Parse a raw voice transcript into a structured billing intent.
        Uses dynamic inventory matching if provided.
        """
        if not transcript or not transcript.strip():
            raise ValueError("Transcript is empty")

        transcript    = self._preprocess(transcript)
        intent     = self._classify_intent(transcript)
        customer   = self._extract_customer(transcript)
        items_text = transcript

        if customer:
            idx = transcript.lower().find(customer.lower())
            if idx != -1:
                items_text = transcript[idx + len(customer):]
        
        # remove leading filler words like "and", "with"
        items_text = items_text.strip()
        
        items = self._extract_items(items_text, inventory)
        discount   = self._extract_discount(transcript)
        due_days   = self._extract_due_days(transcript)
        notes      = self._extract_notes(transcript)
        confidence = self._compute_confidence(customer, items, intent)

        logger.info(
            "NLP result — intent=%s customer=%s items=%d confidence=%.2f",
            intent, customer, len(items), confidence,
        )

        return {
            "intent":          intent,
            "confidence":      confidence,
            "customerName":    customer,
            "customerId":      None,
            "items":           items,
            "totalItems":      len(items),
            "discountPercent": discount,
            "notes":           notes,
            "dueInDays":       due_days,
        }

    def extract_entities(self, transcript: str) -> dict:
        intent = self.detect_intent(transcript)
        return {
            "entities": {
                "customer":  intent["customerName"],
                "items":     intent["items"],
                "discount":  intent["discountPercent"],
                "notes":     intent["notes"],
                "dueInDays": intent["dueInDays"],
            }
        }

    # -----------------------------------------------------------------------
    # Private helpers
    # -----------------------------------------------------------------------

    def _preprocess(self, text: str) -> str:
        """
        Merged Preprocessing: Cleans text, converts numbers, and standardizes units.
        """
        # 1. Basic cleaning and lowercase
        text = text.lower().strip()
        text = re.sub(r"\s+", " ", text)
        
        # 2. Remove filler words and billing triggers
        # This prevents "bill" or "please" from being caught as a product name
        filler_pattern = r"\b(please|kindly|can you|could you|i want|i need|i would like)\b"
        text = re.sub(filler_pattern, "", text)

        # 3. Convert words to numbers (e.g., "five" -> "5")
        text = self.t2d.convert(text)

        # 4. Standardize Units (Full word to Short code)
        unit_map = {
            r"\b(kilograms?|kilogram?|kgs?|kilo?)\b": "kg",
            r"\b(grams?|gram?|gm?|gms?)\b": "g",
            r"\b(milligrams?|milligram?|mg?|mgs?)\b": "mg",
            r"\b(litres?|liter?|ltrs?|ltr?)\b": "ltr",
            r"\b(millilitres?|millilitre?|mlitres?|mls?|ml?)\b": "ml"
        }
        for pattern, replacement in unit_map.items():
            text = re.sub(pattern, replacement, text)

        # 5. Sticky Units (e.g., "5 kg" -> "5kg")
        # This is the "merging thing" that helps the extractor see quantity+unit as one block
        text = re.sub(r"(\d+)\s+(kg|g|mg|ltr|ml)\b", r"\1\2", text)
        logger.info(f"[DEBUG] After unit normalization: {text}")
        return text.strip()

    @staticmethod
    def _classify_intent(cleaned: str) -> str:
        create_kw  = r"\b(create|generate|make|prepare|raise|issue|new|add|produce|invoice|bill)\b"
        update_kw  = r"\b(update|edit|modify|change|correct|fix|revise)\b"
        query_kw   = r"\b(show|list|find|get|fetch|check|view|search|display)\b"

        if re.search(create_kw, cleaned):
            return "CREATE_INVOICE"
        if re.search(update_kw, cleaned):
            return "UPDATE_INVOICE"
        if re.search(query_kw, cleaned):
            return "QUERY_INVOICE"
        return "CREATE_INVOICE"   # default assumption

    @staticmethod
    def _extract_customer(original: str) -> Optional[str]:
    # 1️⃣ Try spaCy
        doc = nlp_model(original)
   
        for ent in doc.ents:
           if ent.label_ == "PERSON":
               return ent.text.strip()
   
       # 2️⃣ Fallback: simple regex (after "for")
        match = _CUSTOMER_PATTERN.search(original)
        if match:
            # Grabs the captured group and cleans it.
            return match.group(1).strip().title()

        return "Unknown"
    
    def _parse_single_item(self, seg: str, inventory: list[str] | None = None):
        seg_doc = nlp_model(seg)
        current_qty = 1
        qty_found = False
        
        # 1. Create Weight Mask (identifies 5kg, 200g, etc.)
        # This uses the Entity Ruler we added to spaCy
        weight_indices = {i for ent in seg_doc.ents if ent.label_ == "WEIGHT" 
                          for i in range(ent.start, ent.end)}
        
        # 2. Extract Quantity (The number that isn't part of the weight)
        for token in seg_doc:
            if token.like_num and not qty_found and token.i not in weight_indices:
                # Since we used text2digits in preprocess, we just convert the string
                current_qty = int(token.text) if token.text.isdigit() else 1
                qty_found = True

        # 3. Product Extraction
        product_parts = []
        for t in seg_doc:
            if t.i not in weight_indices and not t.like_num and t.pos_ in ["NOUN", "PROPN", "ADJ"]:
                # Ignore common noise words
                if t.text.lower() not in ["bill", "to", "for", "invoice"]:
                    product_parts.append(t.text)

        if not product_parts:
            return None

        product_name = " ".join(product_parts)
        weights_in_seg = [ent.text for ent in seg_doc.ents if ent.label_ == "WEIGHT"]
        weight_str = weights_in_seg[0] if weights_in_seg else ""
        
        # Canonical Name: "500g Tata Salt"
        full_item_query = f"{weight_str} {product_name}".strip()

        return {
            "name": normalize_item_name(full_item_query, inventory), # Connects to your dynamic inventory
            "rawName": full_item_query,
            "quantity": current_qty
        }
    
    def _extract_items(self, text: str, inventory: list[str] | None = None):
        # 🔹 Split multiple items
        first_qty_match = re.search(r'\b(\d+)\b(?![a-z])', text)
        if first_qty_match:
            num_start = first_qty_match.start()
            # If there's a product name BEFORE the number, the number belongs to a NEW item
            prefix_doc = nlp_model(text[:num_start])
            has_leading_product = any(t.pos_ in ["NOUN", "PROPN"] for t in prefix_doc 
                                    if t.text.lower() not in ["bill", "to", "for", "invoice"])

            if has_leading_product:
                text = re.sub(r'\b(\d+)\b(?![a-z])', r'\1 ,', text) 
            else:
                text = re.sub(r'\b(\d+)\b(?![a-z])', r', \1', text)

        # Split into segments and process each
        segments = [s.strip() for s in text.split(',') if s.strip()]
        items = []
        for seg in segments:
            item = self._parse_single_item(seg, inventory)
            if item:
                items.append(item)
        logger.info(f"[DEBUG] Raw items text: {text}")
        logger.info(f"[DEBUG] Segments after split: {segments}")
        return items

    @staticmethod
    def _extract_discount(cleaned: str) -> Optional[float]:
        m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:discount|off|reduction)", cleaned)
        if m:
            return float(m.group(1))
        m2 = re.search(r"(?:discount|off)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%", cleaned)
        if m2:
            return float(m2.group(1))
        return None

    @staticmethod
    def _extract_due_days(cleaned: str) -> Optional[int]:
        patterns = [
            r"due\s+in\s+(\d+)\s+days?",
            r"payment\s+(?:in|within)\s+(\d+)\s+days?",
            r"(\d+)[- ]day\s+(?:net|payment|terms?)",
            r"net[- ]?(\d+)",
            r"within\s+(\d+)\s+days?",
        ]
        for pattern in patterns:
            m = re.search(pattern, cleaned)
            if m:
                return int(m.group(1))
        return 30   # standard net-30 default

    @staticmethod
    def _extract_notes(original: str) -> Optional[str]:
        patterns = [
            r'(?:add\s+)?(?:a\s+)?note[s]?[:\s]+["\']?(.+?)["\']?(?:\.|$)',
            r'(?:with\s+(?:a\s+)?note)[:\s]+["\']?(.+?)["\']?(?:\.|$)',
            r'(?:remark|comment)[:\s]+["\']?(.+?)["\']?(?:\.|$)',
        ]
        for pattern in patterns:
            m = re.search(pattern, original, re.IGNORECASE)
            if m:
                return m.group(1).strip().strip("\"'")
        return None

    @staticmethod
    def _compute_confidence(
        customer: Optional[str],
        items: list[dict],
        intent: str,
    ) -> float:
        score = 0.5
        if customer:
            score += 0.2
        if items:
            score += min(0.25, 0.1 * len(items))
        if intent != "UNKNOWN":
            score += 0.05
        return round(min(score, 1.0), 4)