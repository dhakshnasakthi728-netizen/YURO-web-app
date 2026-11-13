# HUMANLY AI Backend

Advanced AI Text Detection & Humanization Platform - Backend API

## Features

- Document upload (PDF, DOCX, TXT)
- Text extraction with PyMuPDF, python-docx
- AI text detection using transformers models
- Text humanization with Ollama/OpenAI support
- Original vs rewritten comparison
- Writing quality analysis
- Document export (PDF, DOCX, TXT)
- Comprehensive API documentation

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` with your configuration

5. Run the server:
```bash
python run.py
```

Or with uvicorn:
```bash
uvicorn app.main:app --reload
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

```bash
pytest
```

## Notes

- For AI detection, install a model: `pip install transformers torch`
- For local humanization, install and run [Ollama](https://ollama.ai/) with a model like `llama3.1:8b`
- Never commit actual API keys - use environment variables
- Detection results are not 100% accurate - always read limitations
