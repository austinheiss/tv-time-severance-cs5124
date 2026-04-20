import pandas as pd
from pathlib import Path

# read in the character data
df_characters = pd.read_csv("data/character_names.csv")

# Grab a list of character names to check for overlaps
character_names = set(df_characters["character_name"].str.lower())


# Read all of the 