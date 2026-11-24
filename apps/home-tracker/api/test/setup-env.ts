// Runs before every e2e file, before AppModule is imported.
process.env.NODE_ENV = 'test';
// Set by global-setup: a fresh schema created for this run.
process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
process.env.PUBLIC_API_URL = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret-0123';
process.env.OCR_SERVICE_URL = 'http://127.0.0.1:4599';
process.env.OCR_SERVICE_TOKEN = 'test-ocr-token';
process.env.OCR_CALLBACK_SECRET = 'test-ocr-callback-secret-0123456789abcd';
process.env.OCR_TIMEOUT_MS = '5000';
process.env.RENT_RECEIPTS_TO_VERIFY = '2';
process.env.UPLOAD_DIR = './uploads-test';
process.env.SAHIBINDEN_API_URL = '';
process.env.SAHIBINDEN_API_KEY = '';
