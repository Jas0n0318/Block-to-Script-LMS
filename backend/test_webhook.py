"""
Webhook test script (v2 — event-based)
Usage: python test_webhook.py <username> [event]
Example: python test_webhook.py student EVENT_ENV_TEST_COMPLETED
"""
import asyncio, httpx, sys

BASE = "http://127.0.0.1:8001"

async def test(username: str, event: str = "EVENT_ENV_TEST_COMPLETED"):
    print(f"[Webhook Test v2] user={username} event={event} backend={BASE}")
    async with httpx.AsyncClient() as c:
        try:
            r = await c.post(f"{BASE}/api/auth/login",
                json={"username": username, "password": "123456"}, timeout=10)
        except Exception as e:
            print(f"[FAIL] Cannot connect to {BASE}: {e}")
            print("  Make sure backend is running: uvicorn main:app --reload --host 127.0.0.1 --port 8001")
            return
        if r.status_code != 200:
            print(f"[FAIL] Login failed: {r.text}")
            return
        data = r.json()
        token = data["student_token"]
        print(f"[OK] Login success")
        print(f"[TOKEN] {token}")
        print(f"  Copy this token into Workspace.Token.Value in Roblox Studio")

        r2 = await c.post(f"{BASE}/api/webhook/unlock", json={
            "token": token, "event": event,
        }, timeout=10)
        if r2.status_code == 200:
            print(f"[OK] Webhook success! Response: {r2.json()}")
        elif r2.status_code == 403:
            print(f"[FAIL] 403 - Token mismatch")
            print(f"  The token in Roblox Studio does not match: {token}")
        elif r2.status_code == 404:
            print(f"[FAIL] 404 - Event '{event}' not found (check unlockEvent in seed)")
        else:
            print(f"[FAIL] {r2.status_code}: {r2.text}")

        print()
        print("=== Checklist ===")
        print(f"  [ ] Backend running on port 8001?")
        print(f"  [ ] Website token matches: {token}?")
        print(f"  [ ] Workspace.Token.Value has the same token?")
        print(f"  [ ] HttpService enabled (Allow HTTP Requests)?")
        print(f"  [ ] Script uses POST to {BASE}/api/webhook/unlock?")
        print(f"  [ ] Script sends event = '{event}'?")

if __name__ == "__main__":
    event = "EVENT_ENV_TEST_COMPLETED"
    if len(sys.argv) < 2:
        print("Usage: python test_webhook.py <username> [event]")
        print("Example: python test_webhook.py student")
        print("         python test_webhook.py student EVENT_T1_C1_COMPLETED")
        sys.exit(1)
    if len(sys.argv) >= 3:
        event = sys.argv[2]
    asyncio.run(test(sys.argv[1], event))
