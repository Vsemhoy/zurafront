import hashlib, json, pathlib, re, subprocess, sys

root = pathlib.Path('/var/www/zuratax').resolve()
mode = sys.argv[1]
release = pathlib.Path(sys.argv[2]).resolve()
assert release.parent == root / 'releases', 'Release must be inside releases'
manifest = json.loads((release / 'release.json').read_text())
legacy = manifest.get('layout') == 'legacy-overlay'
assert re.fullmatch(r'legacy-[0-9]{8}' if legacy else r'[0-9]{8}-[a-f0-9]{7}-[a-f0-9]{7}', manifest['id'])
assert release.name == manifest['id']
def git(directory, *args):
    return subprocess.check_output(['git', '-C', str(directory), *args], text=True).strip()
for kind in ([] if legacy else ['frontend', 'backend']):
    repo = release / kind
    assert git(repo, 'rev-parse', 'HEAD') == manifest[kind]['sha'], kind + ' SHA mismatch'
    assert not git(repo, 'status', '--porcelain'), kind + ' working tree is not clean'
    for name, expected in manifest[kind]['files'].items():
        assert not pathlib.PurePosixPath(name).is_absolute() and '..' not in pathlib.PurePosixPath(name).parts
        data = (repo / name).read_bytes()
        assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == expected, 'Source mismatch: ' + kind + '/' + name
for file in manifest.get('legacy_files', []):
    assert hashlib.sha256((release / file['path']).read_bytes()).hexdigest() == file['sha256'], 'Legacy source changed: ' + file['path']
for file in manifest['dist_files']:
    assert not pathlib.PurePosixPath(file['path']).is_absolute() and '..' not in pathlib.PurePosixPath(file['path']).parts
    assert hashlib.sha256((release / 'frontend/dist' / file['path']).read_bytes()).hexdigest() == file['sha256'], 'Build mismatch: ' + file['path']
assert (release / 'backend/.env').resolve() == root / 'shared/.env'
assert (release / 'backend/public/storage').resolve() == root / 'shared/storage/app/public'
if mode == 'live':
    assert (root / 'current').resolve() == release
    assert not (root / 'shared/storage/framework/down').exists()
    for pathname, expected in [('/', 200), ('/content/diagrams', 200), ('/vendor/drawio-32.4.1/js/app.min.js', 200), ('/api/auth/me', 401), ('/api/agent/spec', 401)]:
        status = subprocess.check_output(['curl', '--silent', '--show-error', '--max-time', '15', '--output', '/dev/null', '--write-out', '%{http_code}', '--header', 'Host: zuratax.com', '--header', 'Accept: application/json', 'http://127.0.0.1:8080' + pathname], text=True)
        assert status == str(expected), pathname + ': ' + status
    for unit in ['nginx', 'php8.4-fpm', 'zuratax-filer-preview.service']:
        assert subprocess.check_output(['systemctl', 'is-active', unit], text=True).strip() == 'active', unit
if mode == 'receipt':
    result = manifest['receipt'] if legacy else {'frontend': manifest['frontend']['sha'], 'backend': manifest['backend']['sha'],
              'backend_files': manifest['backend']['files'], 'frontend_files': manifest['dist_files']}
    result.update({'layout': 'legacy-overlay' if legacy else 'releases-v1', 'release': manifest['id']})
    print(json.dumps(result, indent=2))
else:
    print(json.dumps({'verified': True, 'mode': mode, 'release': manifest['id'], 'backend_sha': manifest['backend']['sha'], 'frontend_sha': manifest['frontend']['sha'], 'dist_files': len(manifest['dist_files'])}))
