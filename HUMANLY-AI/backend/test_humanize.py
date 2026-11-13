from fastapi.testclient import TestClient
from app.main import app
import traceback

c = TestClient(app)
text = '''Artificial intelligence has transformed the way people interact with technology in recent years. From virtual assistants to recommendation systems, AI-powered tools have become increasingly integrated into daily life. However, as these systems become more sophisticated, questions about transparency, bias, and accountability have come to the forefront. Many researchers argue that developing responsible AI requires collaboration between technologists, policymakers, and ethicists to ensure that these powerful tools serve the broader interests of society.'''
try:
    resp = c.post('/api/humanize', json={'text': text, 'mode': 'natural_conversational', 'check_facts': True})
    print(resp.status_code)
    print(resp.text)
except Exception as e:
    traceback.print_exc()
