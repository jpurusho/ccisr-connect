#!/usr/bin/env python3
"""
Sync data between cloud and local Supabase for CCISR Connect.

Usage:
    python3 scripts/sync-data.py --from cloud --to local
    python3 scripts/sync-data.py --from local --to cloud

Environment variables (for cloud):
    SUPABASE_URL — cloud Supabase URL (https://jllqfhwuwoeuavaeoiie.supabase.co)
    SUPABASE_SERVICE_KEY — cloud service_role key

Local uses standard Supabase local dev keys automatically.
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

LOCAL_URL = "http://127.0.0.1:54321"
LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Tables from migrations (order matters for FK dependencies)
TABLES = [
    "members", "member_tags", "events", "event_recurrence_rules",
    "composed_instances", "dispatch_queue",
]


def get_creds(env):
    if env == "local":
        return LOCAL_URL, LOCAL_SERVICE_KEY
    url = os.environ.get("SUPABASE_URL", "https://jllqfhwuwoeuavaeoiie.supabase.co")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not key:
        print("ERROR: Set SUPABASE_SERVICE_KEY for cloud access")
        sys.exit(1)
    return url, key


def fetch_table(url, key, table):
    req = urllib.request.Request(
        f"{url}/rest/v1/{table}?select=*",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        if e.code in (404, 406):
            return []
        print(f"  WARNING: {table} — HTTP {e.code}")
        return []


def upsert_table(url, key, table, rows):
    if not rows:
        return 0
    req = urllib.request.Request(
        f"{url}/rest/v1/{table}",
        data=json.dumps(rows).encode(),
        method="POST",
        headers={
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        },
    )
    try:
        urllib.request.urlopen(req)
        return len(rows)
    except urllib.error.HTTPError as e:
        print(f"  WARNING: {table} upsert failed — HTTP {e.code}: {e.read().decode()[:100]}")
        return 0


def main():
    parser = argparse.ArgumentParser(description="Sync CCISR Connect data")
    parser.add_argument("--from", dest="source", required=True, choices=["cloud", "local"])
    parser.add_argument("--to", dest="target", required=True, choices=["cloud", "local"])
    parser.add_argument("--tables", nargs="*", help="Specific tables to sync")
    args = parser.parse_args()

    if args.source == args.target:
        print("ERROR: source and target must be different")
        sys.exit(1)

    src_url, src_key = get_creds(args.source)
    dst_url, dst_key = get_creds(args.target)
    tables = args.tables or TABLES

    print(f"\nSyncing {args.source} → {args.target}")
    print(f"  Source: {src_url}")
    print(f"  Target: {dst_url}\n")

    total = 0
    for table in tables:
        rows = fetch_table(src_url, src_key, table)
        if rows:
            count = upsert_table(dst_url, dst_key, table, rows)
            print(f"  {table}: {count} rows")
            total += count
        else:
            print(f"  {table}: empty")

    print(f"\nDone. {total} total rows synced.")


if __name__ == "__main__":
    main()
