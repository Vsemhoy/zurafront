import hashlib, json, pathlib, re, sys, tarfile

packet = pathlib.Path(sys.argv[1]).resolve()
manifest = json.loads((packet / 'release.json').read_text())
assert re.fullmatch(r'[0-9]{8}-[a-f0-9]{7}-[a-f0-9]{7}', manifest['id']), 'Invalid release id'
for kind in ['frontend', 'backend']:
    assert re.fullmatch(r'[a-f0-9]{40}', manifest[kind]['sha'])
    assert re.fullmatch(r'https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?', manifest[kind]['origin'])
assert manifest['id'].endswith(manifest['frontend']['sha'][:7] + '-' + manifest['backend']['sha'][:7])
archive = packet / 'frontend.tar.gz'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == manifest['archive_sha256'], 'Artifact checksum mismatch'
with tarfile.open(archive) as tar:
    for item in tar:
        name = pathlib.PurePosixPath(item.name)
        assert not name.is_absolute() and '..' not in name.parts and (item.isfile() or item.isdir()), 'Unsafe archive entry'
print(manifest['id'])
for kind in ['frontend', 'backend']:
    print(manifest[kind]['origin'])
    print(manifest[kind]['sha'])
