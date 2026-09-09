const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

test("release ZIPs contain installable roots, stable Firefox metadata and matching checksums", () => {
    const result = spawnSync(
        "python3",
        [
            "-c",
            `
import hashlib, json, pathlib, subprocess, tempfile, zipfile
root = pathlib.Path.cwd()
with tempfile.TemporaryDirectory() as directory:
    subprocess.run(['python3', 'scripts/package-extension.py', '--output', directory], check=True)
    output = pathlib.Path(directory)
    source = json.loads((root / 'extension/manifest.json').read_text())
    archives = sorted(output.glob('*.zip'))
    assert len(archives) == 2
    checksums = dict(line.split('  ')[::-1] for line in (output / 'SHA256SUMS').read_text().splitlines())
    for archive in archives:
        assert hashlib.sha256(archive.read_bytes()).hexdigest() == checksums[archive.name]
        with zipfile.ZipFile(archive) as package:
            assert package.testzip() is None
            names = package.namelist()
            assert 'manifest.json' in names
            assert all(not part.startswith('.') for name in names for part in pathlib.PurePosixPath(name).parts)
            manifest = json.loads(package.read('manifest.json'))
            assert manifest['version'] == source['version']
            assert manifest['permissions'] == ['storage']
            for script in manifest['content_scripts']:
                assert all(name in names for name in script['js'] + script['css'])
            assert manifest['action']['default_popup'] in names
            assert all(name in names for name in manifest['icons'].values())
            if 'firefox' in archive.name:
                gecko = manifest['browser_specific_settings']['gecko']
                assert gecko['id'] == 'twitter-bird-is-back@soizo'
                assert gecko['strict_min_version'] == '140.0'
                assert manifest['browser_specific_settings']['gecko_android']['strict_min_version'] == '142.0'
                assert gecko['data_collection_permissions'] == {'required': ['none']}
            else:
                assert manifest == source
            for name in names:
                if name != 'manifest.json':
                    assert package.read(name) == (root / 'extension' / name).read_bytes()
`,
        ],
        { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
});
