"""Export service for PDF, DOCX, TXT."""
import os
import uuid
from pathlib import Path
from typing import Optional
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from docx import Document
from docx.shared import Inches
from ..core.config import settings


class ExportService:
    """Export documents in various formats."""
    
    def __init__(self):
        self.export_dir = Path("./exports")
        self.export_dir.mkdir(parents=True, exist_ok=True)
    
    async def export_document(
        self, 
        text: str, 
        format: str, 
        title: Optional[str] = None,
        include_annotations: bool = False
    ) -> Dict[str, Any]:
        """Export document."""
        file_id = str(uuid.uuid4())
        title = title or "document"
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')
        
        if format == "txt":
            filename = f"{safe_title}_{file_id}.txt"
            filepath = self.export_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(text)
            file_size = os.path.getsize(filepath)
            return {
                "download_url": f"/api/export/download/{filename}",
                "filename": filename,
                "file_size": file_size,
                "format": format
            }
        elif format == "pdf":
            filename = f"{safe_title}_{file_id}.pdf"
            filepath = self.export_dir / filename
            doc = SimpleDocTemplate(str(filepath), pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            if title:
                title_style = ParagraphStyle(
                    'CustomTitle',
                    parent=styles['Heading1'],
                    fontSize=18,
                    spaceAfter=30,
                )
                story.append(Paragraph(title, title_style))
                story.append(Spacer(1, 0.2*inch))
            
            # Split into paragraphs
            for para in text.split('\n\n'):
                if para.strip():
                    story.append(Paragraph(para.replace('\n', '<br/>'), styles['BodyText']))
                    story.append(Spacer(1, 0.1*inch))
            
            doc.build(story)
            file_size = os.path.getsize(filepath)
            return {
                "download_url": f"/api/export/download/{filename}",
                "filename": filename,
                "file_size": file_size,
                "format": format
            }
        elif format == "docx":
            filename = f"{safe_title}_{file_id}.docx"
            filepath = self.export_dir / filename
            doc = Document()
            
            if title:
                doc.add_heading(title, 0)
            
            for para in text.split('\n\n'):
                if para.strip():
                    doc.add_paragraph(para)
            
            doc.save(str(filepath))
            file_size = os.path.getsize(filepath)
            return {
                "download_url": f"/api/export/download/{filename}",
                "filename": filename,
                "file_size": file_size,
                "format": format
            }
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def get_file_path(self, filename: str):
        """Get file path for download."""
        filepath = self.export_dir / filename
        if not filepath.exists():
            raise FileNotFoundError("File not found")
        return filepath
