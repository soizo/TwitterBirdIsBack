"""Package browser-specific release ZIPs using only the Python standard library."""

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "releases")
    output = parser.parse_args().output
    source = ROOT / "extension"
    try:
        manifest = json.loads((source / "manifest.json").read_text())
    except (OSError, ValueError) as error:
        raise SystemExit(f"Cannot read extension manifest: {error}") from error
    version = manifest["version"]
    if not re.fullmatch(r"\d+(?:\.\d+){0,3}", version):
        raise ValueError("Invalid extension version")
    files = sorted(
        path
        for path in source.rglob("*")
        if path.is_file()
        and not any(part.startswith(".") for part in path.relative_to(source).parts)
    )
    output.mkdir(parents=True, exist_ok=True)
    checksums = []
    for browser in ["chrome", "firefox-unsigned"]:
        package_manifest = dict(manifest)
        if browser == "firefox-unsigned":
            package_manifest["browser_specific_settings"] = {
                "gecko": {
                    # Keep this ID across upgrades; signing checks its uniqueness.
                    "id": "twitter-bird-is-back@extensions.local",
                    "strict_min_version": "140.0",
                    "data_collection_permissions": {"required": ["none"]},
                },
                "gecko_android": {"strict_min_version": "142.0"},
            }
        archive = output / f"twitter-bird-is-back-{version}-{browser}.zip"
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as package:
            for path in files:
                name = path.relative_to(source).as_posix()
                data = (
                    (
                        json.dumps(package_manifest, ensure_ascii=False, indent=2)
                        + "\n"
                    ).encode()
                    if name == "manifest.json"
                    else path.read_bytes()
                )
                entry = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.external_attr = 0o100644 << 16
                package.writestr(entry, data)
        checksums.append(
            f"{hashlib.sha256(archive.read_bytes()).hexdigest()}  {archive.name}"
        )
        print(archive)
    (output / "SHA256SUMS").write_text("\n".join(checksums) + "\n")


if __name__ == "__main__":
    main()
