import pandas as pd
from pathlib import Path
from get_soup_from_url import get_soup_from_url

def normalize_text(text):
	return " ".join(text.split())


# Get soup for character page
soup = get_soup_from_url("https://www.severance.wiki/characters")

content_root = soup.find("article") or soup.find("main") or soup.body or soup

rows = []
current_group = None

for element in content_root.find_all(["h2", "h3"], recursive=True):
	text = normalize_text(element.get_text(" ", strip=True))
	if not text:
		continue

	classes = element.get("class") or []
	if "level2" in classes or element.name == "h2":
		current_group = text
	elif "level3" in classes or element.name == "h3":
		if current_group:
			rows.append({
				"character_name": text,
				"group": current_group,
			})

df_characters = pd.DataFrame(rows, columns=["character_name", "group"]).drop_duplicates()

output_file = Path("data/character_names.csv")
output_file.parent.mkdir(parents=True, exist_ok=True)
df_characters.to_csv(output_file, index=False)

print(f"Saved {len(df_characters)} character names to {output_file}")
print(df_characters.head())