import pandas as pd
from pathlib import Path
from get_soup_from_url import get_soup_from_url

def normalize_text(text):
	return " ".join(text.split())


# Get soup for character page
soup = get_soup_from_url("https://www.severance.wiki/list_of_characters")
content_root = soup.find("article") or soup.find("main") or soup.body or soup

rows = []
current_group = None

for element in content_root.find_all(["h2", "h3"], recursive=True):
	text = normalize_text(element.get_text(" ", strip=True))
	if not text:
		continue

	classes = element.get("class") or []
	if "level2" in classes or element.name == "h2":
		if text.lower() == "see also":
			break
		current_group = text
	elif "level3" in classes or element.name == "h3":
		if current_group:
			current_subgroup = text
			name_block = element.find_next_sibling("div")
			if not name_block:
				continue

			# Character names are listed as <li> items under the subgroup content block.
			for li in name_block.find_all("li"):
				character_name = normalize_text(li.get_text(" ", strip=True))
				if not character_name:
					continue
				rows.append({
					"character_name": character_name,
					"group": current_group,
					"subgroup": current_subgroup,
				})

df_characters = pd.DataFrame(rows, columns=["character_name", "group", "subgroup"]).drop_duplicates()

output_file = Path("data/character_names.csv")
output_file.parent.mkdir(parents=True, exist_ok=True)
df_characters.to_csv(output_file, index=False)

print(f"Saved {len(df_characters)} character names to {output_file}")
print(df_characters.head())
# print(soup.prettify())  # Print the first 1000 characters of the soup for debugging