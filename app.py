import re
import urllib.parse
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to avoid hammering the Google feed URL and to make requests fast
cache = {
    "data": None,
    "last_fetched": None
}

def clean_html_for_text(html_content):
    """
    Strips HTML tags and normalizes whitespace to create a clean text snippet.
    """
    if not html_content:
        return ""
    # Replace block-level tags or break tags with spaces/newlines to keep formatting readable
    text = re.sub(r'<br\s*/?>', '\n', html_content)
    text = re.sub(r'</p>|</div>|</li>', '\n', text)
    # Strip all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities if any (like &amp; or &gt;)
    import html
    text = html.unescape(text)
    # Normalize multiple whitespace/newlines
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n+', '\n', text)
    return text.strip()

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        xml_data = response.content
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        updates = []
        entry_index = 0
        
        for entry in root.findall('atom:entry', ns):
            entry_title = entry.find('atom:title', ns)
            date_str = entry_title.text.strip() if entry_title is not None else "Unknown Date"
            
            entry_id_elem = entry.find('atom:id', ns)
            entry_id = entry_id_elem.text.strip() if entry_id_elem is not None else f"entry_{entry_index}"
            
            updated_elem = entry.find('atom:updated', ns)
            updated_str = updated_elem.text.strip() if updated_elem is not None else ""
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Split the entry's content by <h3> to separate individual updates
            parts = re.split(r'<h3[^>]*>', content_html, flags=re.IGNORECASE)
            
            # If there's content before any <h3>, treat it as general update
            first_part = parts[0].strip()
            item_index = 0
            
            if first_part:
                # Strip leading/trailing empty HTML tags if any
                clean_first = clean_html_for_text(first_part)
                if clean_first:
                    updates.append({
                        "id": f"{entry_id}_{item_index}",
                        "date": date_str,
                        "updated_raw": updated_str,
                        "category": "General",
                        "body_html": first_part,
                        "body_text": clean_first
                    })
                    item_index += 1
            
            for part in parts[1:]:
                sub_parts = re.split(r'</h3>', part, maxsplit=1, flags=re.IGNORECASE)
                if len(sub_parts) == 2:
                    category = sub_parts[0].strip()
                    body = sub_parts[1].strip()
                else:
                    category = "General"
                    body = part.strip()
                
                clean_body = clean_html_for_text(body)
                if clean_body:
                    updates.append({
                        "id": f"{entry_id}_{item_index}",
                        "date": date_str,
                        "updated_raw": updated_str,
                        "category": category,
                        "body_html": body,
                        "body_text": clean_body
                    })
                    item_index += 1
            
            entry_index += 1
            
        return updates, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Simple rate-limiting/caching
    import time
    now = time.time()
    
    if force_refresh or not cache["data"] or not cache["last_fetched"] or (now - cache["last_fetched"] > 60):
        data, error = fetch_and_parse_feed()
        if error:
            # If we have cached data, fall back to it, otherwise return error
            if cache["data"]:
                return jsonify({
                    "success": True,
                    "data": cache["data"],
                    "warning": f"Could not fetch latest updates (using cached copy): {error}"
                })
            return jsonify({
                "success": False,
                "error": f"Failed to fetch release notes: {error}"
            }), 500
        
        cache["data"] = data
        cache["last_fetched"] = now
        
    return jsonify({
        "success": True,
        "data": cache["data"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
