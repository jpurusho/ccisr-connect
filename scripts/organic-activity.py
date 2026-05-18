#!/usr/bin/env python3
"""
Simulates organic app usage to keep Supabase active.
Each run varies randomly: different tables, queries, timing, and order.
Only reads + one timestamp upsert (no data accumulation).
"""

import json
import os
import random
import sys
import time
import urllib.request
import urllib.error

URL = os.environ.get("SUPABASE_URL", "")
KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not URL or not KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY")
    sys.exit(1)

random.seed(int(time.time()))


def api_get(path):
    req = urllib.request.Request(f"{URL}{path}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Accept": "application/json"})
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, None


def api_post(path, body):
    req = urllib.request.Request(f"{URL}{path}", data=json.dumps(body).encode(), method="POST",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"})
    try:
        resp = urllib.request.urlopen(req)
        return resp.status
    except urllib.error.HTTPError:
        return 0


TABLES = ["members", "member_tags", "events", "event_recurrence_rules", "composed_instances", "dispatch_queue"]


def op_read_random_table():
    table = random.choice(TABLES)
    limit = random.randint(1, 10)
    offset = random.randint(0, 15)
    code, data = api_get(f"/rest/v1/{table}?select=id&limit={limit}&offset={offset}")
    return f"read {table} limit={limit} offset={offset} → HTTP {code}"


def op_count_table():
    table = random.choice(TABLES)
    code, data = api_get(f"/rest/v1/{table}?select=id")
    count = len(data) if isinstance(data, list) else "?"
    return f"count {table} → {count} rows"


def op_auth_check():
    code, data = api_get("/auth/v1/admin/users?page=1&per_page=5")
    users = len(data.get("users", [])) if isinstance(data, dict) else 0
    return f"auth users → {users} found"


def op_read_storage():
    req = urllib.request.Request(f"{URL}/storage/v1/bucket",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        return f"list buckets → {len(data)} found"
    except:
        return "storage → error"


def op_read_members():
    limit = random.randint(2, 8)
    code, data = api_get(f"/rest/v1/members?select=id,name&limit={limit}&order=created_at.desc")
    count = len(data) if isinstance(data, list) else 0
    return f"recent members limit={limit} → {count}"


def op_read_events():
    limit = random.randint(1, 5)
    code, data = api_get(f"/rest/v1/events?select=id,title&limit={limit}&order=created_at.desc")
    count = len(data) if isinstance(data, list) else 0
    return f"recent events limit={limit} → {count}"


ALL_OPS = [op_read_random_table, op_count_table, op_auth_check, op_read_storage, op_read_members, op_read_events]

print(f"\n  Organic Activity — {URL}")
print(f"  Time: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n")

num_ops = random.randint(3, 5)
ops = random.sample(ALL_OPS, k=min(num_ops, len(ALL_OPS)))
random.shuffle(ops)

for i, op in enumerate(ops):
    if i > 0:
        time.sleep(random.uniform(0.5, 3.0))
    result = op()
    print(f"  [{i+1}/{len(ops)}] {result}")

print(f"\n  Done. {len(ops)} operations completed.\n")
