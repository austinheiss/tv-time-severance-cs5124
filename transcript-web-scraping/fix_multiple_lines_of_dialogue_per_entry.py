import pandas as pd
from pathlib import Path

# read in the merged transcripts CSV file
df = pd.read_csv("data/transcripts/merged_transcripts.csv")

# Return a df with all the rows where the text column countains a ":" anywhere in it
df_with_colon = df[df["text"].str.contains(":")].copy()

print(f"Found {len(df_with_colon)} rows with a colon in the text column")

# create a new column called "before_colon" which contains the text before the first colon in the "text" column,
# working backwards until it finds a punctuation mark (.,!?;-) or the start of the string. 
# This is likely to be the speaker name in cases where there are multiple lines of dialogue in the same text entry.
def extract_before_colon(text):
    if ":" not in text:
        return ""
    before_colon = text.split(":", 1)[0]
    # Now we want to trim this down to the last punctuation mark or the start of the string
    last_punctuation_index = max(before_colon.rfind(p) for p in [".", ",", "!", "?", ";", "-", "—", "…"])
    if last_punctuation_index == -1:
        return before_colon.strip()
    else:
        return before_colon[last_punctuation_index + 1:].strip()

df_with_colon["before_colon"] = df_with_colon["text"].apply(extract_before_colon)

# separate into a new df with only rows with one word before the colon, and another df with more than one word before the colon
df_one_word_before_colon = df_with_colon[df_with_colon["before_colon"].str.split().str.len() == 1].copy()
df_multiple_words_before_colon = df_with_colon[df_with_colon["before_colon"].str.split().str.len() > 1].copy()
print(f"Found {len(df_one_word_before_colon)} rows with one word before the colon")
print(f"Found {len(df_multiple_words_before_colon)} rows with multiple words before the colon")

# # save this to a new CSV file for manual review
output_dir = Path("data/transcripts/for_manual_review")
output_dir.mkdir(parents=True, exist_ok=True)
df_one_word_before_colon.to_csv(output_dir / "one_word_before_colon.csv", index=False)
df_multiple_words_before_colon.to_csv(output_dir / "multiple_words_before_colon.csv", index=False)

