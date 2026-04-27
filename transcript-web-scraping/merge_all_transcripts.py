import pandas as pd
from pathlib import Path

# This script will read all of the transcript CSV files, merge them into a single DataFrame, 
# and save the result as a new CSV file. A column for the season number and for the episode 
# number will be added based on the filename.

# Read all of the transcript CSV files
transcript_files = list(Path("data/transcripts/s1-transcripts").glob("*.csv"))
transcript_files.extend(Path("data/transcripts/s2-transcripts").glob("*.csv"))

print(transcript_files)
all_transcripts = []
for file in transcript_files:
    df = pd.read_csv(file)
    # Extract season and episode numbers from the filename
    filename = file.stem  # Get the filename without the extension
    parts = filename.split("_")  # Split by '_'
    print(parts)
    if len(parts) >= 3:
        season_part = parts[0]  # e.g., "S01"
        episode_part = parts[1]  # e.g., "E01"
        try:
            season_number = int(season_part[1:])  # Remove 's' and convert to int
            episode_number = int(episode_part[1:])  # Remove 'e' and convert to int
            df["season"] = season_number
            df["episode"] = episode_number
            all_transcripts.append(df)
        except ValueError:
            print(f"Warning: Could not parse season/episode from filename {filename}")
    else:
        print(f"Warning: Filename {filename} does not match expected format")

# Merge all transcripts into a single DataFrame
if all_transcripts:
    merged_df = pd.concat(all_transcripts, ignore_index=True)
    remaining_columns = [col for col in merged_df.columns if col not in ["season", "episode"]]
    merged_df = merged_df[["season", "episode", *remaining_columns]]
    # Save the merged DataFrame to a new CSV file
    output_file = Path("data/transcripts/merged_transcripts.csv")
    output_file.parent.mkdir(parents=True, exist_ok=True)
    merged_df.to_csv(output_file, index=False)
    print(f"Saved merged transcripts to {output_file}")
else:
    print("No transcripts found to merge.")

