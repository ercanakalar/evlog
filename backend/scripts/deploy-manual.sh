#!/usr/bin/env bash
# Deploys the Raf API to Cloud Run: builds one image, runs the database
# migrations with it as a Cloud Run job, then rolls the service onto it.
#
# Run scripts/setup-project.sh once per Google Cloud project first. Then, from
# the backend/ folder, for every release:
#
#   ./scripts/deploy-manual.sh
#
# Settings come from .env.production (copy .env.production.example).
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
if [ ! -f "${ENV_FILE}" ]; then
  echo "${ENV_FILE} not found. Copy the template and fill it in:" >&2
  echo "  cp .env.production.example ${ENV_FILE}" >&2
  exit 1
fi
set -a; source "${ENV_FILE}"; set +a

say() { printf '\n=== %s\n' "$1"; }
warn() { printf '\n!!! %s\n' "$1" >&2; }

# Checked before anything is built: the API refuses to start in production
# without these (src/config/env.validation.ts), which would otherwise only show
# once the new revision failed to boot.
: "${PROJECT_ID:?set PROJECT_ID in ${ENV_FILE}}"
: "${REGION:?set REGION in ${ENV_FILE}}"
: "${SERVICE:?set SERVICE in ${ENV_FILE}: the Cloud Run service name}"
: "${JOB:?set JOB in ${ENV_FILE}: the Cloud Run migration job name}"
: "${MAIL_FROM:?set MAIL_FROM in ${ENV_FILE}, e.g. Raf <no-reply@example.com>}"
: "${LEGAL_OPERATOR:?set LEGAL_OPERATOR in ${ENV_FILE}: legal name and address, shown on /privacy and /terms}"
: "${SUPPORT_EMAIL:?set SUPPORT_EMAIL in ${ENV_FILE}: shown on the legal pages}"

REPO="raf-tracker"
BUCKET="${PROJECT_ID}-raf-tracker-uploads"
# The user the image runs as (Dockerfile); it has to own the uploads mount.
APP_UID=10001

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"
# Cloud Run's address for the service is known before it exists.
PUBLIC_API_URL="${PUBLIC_API_URL:-https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app}"

# The receipt reader runs inside the API and needs about 1 GB on its own; the
# API and the bucket mount share the rest. With 2Gi it ran out while reading.
CPU="${CPU:-2}"
MEMORY="${MEMORY:-4Gi}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-2}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"
# Tagged with the commit it was built from, so every deploy can be traced back.
TAG="$(git rev-parse --short HEAD)"
git diff --quiet HEAD -- . || TAG="${TAG}-dirty"
IMAGE="${REGISTRY}/api:${TAG}"

# Settings the API reads that are left out when not set, so it keeps its default.
OPTIONAL_SETTINGS=(CORS_ORIGINS GOOGLE_CLIENT_IDS JWT_ACCESS_TTL JWT_REFRESH_TTL_DAYS
                   MAX_UPLOAD_MB OCR_TIMEOUT_MS)

say "1/6 Checking the settings and the project"
# The API's own rules (src/config/env.validation.ts) on the settings the service
# will get, so a bad value stops the deploy here rather than after the build, as
# a revision that cannot start. Secrets not in the env file get a stand-in.
if [ ! -d node_modules/zod ]; then
  warn "Run npm install in backend/ first: the settings are checked with the API's own code."
  exit 1
fi
settings=(NODE_ENV=production PUBLIC_API_URL="${PUBLIC_API_URL}" UPLOAD_DIR=/mnt/uploads
          MAIL_FROM="${MAIL_FROM}" LEGAL_OPERATOR="${LEGAL_OPERATOR}" SUPPORT_EMAIL="${SUPPORT_EMAIL}"
          OCR_THREADS="${OCR_THREADS:-${CPU}}"
          JWT_ACCESS_SECRET="stand-in-for-the-generated-secret-0123456789"
          DATABASE_URL="${DATABASE_URL:-postgresql://stored@secret/raf}"
          SMTP_URL="${SMTP_URL:-smtp://stored.secret}")
for name in "${OPTIONAL_SETTINGS[@]}"; do
  if [ -n "${!name:-}" ]; then settings+=("${name}=${!name}"); fi
done
if ! env -i PATH="${PATH}" "${settings[@]}" node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
     --input-type=module -e '
  const { envSchema } = await import("./src/config/env.validation.ts");
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    for (const issue of result.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }'; then
  warn "The API would refuse to start with these settings; fix them in ${ENV_FILE}."
  exit 1
fi
echo "  the API accepts the settings"

if ! gcloud artifacts repositories describe "${REPO}" --location="${REGION}" \
     --project "${PROJECT_ID}" >/dev/null 2>&1 \
   || ! gcloud storage buckets describe "gs://${BUCKET}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  warn "The image registry ${REPO} or the bucket gs://${BUCKET} does not exist yet.
Run ./scripts/setup-project.sh first."
  exit 1
fi
echo "  service ${SERVICE} at ${PUBLIC_API_URL}, runs as ${SERVICE_ACCOUNT}"

say "2/6 Storing the secrets"
secret_exists() {
  gcloud secrets describe "$1" --project "${PROJECT_ID}" >/dev/null 2>&1
}
# Creates the secret, or adds a version when the env file holds another value,
# so a value changed there reaches the service. Old versions are kept:
#   gcloud secrets versions list NAME --project PROJECT_ID
store_secret() {
  local name="$1" value="$2" current
  if ! secret_exists "${name}"; then
    printf '%s' "${value}" | gcloud secrets create "${name}" --project "${PROJECT_ID}" \
      --replication-policy=automatic --data-file=- >/dev/null
    echo "  created ${name}"
  elif current="$(gcloud secrets versions access latest --secret "${name}" \
                    --project "${PROJECT_ID}" 2>/dev/null)" && [ "${current}" = "${value}" ]; then
    echo "  ${name} is current"
  else
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --project "${PROJECT_ID}" \
      --data-file=- >/dev/null
    echo "  updated ${name} from ${ENV_FILE}"
  fi
}
allow_read() {
  gcloud secrets add-iam-policy-binding "$1" --project "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role=roles/secretmanager.secretAccessor >/dev/null
}

