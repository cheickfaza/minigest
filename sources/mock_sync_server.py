# -*- coding: utf-8 -*-
"""Petit serveur mock pour tester la synchronisation MiniGest :
GET  /clients  -> renvoie {"clients": [...]} (dernier état reçu)
POST /clients  -> stocke le corps JSON renvoyé par l'application
Usage : python3 mock_sync_server.py [port]   (défaut 8798)
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8798
STORE = Path('/tmp/minigest_sync_state.json')


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        data = json.loads(STORE.read_text()) if STORE.exists() else {'clients': []}
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length)
        STORE.write_text(raw.decode('utf-8'))
        body = b'{"ok": true}'
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    print('Mock sync sur http://localhost:' + str(PORT) + '/clients')
    HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
