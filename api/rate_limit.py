import time

from fastapi import HTTPException, Request, status


class FixedWindowRateLimiter:
    """Allows one request per `window_seconds` for a given key.

    In-memory only: correct for a single API process, not for multiple
    replicas sharing the rate limit.
    """

    def __init__(self, window_seconds: float) -> None:
        self.window_seconds = window_seconds
        self._last_request_at: dict[str, float] = {}

    def check(self, key: str) -> None:
        now = time.monotonic()
        last_request_at = self._last_request_at.get(key)
        if last_request_at is not None:
            elapsed = now - last_request_at
            if elapsed < self.window_seconds:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={"Retry-After": str(int(self.window_seconds - elapsed) + 1)},
                )
        self._last_request_at[key] = now


def client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"
