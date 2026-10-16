import hashlib
import io
import json
import pathlib
import subprocess
import sys
import tarfile
import tempfile
import unittest


class ArtifactValidationTest(unittest.TestCase):
    def validate(self, change=None, entry='index.html', symlink=False, corrupt=False):
        with tempfile.TemporaryDirectory(prefix='zuratax-artifact-test-') as directory:
            root = pathlib.Path(directory)
            archive = root / 'frontend.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                info = tarfile.TarInfo(entry)
                if symlink:
                    info.type = tarfile.SYMTYPE
                    info.linkname = '/etc/passwd'
                    tar.addfile(info)
                else:
                    info.size = 4
                    tar.addfile(info, io.BytesIO(b'test'))
            manifest = {'id': '20261016-aaaaaaa-bbbbbbb',
                        'frontend': {'sha': 'a' * 40, 'origin': 'https://github.com/example/frontend.git'},
                        'backend': {'sha': 'b' * 40, 'origin': 'https://github.com/example/backend.git'},
                        'archive_sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}
            if change:
                change(manifest)
            if corrupt:
                archive.write_bytes(b'corrupted')
            (root / 'release.json').write_text(json.dumps(manifest))
            return subprocess.run([sys.executable, str(pathlib.Path(__file__).with_name('read-artifact.py')), str(root)], capture_output=True, text=True)

    def test_accepts_pinned_source_and_valid_archive(self):
        result = self.validate()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual('20261016-aaaaaaa-bbbbbbb', result.stdout.splitlines()[0])

    def test_rejects_corrupted_archive(self):
        self.assertNotEqual(0, self.validate(corrupt=True).returncode)

    def test_rejects_credentials_in_git_origin(self):
        self.assertNotEqual(0, self.validate(lambda item: item['frontend'].update(origin='https://secret@github.com/example/frontend.git')).returncode)

    def test_rejects_release_commit_mismatch(self):
        self.assertNotEqual(0, self.validate(lambda item: item.update(id='20261016-ccccccc-bbbbbbb')).returncode)

    def test_rejects_archive_traversal(self):
        self.assertNotEqual(0, self.validate(entry='../escape').returncode)

    def test_rejects_archive_symlink(self):
        self.assertNotEqual(0, self.validate(symlink=True).returncode)


if __name__ == '__main__':
    unittest.main()
