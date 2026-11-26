#!/usr/bin/env bash
# Builds a release APK or AAB of Raf, signed with your upload key. Runs in the
# Android toolchain image; from the repository root:
#
#   docker compose -f docker-compose.apk.yml run --rm build-apk                      # APK
#   OUTPUT_FORMAT=aab docker compose -f docker-compose.apk.yml run --rm build-apk    # for Play
#
# Settings come from mobile-react-native/.env.production; anything already in the
# environment wins. The project is copied out of /app first, so the build never
# writes node_modules or android/ into your folder.
set -euo pipefail

say() { printf '\n=== %s\n' "$1"; }

ENV_FILE="${ENV_FILE:-/app/.env.production}"
if [ -f "${ENV_FILE}" ]; then
  while IFS= read -r line || [ -n "${line}" ]; do
    case "${line}" in ''|'#'*) continue ;; esac
    name="${line%%=*}"
    [[ "${name}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [ -n "${!name+x}" ] && continue
    value="${line#*=}"
    value="${value%\"}"; value="${value#\"}"
    value="${value%\'}"; value="${value#\'}"
    export "${name}=${value}"
  done < "${ENV_FILE}"
  echo "loaded settings from ${ENV_FILE}"
fi

BUILD_TYPE="${BUILD_TYPE:-release}"
# apk installs straight onto a phone; aab is what Google Play accepts.
OUTPUT_FORMAT="${OUTPUT_FORMAT:-apk}"
case "${OUTPUT_FORMAT}" in
  apk|aab|both) ;;
  *) echo "OUTPUT_FORMAT must be apk, aab or both (got '${OUTPUT_FORMAT}')" >&2; exit 1 ;;
esac
# Phones from the last ten years are arm64; Play builds cover the older ones too.
if [ "${OUTPUT_FORMAT}" = "apk" ]; then ABIS="${ABIS:-arm64-v8a}"; else ABIS="${ABIS:-armeabi-v7a,arm64-v8a,x86_64}"; fi
OUTPUT_DIR="${OUTPUT_DIR:-/output}"
PACKAGE="app.evlog.raf"
KEYSTORE="${ANDROID_KEYSTORE_PATH:-/keystore/raf-upload.keystore}"
KEY_ALIAS="${ANDROID_KEY_ALIAS:-raf}"
STORE_PASSWORD="${ANDROID_KEYSTORE_PASSWORD:?set ANDROID_KEYSTORE_PASSWORD in .env.production}"
KEY_PASSWORD="${ANDROID_KEY_PASSWORD:-${STORE_PASSWORD}}"

if [ -z "${EXPO_PUBLIC_API_URL:-}" ]; then
  cat >&2 <<'MISSING'
EXPO_PUBLIC_API_URL is not set. It is built into the app, so a build without it
cannot reach the API, and only another build fixes that.

Use an address the phone itself can open: the Cloud Run address for a release,
or this computer's LAN IP on the same Wi-Fi (`localhost` means the phone):

  EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 \
    docker compose -f docker-compose.apk.yml run --rm build-apk

Check it in the phone's browser first: <address>/health should answer.
MISSING
  exit 1
fi
case "${EXPO_PUBLIC_API_URL}" in
  http://*) echo "warning: ${EXPO_PUBLIC_API_URL} is not HTTPS; fine on your Wi-Fi, never for Play." >&2 ;;
esac
[ -n "${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:-}" ] \
  || echo "warning: EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is empty, so Google sign-in is hidden." >&2

say "Preparing the project"
rm -rf /work && mkdir -p /work
# .env stays behind: it points at your computer, and only .env.production counts here.
tar -C /app --exclude=./node_modules --exclude=./android --exclude=./ios --exclude=./build \
  --exclude=./.expo --exclude=./.env -cf - . | tar -C /work -xf -
cd /work
export CI=1
npm ci --no-audit --no-fund

say "Generating the native Android project"
npx expo prebuild --platform android --clean --no-install

say "Installing the SDK packages the generated project asks for"
COMPILE_SDK="$(grep -oP 'compileSdkVersion\D*\K[0-9]+' android/build.gradle | head -1 || true)"
BUILD_TOOLS="$(grep -oP 'buildToolsVersion\D*\K[0-9.]+' android/build.gradle | head -1 || true)"
NDK_VERSION="$(grep -oP 'ndkVersion\D*\K[0-9.]+' android/build.gradle | head -1 || true)"
[ -n "${COMPILE_SDK}" ] && sdkmanager --install "platforms;android-${COMPILE_SDK}" > /dev/null || true
[ -n "${BUILD_TOOLS}" ] && sdkmanager --install "build-tools;${BUILD_TOOLS}" > /dev/null || true
[ -n "${NDK_VERSION}" ] && sdkmanager --install "ndk;${NDK_VERSION}" > /dev/null || true
echo "compileSdk=${COMPILE_SDK:-default} buildTools=${BUILD_TOOLS:-default} ndk=${NDK_VERSION:-default}"

