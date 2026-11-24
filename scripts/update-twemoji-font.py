"""Update the bundled Twemoji font from the latest upstream GitHub release."""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "10ta/twemoji-color-font"
API_BASE = "https://api.github.com/"
API_URL = f"{API_BASE}repos/{REPOSITORY}/releases/latest"
USER_AGENT = "TwitterBirdIsBack Twemoji updater"
MAX_FONT_SIZE = 10_000_000
TIMEOUT_SECONDS = 60
ATTEMPTS = 3
RETRY_DELAY_SECONDS = 5
MAX_RETRY_DELAY_SECONDS = 60
TRANSIENT_STATUSES = frozenset({429, 500, 502, 503, 504})


def github_token() -> str:
    """Return an API token so requests are not bound to the shared runner IP quota."""
    return os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""


def quota_exhausted(error: urllib.error.HTTPError) -> bool:
    remaining = (error.headers or {}).get("x-ratelimit-remaining")
    return error.code in (403, 429) and remaining == "0"


def is_transient(error: urllib.error.HTTPError) -> bool:
    if error.code in TRANSIENT_STATUSES:
        return True
    retry_after = (error.headers or {}).get("Retry-After")
    return error.code == 403 and bool(retry_after and retry_after.isdigit())


def retry_delay(error: urllib.error.HTTPError | None, attempt: int) -> int:
    retry_after = (error.headers or {}).get("Retry-After") if error is not None else None
    if retry_after and retry_after.isdigit():
        return min(int(retry_after), MAX_RETRY_DELAY_SECONDS)
    return min(RETRY_DELAY_SECONDS * 2 ** (attempt - 1), MAX_RETRY_DELAY_SECONDS)


def fetch(url: str, accept: str = "application/octet-stream") -> bytes:
    headers = {"Accept": accept, "User-Agent": USER_AGENT}
    token = github_token()
    if token and url.startswith(API_BASE):
        headers["Authorization"] = f"Bearer {token}"
        headers["X-GitHub-Api-Version"] = "2022-11-28"

    data = b""
    for attempt in range(1, ATTEMPTS + 1):
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # nosec B310
                data = response.read(MAX_FONT_SIZE + 1)
            break
        except urllib.error.HTTPError as error:
            if quota_exhausted(error):
                raise RuntimeError(
                    f"GitHub API quota exhausted for {url}; set GH_TOKEN to use an "
                    "authenticated request"
                ) from error
            if attempt == ATTEMPTS or not is_transient(error):
                raise
            delay = retry_delay(error, attempt)
            print(f"{url} failed with HTTP {error.code}; retrying in {delay}s", flush=True)
            time.sleep(delay)
        except urllib.error.URLError:
            if attempt == ATTEMPTS:
                raise
            delay = retry_delay(None, attempt)
            print(f"{url} failed to connect; retrying in {delay}s", flush=True)
            time.sleep(delay)

    if len(data) > MAX_FONT_SIZE:
        raise ValueError(f"Downloaded file is unexpectedly large: {url}")
    return data


def replace_version(path: Path, old: str, new: str) -> None:
    source = path.read_text()
    updated = source.replace(old, new)
    if source == updated:
        raise ValueError(f"Expected Twemoji version {old} in {path.relative_to(ROOT)}")
    path.write_text(updated)


def write_output(name: str, value: str) -> None:
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as stream:
            stream.write(f"{name}={value}\n")


def main() -> None:
    notice_path = ROOT / "extension/fonts/NOTICE.txt"
    notice = notice_path.read_text()
    current_match = re.search(r"^Twemoji (\d+(?:\.\d+)+) COLRv0", notice, re.M)
    if not current_match:
        raise ValueError("Cannot determine the bundled Twemoji version")
    current = current_match.group(1)

    release = json.loads(fetch(API_URL, "application/vnd.github+json"))
    tag = release.get("tag_name", "")
    if not re.fullmatch(r"v\d+(?:\.\d+)+", tag):
        raise ValueError(f"Unexpected upstream release tag: {tag!r}")
    latest = tag.removeprefix("v")
    write_output("version", latest)
    if latest == current:
        write_output("changed", "false")
        print(f"Twemoji {current} is already current")
        return
    version_key = lambda value: tuple(int(part) for part in value.split("."))
    if version_key(latest) <= version_key(current):
        raise ValueError(f"Latest upstream release {latest} is older than bundled {current}")

    expected_name = f"Twemoji-{latest}.ttf"
    assets = [asset for asset in release.get("assets", []) if asset.get("name") == expected_name]
    if len(assets) != 1:
        raise ValueError(f"Release {tag} must contain exactly one {expected_name} asset")
    asset_url = assets[0].get("browser_download_url", "")
    expected_prefix = f"https://github.com/{REPOSITORY}/releases/download/{tag}/"
    if not asset_url.startswith(expected_prefix):
        raise ValueError(f"Unexpected release asset URL: {asset_url}")

    font = fetch(asset_url)
    if len(font) < 100_000 or font[:4] not in (b"\x00\x01\x00\x00", b"OTTO"):
        raise ValueError("Downloaded asset is not a plausible OpenType font")
    digest = hashlib.sha256(font).hexdigest()

    fonts = ROOT / "extension/fonts"
    old_font = fonts / f"Twemoji-{current}.ttf"
    if not old_font.is_file():
        raise ValueError(f"Missing expected bundled font: {old_font.name}")
    old_font.unlink()
    (fonts / expected_name).write_bytes(font)

    license_base = f"https://raw.githubusercontent.com/{REPOSITORY}/{tag}"
    for filename in ("LICENSE-CC-BY.txt", "LICENSE-MIT.txt"):
        (fonts / filename).write_bytes(fetch(f"{license_base}/{filename}"))

    for relative in (
        "extension/manifest.json",
        "extension/twemoji.js",
        "README.md",
        "docs/development.md",
        "docs/source-review.md",
    ):
        replace_version(ROOT / relative, current, latest)

    notice_path.write_text(
        f"Twemoji {latest} COLRv0 font, distributed unchanged.\n"
        f"Source: https://github.com/{REPOSITORY}\n"
        f"Release: https://github.com/{REPOSITORY}/releases/tag/{tag}\n"
        f"File: {expected_name}\n"
        f"SHA-256: {digest}\n"
        "Artwork: Twitter, Inc. and other contributors, CC BY 4.0 (LICENSE-CC-BY.txt).\n"
        "Font build code: MIT (LICENSE-MIT.txt).\n"
    )
    write_output("changed", "true")
    print(f"Updated Twemoji {current} to {latest} ({digest})")


if __name__ == "__main__":
    main()
