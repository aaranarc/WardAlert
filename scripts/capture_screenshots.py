import os
import time
from playwright.sync_api import sync_playwright

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUTPUT_DIR = "/Users/aaranachaurasia/Desktop/WardAlert/docs/screenshots"

PAGES = [
    {"url": "http://localhost:3000/", "filename": "dashboard.png", "delay": 4},
    {"url": "http://localhost:3000/drain-health", "filename": "drain_health.png", "delay": 2},
    {"url": "http://localhost:3000/alerts", "filename": "alerts.png", "delay": 2},
    {"url": "http://localhost:3000/about", "filename": "about.png", "delay": 2},
]

def capture():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        for item in PAGES:
            target_path = os.path.join(OUTPUT_DIR, item["filename"])
            print(f"Navigating to {item['url']}...")
            page.goto(item["url"], wait_until="networkidle", timeout=30000)
            time.sleep(item["delay"])
            page.screenshot(path=target_path, full_page=False)
            print(f"Captured: {target_path} ({os.path.getsize(target_path)} bytes)")

        browser.close()

if __name__ == "__main__":
    capture()
