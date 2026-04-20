from bs4 import BeautifulSoup
import pandas as pd
import re
from pathlib import Path
from get_soup_from_url import get_soup_from_url

# Read the transcript links from the CSV into a list
df_links = pd.read_csv("data/severance_transcript_links.csv")
transcript_links = df_links["Transcript Link"].tolist()

num_episodes_season_1 = 9

output_dir_s1 = Path("data/s1-transcripts")
output_dir_s2 = Path("data/s2-transcripts")
output_dir_s1.mkdir(parents=True, exist_ok=True)
output_dir_s2.mkdir(parents=True, exist_ok=True)

# Loop through transcript links, parse p tags into rows, and save one CSV per episode.
for idx, link in enumerate(transcript_links):
	soup = get_soup_from_url(link)

	script_blocks = soup.find_all("div", class_="wrap_script plugin_wrap")
	lines = []
	for block in script_blocks:
		for p in block.find_all("p"):
			text = p.get_text(strip=True)
			if text:
				lines.append(text)

	rows = []
	for line in lines:
		match = re.search(r"(\d{2}:\d{2}:\d{2})", line)
		if not match:
			continue

		timestamp = match.group(1)
		remainder = line[match.end():].strip()

		if ":" in remainder:
			speaker, text = remainder.split(":", 1)
		else:
			speaker, text = "", remainder

		rows.append({
			"timestamp": timestamp,
			"speaker": speaker.strip(),
			"text": text.strip(),
		})

	df_transcript = pd.DataFrame(rows, columns=["timestamp", "speaker", "text"])

	if idx < num_episodes_season_1:
		season = 1
		episode_num = idx + 1
		output_dir = output_dir_s1
	else:
		season = 2
		episode_num = idx - num_episodes_season_1 + 1
		output_dir = output_dir_s2

	output_file = output_dir / f"s{season}e{episode_num:02d}_transcript.csv"
	df_transcript.to_csv(output_file, index=False)
	print(f"Saved {output_file} ({len(df_transcript)} rows)")



