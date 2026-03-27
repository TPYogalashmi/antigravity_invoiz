"""
Canonical synonym map.
Keys   → variants spoken by users
Values → canonical product name sent to backend for DB matching
All keys and values are lowercase.
"""

from .fuzzy_matcher import best_match
import logging

logger = logging.getLogger(__name__)

# This replaces your old self.inventory and self.alias_map
INVENTORY = ["Tata Salt", "Ponni Rice", "Sony Laptop", "Dairy Milk", "Maska Chaska", "Soda Up"]
# Global Inventory (Fallback only)
INVENTORY = ["Tata Salt", "Ponni Rice", "Sony Laptop", "Dairy Milk", "Maska Chaska", "Soda Up"]

def normalize_item_name(query: str, inventory: list[str] | None = None) -> str:
    """
    Standardize product names against the provided inventory.
    Now entirely dynamic — no hardcoded Alias map in Python.
    """
    if not query.strip():
        return ""

    # Normalize query
    q = query.lower().strip()
    
    # Use dynamic inventory from DB (which now includes Aliases)
    active_inventory = inventory if inventory and len(inventory) > 0 else INVENTORY

    # Fuzzy match against the REAL product identifiers (Names + Aliases)
    matched_name, score = best_match(query, active_inventory, threshold=70)

    # Return the strongest match found
    final_name = matched_name if matched_name else query

    logger.info("Normalize: '%s' → '%s' (score=%.1f)", query, final_name, score)
    return final_name