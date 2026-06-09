#!/bin/sh
# Seed db.json on first run (volume is empty)
if [ ! -f /data/db.json ]; then
  cp /seed/db.json /data/db.json
fi
exec json-server --watch /data/db.json --host 0.0.0.0 --port 3001
