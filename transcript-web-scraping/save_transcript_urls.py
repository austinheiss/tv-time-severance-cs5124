from bs4 import BeautifulSoup
import pandas as pd
import get_soup_from_url

soup = get_soup_from_url.get_soup_from_url(
    "https://www.severance.wiki/list_of_severance_episodes"
)

# Test to print soup
# print(soup.prettify())

# Extract all transcript links from the page
transcript_links = []
for a in soup.find_all("a", href=True):
    href = a["href"]
    if "transcript" in href.lower():
        transcript_links.append(href)
# Convert to absolute URLs if necessary
transcript_links = [
    link if link.startswith("http") else f"https://www.severance.wiki{link}"
    for link in transcript_links
]
# Test to print found transcript links
# print(f"Found {len(transcript_links)} transcript links:")
# for link in transcript_links:
#     print(link)

# Store the transcript links in a DataFrame and save to CSV
df = pd.DataFrame(transcript_links, columns=["Transcript Link"])
df.to_csv("transcript-web-scraping/severance_transcript_links.csv", index=False)
print(f"Saved {len(transcript_links)} transcript links to 'severance_transcript_links.csv'")
