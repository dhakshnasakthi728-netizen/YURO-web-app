from app.main import app
from fastapi.testclient import TestClient
import io
from docx import Document

c = TestClient(app)

# Test DOCX
doc = Document()
doc.add_paragraph("This is a test document created for testing. It has multiple sentences with natural human writing style.")
doc.save('test.docx')

with open('test.docx', 'rb') as f:
    r = c.post('/api/upload', files={'file': ('test.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')})
    print('DOCX upload:', r.status_code)
    if r.status_code == 200:
        job = r.json()['job_id']
        r2 = c.post('/api/extract', json={'job_id': job})
        print('DOCX extract:', r2.status_code)
        if r2.status_code == 200:
            print(r2.json()['text'][:60])
            r3 = c.post('/api/detect/ai', json={'text': r2.json()['text'], 'mode': 'ai'})
            print('DOCX detect:', r3.status_code)
            if r3.status_code == 200:
                print(r3.json()['classification'])

# Test TXT
with open('test.txt', 'w') as f:
    f.write("This is a simple text file. It contains human written content for testing purposes.")
with open('test.txt', 'rb') as f:
    r = c.post('/api/upload', files={'file': ('test.txt', f, 'text/plain')})
    print('TXT upload:', r.status_code)
    if r.status_code == 200:
        job = r.json()['job_id']
        r2 = c.post('/api/extract', json={'job_id': job})
        print('TXT extract:', r2.status_code)
        if r2.status_code == 200:
            print(r2.json()['text'][:40])
            r3 = c.post('/api/detect/ai', json={'text': r2.json()['text'], 'mode': 'ai'})
            print('TXT detect:', r3.status_code)
            print(r3.json()['classification'] if r3.status_code==200 else r3.text)
