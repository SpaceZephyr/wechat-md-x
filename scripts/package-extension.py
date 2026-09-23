"""Build a Chrome Web Store ZIP with exactly one root manifest."""
import json
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    "manifest.json",
    "background.js",
    "wechat.js",
    "x.js",
    "x-main.js",
    "ui.js",
    "sanitize.js",
    "lib/marked.min.js",
    "lib/LICENSE.marked.md",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
)


def main():
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    name = f"wechat-md-x-{manifest['version']}"
    output = ROOT / "dist"
    unpacked = output / name
    archive = output / f"{name}.zip"
    if unpacked.exists():
        shutil.rmtree(unpacked)
    unpacked.mkdir(parents=True)
    for relative in FILES:
        source = ROOT / relative
        destination = unpacked / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=9) as packed:
        for relative in FILES:
            packed.write(unpacked / relative, relative)
    with ZipFile(archive) as packed:
        names = packed.namelist()
        assert names.count("manifest.json") == 1
        assert len(names) == len(FILES) and set(names) == set(FILES)
        assert packed.testzip() is None
        assert json.loads(packed.read("manifest.json"))["version"] == manifest["version"]
    print(f"{archive} ({len(names)} files, one root manifest)")


if __name__ == "__main__":
    main()
