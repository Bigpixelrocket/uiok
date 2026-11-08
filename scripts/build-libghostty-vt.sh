#!/usr/bin/env bash
#
# Builds the terminal's WebAssembly from source into
# src/terminal/ghostty/vendor/:
#
#   ghostty-vt.wasm       libghostty-vt at the Ghostty commit in vendor/VERSION
#   ghostty-effects.wasm  the callback trampolines in ghostty-effects.zig
#
# Zig comes from mise at the version pinned in the repository's mise.toml and
# mise.lock. Every build starts from an empty local Zig cache, so two runs at
# the same pin give byte-identical artifacts.
#
# Adapted from T3 Code's apps/web/scripts/build-libghostty-wasm.sh and
# ghostty-write-pty.zig (https://github.com/pingdotgg/t3code), MIT,
# Copyright (c) 2026 T3 Tools Inc.; the full notice is in
# ../src/terminal/ghostty/LICENSE.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENDOR_DIR="$(cd "${SCRIPT_DIR}/../src/terminal/ghostty/vendor" && pwd)"
GHOSTTY_REVISION="$(tr -d '[:space:]' < "${VENDOR_DIR}/VERSION")"
GHOSTTY_SOURCE_DIR="${GHOSTTY_SOURCE_DIR:-${HOME}/.cache/uiok/ghostty-${GHOSTTY_REVISION:0:12}}"

log() {
  printf '[libghostty-vt] %s\n' "$*"
}

die() {
  printf '[libghostty-vt] error: %s\n' "$*" >&2
  exit 1
}

[[ "${GHOSTTY_REVISION}" =~ ^[0-9a-f]{40}$ ]] ||
  die "vendor/VERSION must hold a full 40-character Ghostty commit, found '${GHOSTTY_REVISION}'"

resolve_zig() {
  command -v mise >/dev/null 2>&1 ||
    die "mise is required to provide Zig; install it with 'brew install mise'"
  # Ghostty's build.zig.zon names the minimum Zig; mise.toml pins it.
  ZIG="$(cd "${REPO_DIR}" && mise which zig 2>/dev/null)" ||
    die "Zig from mise.toml is not installed; run 'mise install' in ${REPO_DIR}"
  [[ -x "${ZIG}" ]] || die "mise reports Zig at ${ZIG}, but it is not executable"
  ZIG_VERSION="$("${ZIG}" version)"
}

ensure_ghostty_source() {
  command -v git >/dev/null 2>&1 || die "missing required command: git"
  local fresh=false
  if [[ ! -d "${GHOSTTY_SOURCE_DIR}/.git" ]]; then
    mkdir -p "$(dirname "${GHOSTTY_SOURCE_DIR}")"
    log "cloning Ghostty into ${GHOSTTY_SOURCE_DIR}"
    git clone --quiet --filter=blob:none --no-checkout https://github.com/ghostty-org/ghostty.git \
      "${GHOSTTY_SOURCE_DIR}"
    fresh=true
  fi

  # A fresh clone has no work tree yet, and a reused one may sit on an
  # earlier pin; either way, check out this one.
  if [[ "${fresh}" == true ||
    "$(git -C "${GHOSTTY_SOURCE_DIR}" rev-parse HEAD 2>/dev/null || echo none)" != "${GHOSTTY_REVISION}" ]]; then
    log "checking out Ghostty ${GHOSTTY_REVISION}"
    git -C "${GHOSTTY_SOURCE_DIR}" fetch --quiet --depth=1 origin "${GHOSTTY_REVISION}"
    git -C "${GHOSTTY_SOURCE_DIR}" checkout --quiet --detach "${GHOSTTY_REVISION}"
  fi

  local actual
  actual="$(git -C "${GHOSTTY_SOURCE_DIR}" rev-parse HEAD)"
  [[ "${actual}" == "${GHOSTTY_REVISION}" ]] ||
    die "expected Ghostty ${GHOSTTY_REVISION}, found ${actual}"
  [[ -z "$(git -C "${GHOSTTY_SOURCE_DIR}" status --porcelain --untracked-files=no)" ]] ||
    die "${GHOSTTY_SOURCE_DIR} has local changes; reset it or point GHOSTTY_SOURCE_DIR elsewhere"
}

resolve_zig
ensure_ghostty_source

build_root="$(mktemp -d)"
trap 'rm -rf "${build_root}"' EXIT

log "building Ghostty ${GHOSTTY_REVISION} with Zig ${ZIG_VERSION} for wasm32-freestanding"
(
  cd "${GHOSTTY_SOURCE_DIR}"
  # The revision rides along as semver build metadata, so the artifact names
  # its own source through ghostty_build_info(); runtimeAbi.test.ts checks it
  # against vendor/VERSION.
  "${ZIG}" build \
    --cache-dir "${build_root}/ghostty-cache" \
    -Demit-lib-vt \
    -Dtarget=wasm32-freestanding \
    -Doptimize=ReleaseSmall \
    -Dstrip=true \
    -Dlib-version-string="0.1.0-dev+${GHOSTTY_REVISION}" \
    -p "${build_root}/ghostty"
)

log "building the callback trampolines"
"${ZIG}" build-exe \
  "${SCRIPT_DIR}/ghostty-effects.zig" \
  --cache-dir "${build_root}/effects-cache" \
  -target wasm32-freestanding \
  -O ReleaseSmall \
  -fstrip \
  -fno-entry \
  -rdynamic \
  -femit-bin="${build_root}/ghostty-effects.wasm"

install -m 0644 "${build_root}/ghostty/bin/ghostty-vt.wasm" "${VENDOR_DIR}/ghostty-vt.wasm"
install -m 0644 "${build_root}/ghostty-effects.wasm" "${VENDOR_DIR}/ghostty-effects.wasm"

for artifact in ghostty-vt.wasm ghostty-effects.wasm; do
  log "wrote ${artifact}: $(wc -c < "${VENDOR_DIR}/${artifact}" | tr -d ' ') bytes, sha256 $(shasum -a 256 "${VENDOR_DIR}/${artifact}" | cut -d' ' -f1)"
done
