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

def verify_and_capture():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        
        # 1. Desktop Test (1440x900)
        print("=== Testing Desktop (1440x900) ===")
        context_desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context_desktop.new_page()

        for item in PAGES:
            print(f"Checking {item['url']} on desktop...")
            page.goto(item["url"], wait_until="networkidle", timeout=30000)
            time.sleep(item["delay"])
            
            # Check horizontal overflow
            overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
            print(f"  Overflow: {overflow}")
            
            target_path = os.path.join(OUTPUT_DIR, item["filename"])
            page.screenshot(path=target_path, full_page=False)
            print(f"  Saved screenshot: {target_path}")

        # On dashboard, test clicking a circle marker to verify popup & panel
        page.goto("http://localhost:3000/", wait_until="networkidle", timeout=30000)
        time.sleep(3)
        marker = page.locator("path.gis-marker").first
        if marker.count() > 0:
            print("Found GIS circle marker! Clicking to test popup and right panel...")
            marker.click()
            time.sleep(2)
            # Check popup visible
            popup = page.locator(".dark-gis-popup")
            print(f"  Dark popup visible: {popup.is_visible()}")
            # Check RiskPanel visible
            panel_title = page.locator("h2:has-text('Hindmata')")
            print(f"  RiskPanel title count: {panel_title.count()}")
            # Save detail screenshot
            detail_shot = os.path.join(OUTPUT_DIR, "dashboard_detail.png")
            page.screenshot(path=detail_shot)
            print(f"  Saved detail screenshot: {detail_shot}")

        # 2. Mobile Test (390x844 - iPhone 12/13/14)
        print("\n=== Testing Mobile (390x844) ===")
        context_mobile = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        mobile_page = context_mobile.new_page()

        for item in PAGES:
            print(f"Checking {item['url']} on mobile (390px)...")
            mobile_page.goto(item["url"], wait_until="networkidle", timeout=30000)
            time.sleep(item["delay"])
            
            body_overflow = mobile_page.evaluate("() => document.body.scrollWidth > window.innerWidth")
            doc_overflow = mobile_page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
            print(f"  Mobile body overflow: {body_overflow}, doc overflow: {doc_overflow}")

        browser.close()
        print("\nVerification and capture complete!")

if __name__ == "__main__":
    verify_and_capture()
