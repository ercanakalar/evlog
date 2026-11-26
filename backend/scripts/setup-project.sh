#!/usr/bin/env bash
# Prepares a Google Cloud project for scripts/deploy-manual.sh: the APIs, the
# image registry, the receipt photo bucket, the token signing key and the IAM
# that ties them together. Run it once per project, from the backend/ folder:
#
#   ./scripts/setup-project.sh
#
# It is safe to run again: what exists is left alone.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
if [ ! -f "${ENV_FILE}" ]; then
  echo "${ENV_FILE} not found. Copy the template and fill it in:" >&2
  echo "  cp .env.production.example ${ENV_FILE}" >&2
  exit 1
fi
set -a; source "${ENV_FILE}"; set +a

: "${PROJECT_ID:?set PROJECT_ID in ${ENV_FILE}}"
: "${REGION:?set REGION in ${ENV_FILE}}"

REPO="raf-tracker"
BUCKET="${PROJECT_ID}-raf-tracker-uploads"

say() { printf '\n=== %s\n' "$1"; }
warn() { printf '\n!!! %s\n' "$1" >&2; }

say "1/6 Enabling the APIs"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com storage.googleapis.com iam.googleapis.com \
  --project "${PROJECT_ID}"

say "2/6 The identity the API runs as"
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"
echo "  ${SERVICE_ACCOUNT}"

say "3/6 The image registry"
if gcloud artifacts repositories describe "${REPO}" --location="${REGION}" \
     --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "  ${REPO} already exists in ${REGION}"
else
  gcloud artifacts repositories create "${REPO}" --repository-format=docker \
    --location="${REGION}" --project "${PROJECT_ID}" --description="Raf API images"
  echo "  created ${REPO}"
fi

say "4/6 The receipt photo bucket"
# Mounted into the API at /mnt/uploads, so photos outlast the instance that
# received them.
if gcloud storage buckets describe "gs://${BUCKET}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "  gs://${BUCKET} already exists"
else
  gcloud storage buckets create "gs://${BUCKET}" --location="${REGION}" \
    --project "${PROJECT_ID}" --uniform-bucket-level-access
  echo "  created gs://${BUCKET}"
fi
# objectAdmin: the API writes photos and deletes them with the receipt or account.
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" --role=roles/storage.objectAdmin \
  --project "${PROJECT_ID}" >/dev/null
echo "  ${SERVICE_ACCOUNT} can read and write it"
case "${REGION}" in
  us-west1 | us-central1 | us-east1) ;;
  *) echo "  note: the free 5 GB of storage covers only us-west1, us-central1 and"
     echo "        us-east1; in ${REGION} this bucket is billed from the first byte." ;;
esac

say "5/6 The token signing key"
# Generated once and left alone: replacing it signs everybody out.
if gcloud secrets describe JWT_ACCESS_SECRET --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "  JWT_ACCESS_SECRET already exists; left alone"
else
  openssl rand -base64 48 | tr -d '\n' | gcloud secrets create JWT_ACCESS_SECRET \
    --project "${PROJECT_ID}" --replication-policy=automatic --data-file=- >/dev/null
  echo "  created JWT_ACCESS_SECRET"
fi
gcloud secrets add-iam-policy-binding JWT_ACCESS_SECRET --project "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role=roles/secretmanager.secretAccessor >/dev/null

say "6/6 Letting you deploy as that identity"
# Without it the first deploy fails with "Permission 'iam.serviceaccounts.actAs' denied".
DEPLOYER="$(gcloud config get-value account 2>/dev/null)"
if [ -n "${DEPLOYER}" ] && [ "${DEPLOYER}" != "(unset)" ]; then
  gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
    --member="user:${DEPLOYER}" --role=roles/iam.serviceAccountUser \
    --project "${PROJECT_ID}" >/dev/null
  echo "  ${DEPLOYER} can deploy services that run as ${SERVICE_ACCOUNT}"
else
  warn "No active gcloud account, so this was skipped. Run 'gcloud auth login' and
run this script again, or the first deploy fails with \"Permission 'iam.serviceaccounts.actAs' denied\"."
fi

say "Project ready"
echo "DATABASE_URL and SMTP_URL are stored from ${ENV_FILE} by the deploy, which"
echo "also creates the Cloud Run service and job:"
echo "  ./scripts/deploy-manual.sh"
