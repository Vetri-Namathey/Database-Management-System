import datetime

# Simple in-memory cache for recent finalization payloads.
# Keyed by auction_id -> { payload: {...}, timestamp: datetime }
# This is intentionally simple and works for single-process development.
# For multi-process production you'd replace this with Redis or a DB-backed queue.

recent_finalizations = {}


def set_finalization(auction_id: int, payload: dict):
    recent_finalizations[auction_id] = {'payload': payload, 'timestamp': datetime.datetime.utcnow()}


def pop_finalization(auction_id: int, max_age_seconds: int = 10):
    entry = recent_finalizations.get(auction_id)
    if not entry:
        return None
    age = (datetime.datetime.utcnow() - entry['timestamp']).total_seconds()
    if age > max_age_seconds:
        # stale; drop it
        try:
            del recent_finalizations[auction_id]
        except KeyError:
            pass
        return None
    # Return and remove so clients only see it once
    payload = entry['payload']
    try:
        del recent_finalizations[auction_id]
    except KeyError:
        pass
    return payload


def get_finalization(auction_id: int, max_age_seconds: int = 10):
    """Non-destructive read of the recent finalization for `auction_id`.
    Returns the payload if it's not older than `max_age_seconds`.
    Does not remove the payload so multiple clients (pollers) can see it during the window.
    If the entry is stale it will be removed and None returned.
    """
    entry = recent_finalizations.get(auction_id)
    if not entry:
        return None
    age = (datetime.datetime.utcnow() - entry['timestamp']).total_seconds()
    if age > max_age_seconds:
        # stale; drop it
        try:
            del recent_finalizations[auction_id]
        except KeyError:
            pass
        return None
    # Return payload but keep the cache entry so other pollers can see it
    return entry['payload']
