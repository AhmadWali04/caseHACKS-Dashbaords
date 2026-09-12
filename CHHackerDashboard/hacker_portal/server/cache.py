import os
import json
from upstash_redis import Redis

redis = Redis(
    url=os.environ["UPSTASH_REDIS_REST_URL"],
    token=os.environ["UPSTASH_REDIS_REST_TOKEN"],
)

CACHE_TTL = 5  # seconds


def cache_get(key: str):
    val = redis.get(key)
    if val is None:
        return None
    return json.loads(val)


def cache_set(key: str, data, ttl: int = CACHE_TTL):
    redis.set(key, json.dumps(data), ex=ttl)


def cache_invalidate_leaderboards():
    redis.delete("leaderboard:individual", "leaderboard:teams")

def cache_invalidate_dashboard():
    redis.delete("dashboard:announcements", "dashboard:events")