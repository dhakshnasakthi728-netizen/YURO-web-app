# HUMANLY AI - Advanced AI Text Detection & Humanization Platform

A complete, production-quality web application for AI text detection, humanization, and document analysis.

## Features

### Core Features
- **AI Writing Detector** - Analyze text for AI-writing patterns with transparent, evidence-based reporting
- **Text Humanizer** - Transform text into natural writing while preserving meaning, facts, and citations
- **Document Workspace** - Upload and process PDF, DOCX, and TXT files
- **Writing Quality Analysis** - Get insights on readability, structure, and clarity
- **Side-by-Side Comparison** - Compare original and rewritten versions
- **Export System** - Export to PDF, DOCX, and TXT formats

### Key Principles
- **No 100% Claims** - AI detection accuracy cannot be guaranteed
- **Transparency** - All results include limitations and uncertainty
- **Privacy First** - Documents processed with care, no unnecessary logging
- **Fact Preservation** - Humanization preserves numbers, citations, and key facts
- **Ethical** - Never accuses individuals, prioritizes reducing false positives

## Architecture

### Frontend
- React 18 + TypeScript
- Vite build tool
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls

### Backend
- Python + FastAPI
- Pydantic for validation
- PyMuPDF, python-docx for document processing
- Transformers for AI detection
- Ollama/OpenAI for humanization
- ReportLab, python-docx for export

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- (Optional) Ollama for local AI models

### Backend Setup
```bash
cd humanly-ai/backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
python run.py
```

Backend runs at http://localhost:8000
API docs at http://localhost:8000/docs

### Frontend Setup
```bash
cd humanly-ai/frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at http://localhost:5173

## Environment Variables

See `.env.example` files in backend and frontend directories for required configuration.

## Testing

### Backend Tests
```bash
cd humanly-ai/backend
pytest
```

### Frontend
```bash
cd humanly-ai/frontend
npm run build
```

## Important Notes

- AI detection models need to be downloaded on first use
- For local humanization, install [Ollama](https://ollama.ai/) and pull a model
- API keys are optional - the app works with local models
- Detection results are probabilistic and should be interpreted with caution

## License

This project is for educational and research purposes. Use responsibly.
