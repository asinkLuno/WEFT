#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
deb_bundle_dir="$repo_root/src-tauri/target/release/bundle/deb"
arch_bundle_dir="$repo_root/src-tauri/target/release/bundle/arch"

install_package=true
update_debtap=false

usage() {
  printf '%s\n' \
    "Build WEFT from the current workspace and install it on Arch Linux." \
    "" \
    "Usage: scripts/install-arch.sh [options]" \
    "" \
    "Options:" \
    "  --no-install      Build and convert the package without installing it." \
    "  --update-debtap   Run 'sudo debtap --update' before conversion." \
    "  -h, --help        Show this help."
}

while (($# > 0)); do
  case "$1" in
    --no-install)
      install_package=false
      ;;
    --update-debtap)
      update_debtap=true
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if ((EUID == 0)); then
  printf '%s\n' \
    "Do not run this entire script with sudo." \
    "Run it as your normal user instead:" \
    "" \
    "  bash scripts/install-arch.sh" \
    "" \
    "The script requests sudo itself only when debtap or pacman needs it." >&2
  exit 1
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

if [[ ! -r /etc/arch-release ]]; then
  printf '%s\n' "This installer is intended for Arch Linux." >&2
  exit 1
fi

require_command cargo
require_command bsdtar
require_command debtap
require_command find
require_command mktemp
require_command pacman
require_command sed
require_command sort
require_command sudo
require_command yarn
require_command zstd

cd -- "$repo_root"

printf '%s\n' "Installing frontend dependencies..."
yarn install --frozen-lockfile

printf '%s\n' "Building the current WEFT workspace as a Debian bundle..."
cargo tauri build --bundles deb

deb_package="$(
  find "$deb_bundle_dir" -maxdepth 1 -type f -name '*.deb' \
    -printf '%T@ %p\n' |
    sort -nr |
    sed -n '1s/^[^ ]* //p'
)"

if [[ -z "$deb_package" || ! -f "$deb_package" ]]; then
  printf 'No Debian package found under %s\n' "$deb_bundle_dir" >&2
  exit 1
fi

mkdir -p -- "$arch_bundle_dir"

if [[ "$update_debtap" == true ]]; then
  printf '%s\n' "Updating the debtap database..."
  sudo debtap --update
fi

printf 'Converting %s to an Arch package...\n' "$deb_package"
debtap -Q -o "$arch_bundle_dir" "$deb_package"

arch_package="$(
  find "$arch_bundle_dir" -maxdepth 1 -type f -name '*.pkg.tar.*' \
    -printf '%T@ %p\n' |
    sort -nr |
    sed -n '1s/^[^ ]* //p'
)"

if [[ -z "$arch_package" || ! -f "$arch_package" ]]; then
  printf 'No Arch package found under %s\n' "$arch_bundle_dir" >&2
  exit 1
fi

if bsdtar -xOf "$arch_package" .PKGINFO | grep -qx 'depend = gtk'; then
  printf '%s\n' "Removing debtap's invalid Arch dependency: gtk"
  package_edit_dir="$(mktemp -d)"
  repacked_package="$arch_package.repacked"

  cleanup_package_edit() {
    rm -rf -- "$package_edit_dir"
    rm -f -- "$repacked_package"
  }
  trap cleanup_package_edit EXIT

  bsdtar -xf "$arch_package" -C "$package_edit_dir"
  sed -i '/^depend = gtk$/d' "$package_edit_dir/.PKGINFO"

  (
    cd -- "$package_edit_dir"
    find . -mindepth 1 -maxdepth 1 -printf '%P\0' |
      bsdtar --null -T - --format=gnutar -cf -
  ) | zstd -q -T0 -f -o "$repacked_package"

  mv -f -- "$repacked_package" "$arch_package"
  rm -rf -- "$package_edit_dir"
  trap - EXIT
fi

printf 'Arch package: %s\n' "$arch_package"

if [[ "$install_package" == true ]]; then
  printf '%s\n' "Installing WEFT with pacman..."
  sudo pacman -U --needed "$arch_package"
  printf '%s\n' "WEFT was installed successfully."
else
  printf '%s\n' "Skipping installation (--no-install)."
fi
