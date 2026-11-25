FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY requirements.txt .
RUN pip install --retries 10 --timeout 120 -r requirements.txt

# Download the OCR models once, into the image (not at every start).
# Only these files decide which models are used, so code changes
# elsewhere don't trigger a re-download.
COPY ocr.py receipt_parser.py lexicon.py label_parser.py ./
RUN python -c "import ocr; ocr.warm_up()"

COPY . .
RUN useradd --create-home reader
USER reader

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD python -c "import urllib.request as u; u.urlopen('http://localhost:8000/health', timeout=4)"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
