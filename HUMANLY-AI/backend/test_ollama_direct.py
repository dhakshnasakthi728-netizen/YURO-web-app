import httpx
import asyncio
import json

async def test():
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                'http://localhost:11434/api/generate',
                json={
                    "model": "qwen3:8b",
                    "prompt": "Rewrite this to be more natural: Hello world, this is a test.",
                    "stream": False,
                    "options": {"num_predict": 50}
                }
            )
            print(response.status_code)
            data = response.json()
            print(data.get('response', '')[:100])
    except Exception as e:
        print('ERR', e)

asyncio.run(test())
