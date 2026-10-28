#!/usr/bin/env python3
"""
Simple static file server for hshh (沪上呼呼·幼儿非遗启蒙).
Serves the SPA with CORS and JSON API capabilities.
"""
import http.server
import json
import os
import sys
import urllib.parse

PORT = int(os.environ.get("PORT", "6392"))
DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # API: health check
        if parsed.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "app": "hshh"}).encode())
            return

        # API: product data
        if parsed.path == "/api/products":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                sys.path.insert(0, DIR)
                from js import data
                products = {}
                for pid in data.PRODUCT_IDS:
                    products[pid] = data.products[pid]
                self.wfile.write(json.dumps(products, ensure_ascii=False).encode())
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode())
            return

        # SPA: serve index.html for all non-file routes
        file_path = os.path.join(DIR, parsed.path.lstrip("/"))
        if parsed.path == "/" or not os.path.isfile(file_path):
            parsed_path = parsed.path.lstrip("/")
            if parsed_path and os.path.isfile(os.path.join(DIR, parsed_path)):
                return super().do_GET()
            # Serve index.html for SPA routing
            self.path = "/index.html"

        return super().do_GET()

    def log_message(self, format, *args):
        print(f"[hshh] {args[0]} {args[1]} {args[2]}")


if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[hshh] Server running on http://0.0.0.0:{PORT}")
    print(f"[hshh] Serving: {DIR}")
    server.serve_forever()
