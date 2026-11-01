#!/usr/bin/env bash
# Vendor the api-standards Spectral ruleset at a tag (ADR-1019).
#
#   scripts/vendor-api-standards.sh v0.1.0
#
# Copies spectral/api-standards.yaml from randallard/api-standards at <tag>, byte for byte, to
# .spectral/api-standards.yaml, and records the tag and its SHA-256 in .spectral/api-standards.lock.
# CI's api-lint job checks the copy against the lock before it lints. It also writes a starter
# .spectral.yaml if there isn't one. Re-run with a newer tag to bump, then review the diff.
set -euo pipefail

tag="${1:?usage: scripts/vendor-api-standards.sh <tag, e.g. v0.1.0>}"
case "$tag" in
  v[0-9]*.[0-9]*.[0-9]*) ;;
  *) echo "vendor-api-standards: '$tag' isn't a release tag (vX.Y.Z); pin a tag, never a branch" >&2; exit 1 ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
url="https://raw.githubusercontent.com/randallard/api-standards/${tag}/spectral/api-standards.yaml"

mkdir -p .spectral
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fsSL -o "$tmp" "$url"
install -m 0644 "$tmp" .spectral/api-standards.yaml
sha="$(sha256sum .spectral/api-standards.yaml | cut -d' ' -f1)"
cat > .spectral/api-standards.lock <<EOF
# Written by scripts/vendor-api-standards.sh (ADR-1019). Don't edit by hand: re-run the script.
tag=${tag}
sha256=${sha}
source=${url}
EOF

if [ ! -f .spectral.yaml ]; then
  cat > .spectral.yaml <<'EOF'
# The api-standards ruleset, vendored at the tag in .spectral/api-standards.lock (ADR-1019).
extends:
  - ./.spectral/api-standards.yaml

# A departure from a rule goes here, scoped to what it covers, with the reason in a comment.
# Never turn a rule off for the whole document.
# overrides:
#   - files:
#       - "openapi.yaml#/components/schemas/ImportRow"
#     rules:
#       as-property-camel-case: off # mirrors an external file format field for field; approved <date>
EOF
  echo "vendor-api-standards: wrote .spectral.yaml"
fi

echo "vendor-api-standards: .spectral/api-standards.yaml at ${tag} (sha256 ${sha})"
