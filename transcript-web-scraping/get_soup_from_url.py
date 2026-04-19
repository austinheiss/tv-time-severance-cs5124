from bs4 import BeautifulSoup

# This function checks for common indicators of bot challenge pages in the HTML content
def is_bot_challenge_page(html_text):
    lowered = html_text.lower()
    return (
        "secure connection" in lowered
        or "bunny-shield" in lowered
        or "captcha" in lowered
    )

def get_soup_from_url(url):

    # Prepare to use Playwright for web scraping, which can handle 
    # JavaScript-rendered content and some bot protections.
    try:
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright is not installed. Install it with:")
        print("  pip install playwright")
        print("  playwright install chromium")
        raise SystemExit(1)

    USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )



    # Use Playwright to navigate to the page and retrieve its content, 
    # while mimicking a real browser to avoid bot detection.
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT, locale="en-US")
        page = context.new_page()

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(8000)
            try:
                page.wait_for_load_state("networkidle", timeout=10000)
            except PlaywrightTimeoutError:
                pass

            # Get the page content and check for bot challenge indicators
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")
            page_title = soup.title.get_text(strip=True) if soup.title else "(no title)"
            challenge_detected = is_bot_challenge_page(html)

            print(f"Page title: {page_title}")
            print(f"Browser context cookies stored: {len(context.cookies())}")

            # If we detect a bot challenge page, we can print a warning. Otherwise, we can proceed with parsing the content.
            if challenge_detected:
                print(
                    "Challenge page still detected. This protection may require a visible browser "
                    "or interactive verification."
                )
            else:
                print("Looks like real page content was returned.")

        finally:
            browser.close()
    return soup