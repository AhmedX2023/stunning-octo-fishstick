import sys
sys.path.insert(0, '/opt/render/.local/lib/python3.11/site-packages')

import os
PORT = int(os.environ.get('PORT', 8000))

import uvicorn
uvicorn.run("app.main:app", host="0.0.0.0", port=PORT)