"""Document processing service for PDF, DOCX, TXT."""
import os
import io
import uuid
import aiofiles
from typing import Dict, Any, List, Optional
from pathlib import Path
import fitz  # PyMuPDF
from docx import Document
try:
    from charset_normalizer import detect as _chardet_detect
except Exception:
    try:
        import chardet

        def _chardet_detect(raw_data):
            detected = chardet.detect(raw_data)
            encoding = detected.get('encoding')
            confidence = detected.get('confidence')
            if encoding:
                return {'encoding': encoding, 'language': detected.get('language') or '', 'confidence': confidence}
            return {'encoding': 'utf-8', 'language': '', 'confidence': 0}
    except Exception:
        def _chardet_detect(raw_data):
            return {'encoding': 'utf-8', 'language': '', 'confidence': 0}
from langdetect import detect
from ..core.config import settings


class DocumentProcessor:
    """Process PDF, DOCX, and TXT files."""
    
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.temp_dir = Path(settings.TEMP_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    async def save_upload(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Save uploaded file."""
        file_id = str(uuid.uuid4())
        ext = os.path.splitext(filename)[1].lower().lstrip('.')
        secure_filename = f"{file_id}.{ext}"
        file_path = self.upload_dir / secure_filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        return {
            "job_id": file_id,
            "filename": filename,
            "file_size": len(file_content),
            "file_type": ext,
            "file_path": str(file_path),
            "status": "uploaded"
        }
    
    async def extract_text(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """Extract text from document."""
        try:
            if file_type == 'txt':
                return await self._extract_txt(file_path)
            elif file_type == 'pdf':
                return await self._extract_pdf(file_path)
            elif file_type == 'docx':
                return await self._extract_docx(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            raise Exception(f"Text extraction failed: {str(e)}")
    
    async def _extract_txt(self, file_path: str) -> Dict[str, Any]:
        """Extract text from TXT file."""
        async with aiofiles.open(file_path, 'rb') as f:
            raw_data = await f.read()
        
        # Detect encoding
        detected = _chardet_detect(raw_data)
        encoding = detected.get('encoding') or 'utf-8'
        
        try:
            text = raw_data.decode(encoding)
        except:
            text = raw_data.decode('utf-8', errors='ignore')
        
        # Detect language
        try:
            language = detect(text) if len(text.strip()) > 50 else 'unknown'
        except:
            language = 'unknown'
        
        return {
            "text": text,
            "page_count": 1,
            "word_count": len(text.split()),
            "char_count": len(text),
            "extraction_method": "direct",
            "warnings": [],
            "metadata": {"language": language, "encoding": encoding}
        }
    
    async def _extract_pdf(self, file_path: str) -> Dict[str, Any]:
        """Extract text from PDF file."""
        try:
            doc = fitz.open(file_path)
            text_parts = []
            warnings = []
            page_count = len(doc)
            
            for page_num in range(page_count):
                page = doc[page_num]
                text = page.get_text()
                if text.strip():
                    text_parts.append(text)
                else:
                    warnings.append(f"Page {page_num + 1} appears to be empty or scanned")
            
            doc.close()
            full_text = '\n\n'.join(text_parts)
            
            if not full_text.strip():
                warnings.append("No text could be extracted. Document may be scanned - OCR not implemented in this version.")
                return {
                    "text": "",
                    "page_count": page_count,
                    "word_count": 0,
                    "char_count": 0,
                    "extraction_method": "pymupdf",
                    "warnings": warnings,
                    "metadata": {"language": "unknown"}
                }
            
            try:
                language = detect(full_text) if len(full_text.strip()) > 50 else 'unknown'
            except:
                language = 'unknown'
            
            return {
                "text": full_text,
                "page_count": page_count,
                "word_count": len(full_text.split()),
                "char_count": len(full_text),
                "extraction_method": "pymupdf",
                "warnings": warnings,
                "metadata": {"language": language}
            }
        except Exception as e:
            raise Exception(f"PDF extraction failed: {str(e)}")
    
    async def _extract_docx(self, file_path: str) -> Dict[str, Any]:
        """Extract text from DOCX file."""
        try:
            doc = Document(file_path)
            text_parts = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            # Extract tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = []
                    for cell in row.cells:
                        if cell.text.strip():
                            row_text.append(cell.text.strip())
                    if row_text:
                        text_parts.append(' | '.join(row_text))
            
            full_text = '\n\n'.join(text_parts)
            
            try:
                language = detect(full_text) if len(full_text.strip()) > 50 else 'unknown'
            except:
                language = 'unknown'
            
            return {
                "text": full_text,
                "page_count": None,
                "word_count": len(full_text.split()),
                "char_count": len(full_text),
                "extraction_method": "python-docx",
                "warnings": [],
                "metadata": {"language": language, "paragraph_count": len(doc.paragraphs)}
            }
        except Exception as e:
            raise Exception(f"DOCX extraction failed: {str(e)}")
    
    def clean_text(self, text: str) -> str:
        """Clean extraction artifacts without altering meaning."""
        # Remove excessive whitespace
        import re
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        return text.strip()
    
    def validate_text(self, text: str, min_length: int = 50) -> Dict[str, Any]:
        """Validate extracted text."""
        if not text or not text.strip():
            return {"valid": False, "reason": "Empty text"}
        
        word_count = len(text.split())
        if word_count < min_length:
            return {"valid": False, "reason": f"Insufficient text. Need at least {min_length} words, got {word_count}"}
        
        return {"valid": True, "reason": "OK", "word_count": word_count}