missing=()
for name in DATABASE_URL SMTP_URL; do
  if [ -n "${!name:-}" ]; then
    store_secret "${name}" "${!name}"
  elif secret_exists "${name}"; then
    echo "  ${name} not in ${ENV_FILE}; using the stored one"
  else
    missing+=("${name}")
  fi
done
# Generated, never written down; replacing it signs everybody out.
if ! secret_exists JWT_ACCESS_SECRET; then
  openssl rand -base64 48 | tr -d '\n' | gcloud secrets create JWT_ACCESS_SECRET \
    --project "${PROJECT_ID}" --replication-policy=automatic --data-file=- >/dev/null
  echo "  generated JWT_ACCESS_SECRET"
fi
if [ "${#missing[@]}" -gt 0 ]; then
  warn "Set these in ${ENV_FILE} and run again: ${missing[*]}"
  exit 1
fi
for name in DATABASE_URL SMTP_URL JWT_ACCESS_SECRET; do allow_read "${name}"; done
echo "  ${SERVICE_ACCOUNT} can read them"

say "3/6 Building and pushing ${IMAGE}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
docker build --platform linux/amd64 --target runtime -t "${IMAGE}" .
docker push "${IMAGE}"

say "4/6 Pointing the migration job at the new image"
# The same image as the API, with prisma instead of the server. Migrations run
# once per deploy, before any instance of the new revision starts.
# prisma.config.ts connects to Neon's direct address, not the pooled one.
gcloud run jobs deploy "${JOB}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest" \
  --command=/app/node_modules/.bin/prisma \
  --args=migrate,deploy \
  --max-retries=0 \
  --task-timeout=10m

say "5/6 Running the migrations"
gcloud run jobs execute "${JOB}" --region="${REGION}" --project "${PROJECT_ID}" --wait

say "6/6 Deploying the API"
# Plain settings go through a YAML file: --set-env-vars splits on commas, and
# GOOGLE_CLIENT_IDS and CORS_ORIGINS are comma-separated. Values are single-quoted
# so they stay strings; a ' inside one is doubled.
ENV_VARS_FILE="$(mktemp)"
trap 'rm -f "${ENV_VARS_FILE}"' EXIT
yaml_env() {
  local q="'"
  case "$2" in *$'\n'*) warn "$1 spans more than one line"; exit 1 ;; esac
  printf "%s: '%s'\n" "$1" "${2//$q/$q$q}" >> "${ENV_VARS_FILE}"
}
yaml_env NODE_ENV production
yaml_env PUBLIC_API_URL "${PUBLIC_API_URL}"
yaml_env UPLOAD_DIR /mnt/uploads
yaml_env MAIL_FROM "${MAIL_FROM}"
yaml_env LEGAL_OPERATOR "${LEGAL_OPERATOR}"
yaml_env SUPPORT_EMAIL "${SUPPORT_EMAIL}"
yaml_env OCR_THREADS "${OCR_THREADS:-${CPU}}"
for name in "${OPTIONAL_SETTINGS[@]}"; do
  if [ -n "${!name:-}" ]; then yaml_env "${name}" "${!name}"; fi
done

# --no-cpu-throttling: receipts are read after the upload has been answered, and
# Cloud Run all but stops the CPU between requests without it. The instance is
# billed while it is up, and still scales to zero when idle.
# Receipt photos live in the bucket, so they outlast the instance that took them.
# --timeout=3600s: the app's live-updates WebSocket counts as one request and is
# cut when it times out (the app then reconnects); ordinary requests end long before.
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --allow-unauthenticated \
  --execution-environment=gen2 \
  --env-vars-file="${ENV_VARS_FILE}" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_ACCESS_SECRET=JWT_ACCESS_SECRET:latest,SMTP_URL=SMTP_URL:latest" \
  --add-volume=name=uploads,type=cloud-storage,bucket="${BUCKET}",mount-options="uid=${APP_UID};gid=${APP_UID}" \
  --add-volume-mount=volume=uploads,mount-path=/mnt/uploads \
  --min-instances="${MIN_INSTANCES}" \
  --max-instances="${MAX_INSTANCES}" \
  --cpu="${CPU}" \
  --memory="${MEMORY}" \
  --cpu-boost \
  --no-cpu-throttling \
  --timeout=3600s

# Traffic pinned to a named revision means the new one serves nobody.
TRAFFIC="$(gcloud run services describe "${SERVICE}" --region "${REGION}" \
  --project "${PROJECT_ID}" --format='value(spec.traffic)')"
case "${TRAFFIC}" in
  *latestRevision*) ;;
  *) warn "Traffic is pinned to a revision, so this deploy serves nobody: ${TRAFFIC}
Move it with:
  gcloud run services update-traffic ${SERVICE} --to-latest --region ${REGION} --project ${PROJECT_ID}" ;;
esac

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" \
  --project "${PROJECT_ID}" --format='value(status.url)')"
say "Deployed: ${URL}"
[ "${URL}" = "${PUBLIC_API_URL}" ] || warn "PUBLIC_API_URL is ${PUBLIC_API_URL}, but the service answers at ${URL}."
curl -fsS "${URL}/health" && echo || echo "health check did not pass; see the logs:
  gcloud run services logs read ${SERVICE} --region ${REGION} --project ${PROJECT_ID}"
