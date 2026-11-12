#!/usr/bin/env python3
"""Copy and hash a pristine MCM installation; never overwrite an existing run."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

EXPECTED = 'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b'


def prepare(source, destination):
    source = source.resolve(strict=True)
    destination = destination.resolve()
    if destination == source or source in destination.parents:
        raise ValueError('Reference destination must be outside the original installation')
    if hashlib.sha256((source / 'mcm.exe').read_bytes()).hexdigest() != EXPECTED:
        raise ValueError('Unknown executable: reference addresses require re-analysis')
    files = []
    for path in sorted(source.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'Refusing symlink in reference installation: {path}')
        if path.is_file():
            data = path.read_bytes()
            files.append({'path': path.relative_to(source).as_posix(), 'bytes': len(data),
                          'sha256': hashlib.sha256(data).hexdigest()})
    destination.mkdir(parents=True, exist_ok=False)
    shutil.copytree(source, destination / 'game')
    for item in files:
        copied = destination / 'game' / item['path']
        if hashlib.sha256(copied.read_bytes()).hexdigest() != item['sha256']:
            raise ValueError(f'Copy verification failed: {copied}')
    manifest = {'schemaVersion': 1, 'source': str(source), 'files': files,
                'scope': 'Pristine file snapshot; runtime, settings and gameplay repeatability not established'}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    manifest = prepare(args.source, args.destination)
    print(f"Copied and verified {len(manifest['files'])} files to {args.destination}")
