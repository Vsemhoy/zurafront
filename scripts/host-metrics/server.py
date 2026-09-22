"""Loopback-only storage metrics for co-located application backends."""
import hmac
import json
import os
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

TOKEN = Path(os.environ['METRICS_TOKEN_FILE']).read_text().strip()
if not TOKEN:
    raise RuntimeError('Empty metrics token')
VOLUME = os.environ.get('METRICS_VOLUME', '/var/www')
cached = None
cached_at = 0


def snapshot():
    global cached, cached_at
    if cached is not None and time.monotonic() - cached_at < 5:
        return cached
    disk = os.statvfs(VOLUME)
    total = disk.f_blocks * disk.f_frsize
    free = disk.f_bfree * disk.f_frsize
    available = disk.f_bavail * disk.f_frsize
    used = total - free
    pressure = 100 * (total - available) / total
    inode_free = round(100 * disk.f_favail / disk.f_files, 2) if disk.f_files else None
    status = 'critical' if pressure >= 90 or available < 5 * 1024**3 or (inode_free is not None and inode_free < 5) else 'warning' if pressure >= 75 else 'ok'
    cached = {'host': 'main', 'checked_at': datetime.now(timezone.utc).isoformat(), 'volumes': [{
        'name': 'Основной диск', 'total_bytes': total, 'used_bytes': used,
        'available_bytes': available, 'reserved_bytes': free - available,
        'used_percent': round(100 * used / total, 2),
        'inodes_available_percent': inode_free, 'status': status,
    }]}
    cached_at = time.monotonic()
    return cached


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + TOKEN):
            self.reply(401, {'message': 'Unauthorized'})
        elif self.path != '/v1/storage':
            self.reply(404, {'message': 'Not found'})
        else:
            try:
                self.reply(200, snapshot())
            except OSError:
                self.reply(503, {'message': 'Storage metrics unavailable'})

    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(3)


if __name__ == '__main__':
    HTTPServer(('127.0.0.1', 9187), Handler).serve_forever()
