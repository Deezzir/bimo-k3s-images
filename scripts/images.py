#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "images.yaml"
REQUIRED_FIELDS = ("name", "context", "dockerfile", "image")


def load_images():
    with CATALOG.open() as file:
        images = json.load(file)["images"]
    names = set()
    for image in images:
        if set(image) != set(REQUIRED_FIELDS):
            raise ValueError(f"invalid catalog entry: {image}")
        if image["name"] in names:
            raise ValueError(f"duplicate image name: {image['name']}")
        names.add(image["name"])
        if not (ROOT / image["context"]).is_dir():
            raise ValueError(f"missing context: {image['context']}")
        if not (ROOT / image["dockerfile"]).is_file():
            raise ValueError(f"missing Dockerfile: {image['dockerfile']}")
    return images


def print_matrix(images):
    print(json.dumps({"include": images}, separators=(",", ":")))


def main():
    try:
        images = load_images()
        command = sys.argv[1:]
        if command == ["validate"]:
            return
        if len(command) == 2 and command[0] == "matrix":
            selected = images if command[1] == "all" else [image for image in images if image["name"] == command[1]]
            if not selected:
                raise ValueError(f"unknown image: {command[1]}")
            print_matrix(selected)
            return
        if len(command) == 3 and command[0] == "changed":
            changed = subprocess.check_output(
                ["git", "diff", "--name-only", command[1], command[2]], cwd=ROOT, text=True
            ).splitlines()
            selected = [
                image for image in images
                if any(path == image["context"] or path.startswith(f"{image['context']}/") for path in changed)
            ]
            print_matrix(selected)
            return
        raise ValueError("usage: scripts/images.py validate | matrix <name|all> | changed <base> <head>")
    except (KeyError, ValueError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
        print(f"error: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
