import json
import urllib.request
from pathlib import Path

token = Path('/var/www/zuratax/shared/host-metrics.token').read_text().strip()
request = urllib.request.Request('http://127.0.0.1:9187/v1/storage', headers={'Authorization': 'Bearer ' + token})
with urllib.request.urlopen(request, timeout=5) as response:
    print(json.dumps(json.load(response), ensure_ascii=False))
