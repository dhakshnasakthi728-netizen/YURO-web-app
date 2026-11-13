"""Document API endpoints."""
import logging
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from typing import Optional

logger = logging.getLogger(__name__)
from ..schemas.document import (
    DocumentUploadResponse, TextExtractionRequest, TextExtractionResponse,
    DetectionRequest, DetectionResponse, HumanizationRequest, HumanizationResponse,
    ComparisonRequest, ComparisonResponse, ExportRequest, ExportResponse,
    WritingAnalysisRequest, WritingAnalysisResponse
)
from ..services.document_processor import DocumentProcessor
from ..services.detector import AIDetector
from ..services.humanizer import Humanizer
from ..services.comparison import TextComparator
from ..services.writing_analyzer import WritingAnalyzer
from ..services.export_service import ExportService
from ..core.config import settings

router = APIRouter()
processor = DocumentProcessor()
detector = AIDetector()
humanizer = Humanizer()
comparator = TextComparator()
analyzer = WritingAnalyzer()
exporter = ExportService()

# In-memory job storage (use DB in production)
jobs = {}


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a document."""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Validate file extension
        ext = os.path.splitext(file.filename)[1].lower().lstrip('.')
        if ext not in settings.ALLOWED_FILE_TYPES:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed. Allowed: {', '.join(settings.ALLOWED_FILE_TYPES)}")
        
        # Read file
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Validate size
        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large ({len(content) // (1024*1024)}MB). Max size: {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB")
        
        # Save file
        result = await processor.save_upload(content, file.filename)
        jobs[result['job_id']] = result
        
        return DocumentUploadResponse(
            job_id=result['job_id'],
            filename=result['filename'],
            file_size=result['file_size'],
            file_type=result['file_type'],
            status=result['status'],
            message="File uploaded successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/extract", response_model=TextExtractionResponse)
async def extract_text(request: TextExtractionRequest):
    """Extract text from uploaded document."""
    try:
        job = jobs.get(request.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found. Please upload the file again.")
        
        extraction_result = await processor.extract_text(job['file_path'], job['file_type'])
        cleaned_text = processor.clean_text(extraction_result['text'])
        validation = processor.validate_text(cleaned_text)
        
        if not validation['valid']:
            raise HTTPException(status_code=400, detail=validation['reason'])
        
        jobs[request.job_id]['extracted_text'] = cleaned_text
        jobs[request.job_id]['status'] = 'extracted'
        
        return TextExtractionResponse(
            job_id=request.job_id,
            text=cleaned_text,
            page_count=extraction_result.get('page_count'),
            word_count=extraction_result['word_count'],
            char_count=extraction_result['char_count'],
            extraction_method=extraction_result['extraction_method'],
            warnings=extraction_result.get('warnings', []),
            metadata=extraction_result.get('metadata', {})
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.post("/detect/ai", response_model=DetectionResponse)
async def detect_ai(request: DetectionRequest):
    """Analyse text for AI-writing patterns."""
    try:
        result = await detector.detect_ai_writing(request.text)
        return DetectionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect/human", response_model=DetectionResponse)
async def detect_human(request: DetectionRequest):
    """Analyse text for human-writing patterns."""
    try:
        result = await detector.detect_human_writing(request.text)
        return DetectionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/humanize", response_model=HumanizationResponse)
async def humanize(request: HumanizationRequest):
    """Humanize text."""
    try:
        result = await humanizer.humanize_text(
            request.text,
            request.mode,
            request.preserve_voice_sample,
            request.check_facts
        )
        return HumanizationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(
            "Humanization request failed (provider=%s, model=%s)",
            getattr(settings, "HUMANIZATION_PROVIDER", ""),
            getattr(settings, "OLLAMA_MODEL", ""),
        )
        detail = str(e)
        if "timed out" in detail.lower():
            detail = f"Humanization timed out (model may be slow or loading). {detail}"
        elif "connect" in detail.lower():
            detail = f"Cannot reach Ollama. Ensure it is running and the model is available. {detail}"
        raise HTTPException(status_code=500, detail=f"Humanization failed: {detail}")


@router.post("/compare", response_model=ComparisonResponse)
async def compare(request: ComparisonRequest):
    """Compare original and rewritten text."""
    try:
        result = comparator.compare(request.original_text, request.rewritten_text)
        return ComparisonResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/writing", response_model=WritingAnalysisResponse)
async def analyze_writing(request: WritingAnalysisRequest):
    """Analyze writing quality."""
    try:
        result = analyzer.analyze(request.text)
        return WritingAnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export", response_model=ExportResponse)
async def export_document(request: ExportRequest):
    """Export document."""
    try:
        result = await exporter.export_document(
            request.text,
            request.format,
            request.title,
            request.include_annotations
        )
        return ExportResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/download/{filename}")
async def download_export(filename: str):
    """Download exported file."""
    try:
        filepath = exporter.get_file_path(filename)
        return FileResponse(
            path=str(filepath),
            filename=filename,
            as_attachment=True
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/document/{job_id}")
async def delete_document(job_id: str):
    """Delete uploaded document."""
    try:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Delete files
        if os.path.exists(job['file_path']):
            os.remove(job['file_path'])
        
        del jobs[job_id]
        return {"message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "detector_model": settings.DETECTION_MODEL,
        "humanization_provider": settings.HUMANIZATION_PROVIDER
    }