say "Preparing the signing key"
mkdir -p "$(dirname "${KEYSTORE}")" "${OUTPUT_DIR}"
if [ ! -f "${KEYSTORE}" ]; then
  echo "no keystore at ${KEYSTORE}, generating one. Keep it: Play accepts updates only" >&2
  echo "from the key the first upload used." >&2
  keytool -genkeypair -v -keystore "${KEYSTORE}" -storetype PKCS12 -alias "${KEY_ALIAS}" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "${STORE_PASSWORD}" -keypass "${KEY_PASSWORD}" \
    -dname "CN=Raf, OU=Mobile, O=Raf, L=Istanbul, S=Istanbul, C=TR"
else
  echo "using ${KEYSTORE}"
fi
EXPECTED_SHA256="$(keytool -list -v -keystore "${KEYSTORE}" -alias "${KEY_ALIAS}" \
  -storepass "${STORE_PASSWORD}" | grep -oP 'SHA256: \K[0-9A-F:]+' | tr -d ':' | tr 'A-F' 'a-f')"

say "Fingerprints for Google Cloud console"
keytool -list -v -keystore "${KEYSTORE}" -alias "${KEY_ALIAS}" \
  -storepass "${STORE_PASSWORD}" | grep -E 'SHA1:|SHA256:' || true
echo "Register the SHA1 with package ${PACKAGE} in Raf's Android OAuth client,"
echo "or Google refuses the sign-in."

TYPE_CAP="${BUILD_TYPE^}"
TASKS=()
[ "${OUTPUT_FORMAT}" != "aab" ] && TASKS+=("assemble${TYPE_CAP}")
[ "${OUTPUT_FORMAT}" != "apk" ] && TASKS+=("bundle${TYPE_CAP}")

say "Building: ${TASKS[*]} (${ABIS})"
# The generated project signs release builds with the debug key; these
# properties make Gradle sign with the upload key instead.
cd android
./gradlew "${TASKS[@]}" --no-daemon --stacktrace \
  -PreactNativeArchitectures="${ABIS}" \
  -Pandroid.injected.signing.store.file="${KEYSTORE}" \
  -Pandroid.injected.signing.store.password="${STORE_PASSWORD}" \
  -Pandroid.injected.signing.key.alias="${KEY_ALIAS}" \
  -Pandroid.injected.signing.key.password="${KEY_PASSWORD}" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"
cd /work

# Fails the build when the output is not signed with the upload key.
check_signer() {
  local file="$1" signer
  signer="$(keytool -printcert -jarfile "${file}" | grep -oP 'SHA256: \K[0-9A-F:]+' | head -1 \
    | tr -d ':' | tr 'A-F' 'a-f')"
  if [ "${signer}" != "${EXPECTED_SHA256}" ]; then
    echo "${file} is not signed with ${KEYSTORE}" >&2
    exit 1
  fi
}

OUTPUTS=()
if [ "${OUTPUT_FORMAT}" != "aab" ]; then
  APK="$(find android/app/build/outputs/apk/"${BUILD_TYPE}" -name '*.apk' | head -1)"
  [ -n "${APK}" ] || { echo "gradle produced no apk" >&2; exit 1; }
  check_signer "${APK}"
  cp "${APK}" "${OUTPUT_DIR}/raf-${BUILD_TYPE}.apk"
  OUTPUTS+=("${OUTPUT_DIR}/raf-${BUILD_TYPE}.apk")
fi
if [ "${OUTPUT_FORMAT}" != "apk" ]; then
  AAB="$(find android/app/build/outputs/bundle/"${BUILD_TYPE}" -name '*.aab' | head -1)"
  [ -n "${AAB}" ] || { echo "gradle produced no aab" >&2; exit 1; }
  check_signer "${AAB}"
  cp "${AAB}" "${OUTPUT_DIR}/raf-${BUILD_TYPE}.aab"
  OUTPUTS+=("${OUTPUT_DIR}/raf-${BUILD_TYPE}.aab")
fi

say "Done"
ls -lh "${OUTPUTS[@]}"
echo "They are in apk-output/ at the repository root."
[ "${OUTPUT_FORMAT}" != "aab" ] && echo "Install the APK with:  adb install -r apk-output/raf-${BUILD_TYPE}.apk"
[ "${OUTPUT_FORMAT}" != "apk" ] && echo "Upload the AAB in Play Console; Play re-signs it with its own key."
exit 0
