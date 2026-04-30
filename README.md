# Motivation
Our goal with our visualizations is to convey insights into the impact that the main characters of Severance have on the story, and how their relationships and dialogue between them build the world of the show. To accomplish this, we first want to show the user how frequently characters appear and how much they speak relative to the other characters in the show. Then, using the chord diagram, the users can tell which characters are speaking to one another the most and compare the level of relationships they have in the show. Combining this with the word cloud helps provide an insight into the personality of the characters, and when paired with the chord diagram, can also give insights into the types of conversations that a character has with another if they speak frequently with them.

# Data
The data for both the transcripts and character information came from the [Severance wiki]( https://www.severance.wiki/Start) fan page. This website contains transcripts with time stamps and information about who is speaking at that time for every episode in both seasons. For every character, they also give information about where they work and the relationships they have, which are significant to the show. The website also provides images for each character, which we used for our visualizations. When trying to scrape the data, we encountered issues getting past their automated bot detection services. Using [this code]( https://github.com/sohamvakani/tv-time-cs5124/blob/dev/transcript-web-scraping/get_soup_from_url.py), we were able to set up a browser agent that is able to handle cookie selections and pass Java-based verification tests, which enable automated access to the websites and their contents. From here, it was easy to automate the scraping since the website is very well organized, storing all of its info in a repeated and structured format. 

# Vis Components
# Design Sketches & Justification
# Discovery
# Process
# Demo Video
# Roles
