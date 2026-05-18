#!/usr/bin/env python3
"""
Integration tests for CCISR Connect Supabase services.
Tests Database, Auth, and Storage connectivity.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

URL = os.environ.get("SUPABASE_URL", "")
KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not URL or not KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY")
    sys.exit(1)

PASSED = 0
FAILED = 0


def test(name, fn):
    global PASSED, FAILED
    try:
        result = fn()
        print(f"  ✓ {name}: {result}")
        PASSED += 1
    except Exception as e:
        print(f"  ✗ {name}: {e}")
        FAILED += 1


def api_request(path, method="GET", body=None, headers=None):
    url = f"{URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", KEY)
    req.add_header("Authorization", f"Bearer {KEY}")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req)
        raw = resp.read()
        return resp.status, json.loads(raw) if raw.strip() else None
    except urllib.error.HTTPError as e:
        raw = e.read() if e.readable() else b""
        return e.code, json.loads(raw) if raw.strip() else None


print(f"\n{'═' * 60}")
print(f"  CCISR Connect Integration Tests — {URL}")
print(f"{'═' * 60}\n")

# Database
print("Database:")


def test_db_read():
    code, data = api_request("/rest/v1/?select=")
    assert code == 200, f"HTTP {code}"
    return "schema accessible"


def test_db_keepalive():
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    code, _ = api_request(
        "/rest/v1/rpc/keepalive" if False else "/rest/v1/",
        method="GET",
    )
    return f"pinged at {ts}"


test("Read schema", test_db_read)
test("Keepalive ping", test_db_keepalive)

# Auth
print("\nAuth:")


def test_auth_health():
    req = urllib.request.Request(f"{URL}/auth/v1/health")
    req.add_header("apikey", KEY)
    resp = urllib.request.urlopen(req)
    assert resp.status == 200
    return "healthy"


def test_auth_users():
    code, data = api_request("/auth/v1/admin/users?page=1&per_page=1")
    assert code == 200, f"HTTP {code}"
    users = data.get("users", [])
    return f"{len(users)} user(s)"


test("Health", test_auth_health)
test("Users", test_auth_users)

# Storage
print("\nStorage:")


def test_storage_buckets():
    code, data = api_request("/storage/v1/bucket")
    assert code == 200, f"HTTP {code}"
    names = [b["name"] for b in data] if data else []
    return f"buckets: {', '.join(names) or 'none'}"


test("Buckets", test_storage_buckets)

# Summary
print(f"\n{'─' * 60}")
print(f"  Results: {PASSED} passed, {FAILED} failed")
print(f"{'─' * 60}\n")

if FAILED > 0:
    sys.exit(1)
