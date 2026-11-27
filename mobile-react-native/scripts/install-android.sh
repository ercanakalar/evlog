#!/usr/bin/env bash
# Installs a Raf build on the phone plugged in over USB, removing the installed
# copy first: Android refuses an update signed with a different key.
#
#   bash mobile-react-native/scripts/install-android.sh              # apk-output/raf-release.apk
#   bash mobile-react-native/scripts/install-android.sh path/to.apk
#
# Removing the app deletes its data on the phone (you sign in again). With more
# than one phone connected, pick one with ANDROID_SERIAL=<serial from adb devices>.
set -euo pipefail

PACKAGE="app.evlog.raf"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APK="${1:-${ROOT}/apk-output/raf-release.apk}"

if ! command -v adb > /dev/null; then
  echo "adb is not installed. On Ubuntu or Debian:  sudo apt install adb" >&2
  exit 1
fi
if [ ! -f "${APK}" ]; then
  echo "No APK at ${APK}. Build one first:  bash mobile-react-native/scripts/build-android.sh" >&2
  exit 1
fi

# Phones that are connected and have allowed USB debugging.
mapfile -t DEVICES < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')
if [ -z "${ANDROID_SERIAL:-}" ]; then
  case "${#DEVICES[@]}" in
    0)
      echo "No phone found. Plug it in with USB debugging on and accept the prompt on it." >&2
      adb devices | tail -n +2 | grep -E 'unauthorized|offline' >&2 \
        && echo "(unauthorized: unlock the phone and allow USB debugging)" >&2
      exit 1 ;;
    1) export ANDROID_SERIAL="${DEVICES[0]}" ;;
    *)
      echo "More than one phone is connected; choose one:" >&2
      for serial in "${DEVICES[@]}"; do echo "  ANDROID_SERIAL=${serial} bash $0" >&2; done
      exit 1 ;;
  esac
fi
echo "Phone: ${ANDROID_SERIAL} ($(adb shell getprop ro.product.model | tr -d '\r'))"

echo "Installing $(basename "${APK}")..."
if ! output="$(adb install -r "${APK}" 2>&1)"; then
  echo "${output}"
  # Signed with another key than the installed copy: only a fresh install works.
  if ! grep -qE 'INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match' <<< "${output}"; then
    exit 1
  fi
  echo "The installed Raf has another signing key; removing it (its data on the phone too)..."
  adb uninstall "${PACKAGE}"
  adb install "${APK}"
else
  echo "${output}"
fi
echo "Done. Open Raf on the phone."
