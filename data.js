const { d3 } = window;

const DATA_ROOT = "data";
const CHARACTER_MANIFEST_PATH = "public/characters/manifest.json?v=character-assets";
const WORD_PATTERN = /[A-Za-z0-9]+(?:['\u2019][A-Za-z0-9]+)?/g;
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from",
  "had", "has", "have", "he", "her", "his", "i", "if", "in", "is", "it", "its",
  "just", "me", "my", "no", "not", "of", "on", "or", "our", "she", "so", "that",
  "the", "their", "them", "there", "they", "this", "to", "too", "us", "was", "we",
  "were", "what", "when", "who", "why", "will", "with", "you", "your"
]);

const characterInfo = new Map();
const characterProfiles = new Map();
let speakerAliases = new Map();

export const episodes = [
  ...d3.range(1, 10).map(n => episode(1, n)),
  ...d3.range(1, 11).map(n => episode(2, n))
];

function episode(season, number) {
  const padded = String(number).padStart(2, "0");
  return {
    id: `s${season}e${padded}`,
    label: `S${season}E${number}`,
    season,
    path: `${DATA_ROOT}/transcripts_with_talking_to/s${season}-transcripts/s${season}_e${padded}_transcript.csv`
  };
}

export async function loadTranscriptRows() {
  await loadMetadata();

  const loaded = await Promise.allSettled(episodes.map(loadEpisodeRows));
  const rows = loaded
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value);

  return {
    rows,
    failedEpisodes: loaded.filter(result => result.status === "rejected").length
  };
}

async function loadMetadata() {
  const [aliases, characters, manifest] = await Promise.all([
    d3.csv(`${DATA_ROOT}/speaker_aliases.csv`),
    d3.csv(`${DATA_ROOT}/character_names.csv`),
    d3.json(CHARACTER_MANIFEST_PATH).catch(() => ({ characters: [] }))
  ]);

  const characterRows = new Map();
  for (const row of characters) {
    const character = cleanSpeaker(row.character_name);
    if (!character) continue;
    characterRows.set(character, {
      group: cleanSpeaker(row.group),
      subgroup: cleanSpeaker(row.subgroup)
    });
  }

  speakerAliases = new Map(aliases.map(row => [
    cleanSpeaker(row.speaker_label),
    {
      canonical: cleanSpeaker(row.canonical_character_name),
      include: row.include_in_character_analysis === "true"
    }
  ]));

  characterInfo.clear();
  characterProfiles.clear();
  loadCharacterManifest(manifest);

  for (const [character, info] of characterRows) {
    characterInfo.set(character, info);
  }

  for (const [speakerLabel, alias] of speakerAliases) {
    if (!alias.include || !alias.canonical) continue;
    const aliasInfo = characterRows.get(speakerLabel) || characterRows.get(withTrailingInitialPeriod(speakerLabel));
    if (!aliasInfo) continue;
    characterInfo.set(alias.canonical, chooseCharacterInfo(characterInfo.get(alias.canonical), aliasInfo));
  }
}

function loadCharacterManifest(manifest) {
  const aliasEntries = [];

  for (const character of manifest?.characters || []) {
    const profile = normalizeProfile(character);
    setProfileKeys([character.name, character.profile?.displayName], profile, true);
    aliasEntries.push({ keys: (character.profile?.alsoKnownAs || "").split(","), profile });
  }

  for (const { keys, profile } of aliasEntries) {
    setProfileKeys(keys, profile, false);
  }
}

function setProfileKeys(keys, profile, overwrite) {
  for (const key of keys.map(cleanSpeaker).filter(Boolean)) {
    const normalizedKeys = [key, withoutTrailingInitialPeriod(key)];
    for (const normalizedKey of normalizedKeys) {
      if (overwrite || !characterProfiles.has(normalizedKey)) {
        characterProfiles.set(normalizedKey, profile);
      }
    }
  }
}

function normalizeProfile(character) {
  const primaryAsset = character.assets?.find(asset => asset.role === "primary") || character.assets?.[0];
  return {
    displayName: cleanSpeaker(character.profile?.displayName) || cleanSpeaker(character.name),
    alsoKnownAs: cleanSpeaker(character.profile?.alsoKnownAs),
    portrayedBy: cleanSpeaker(character.profile?.portrayedBy),
    occupation: cleanSpeaker(character.profile?.occupation),
    status: cleanSpeaker(character.profile?.status),
    firstAppearance: cleanSpeaker(character.profile?.firstAppearance),
    pageUrl: character.pageUrl || "",
    imageUrl: primaryAsset?.localUrl || primaryAsset?.sourceUrl || "",
    imageAlt: primaryAsset?.alt || character.profile?.displayName || character.name || ""
  };
}

function profileFor(character) {
  return characterProfiles.get(character) || characterProfiles.get(withTrailingInitialPeriod(character)) || characterProfiles.get(withoutTrailingInitialPeriod(character));
}

function chooseCharacterInfo(current, candidate) {
  return metadataScore(candidate) > metadataScore(current) ? candidate : current;
}

function metadataScore(info) {
  if (!info) return -1;
  let score = 0;
  if (info.group === "Lumon Industries") score += 10;
  if (info.subgroup === "Macrodata Refinement") score += 5;
  if (info.subgroup === "Administration") score += 4;
  if (info.group === "Friends & Family") score -= 2;
  return score;
}

function withTrailingInitialPeriod(name) {
  return name.replace(/\b([A-Z])$/, "$1.");
}

function withoutTrailingInitialPeriod(name) {
  return name.replace(/\b([A-Z])\.$/, "$1");
}

async function loadEpisodeRows(currentEpisode) {
  const rows = await d3.csv(currentEpisode.path);
  return rows.map(row => {
    const canonical = canonicalSpeaker(row.speaker);
    return {
      episodeId: currentEpisode.id,
      season: currentEpisode.season,
      canonical,
      words: wordCount(row.text),
      text: row.text,
      talking_to: row.talking_to,
      lines: canonical ? 1 : 0
    };
  }).filter(row => row.canonical && row.words > 0);
}

function canonicalSpeaker(speaker) {
  const cleaned = cleanSpeaker(speaker);
  if (!cleaned) return null;

  const alias = speakerAliases.get(cleaned);
  if (alias) return alias.include ? alias.canonical : null;

  return cleaned;
}

function cleanSpeaker(speaker) {
  return String(speaker || "").replace(/\s+/g, " ").replace(/:$/, "").trim();
}

function wordCount(text) {
  const matches = String(text || "").match(WORD_PATTERN);
  return matches ? matches.length : 0;
}

export function displayName(character) {
  return profileFor(character)?.displayName || character;
}

export function roleFor(character) {
  const profile = profileFor(character);
  if (profile?.occupation) return profile.occupation;

  const info = characterInfo.get(character);
  if (info?.subgroup) return info.subgroup;
  if (info?.group) return info.group;
  return "Supporting Character";
}

export function factsFor(character) {
  const profile = profileFor(character) || {};
  return {
    portrayedBy: profile.portrayedBy || "Unknown",
    status: profile.status || "Unknown",
    firstAppearance: profile.firstAppearance || "Unknown"
  };
}

export function imageFor(character) {
  const profile = profileFor(character);
  return {
    url: profile?.imageUrl || "",
    alt: profile?.imageAlt || displayName(character)
  };
}

export function pageUrlFor(character) {
  return profileFor(character)?.pageUrl || "";
}

export function summarizeRows(rows) {
  return d3.rollups(
    rows,
    values => {
      const character = values[0].canonical;
      const lexicalStats = summarizeLexicalStats(values);
      return {
        character,
        display: displayName(character),
        words: d3.sum(values, d => d.words),
        lines: d3.sum(values, d => d.lines),
        episodes: new Set(values.map(d => d.episodeId)),
        episodeWords: d3.rollup(values, v => d3.sum(v, d => d.words), d => d.episodeId),
        wordCloud: lexicalStats.wordCloud,
        topSpokenPhrase: lexicalStats.topSpokenPhrase
      };
    },
    d => d.canonical
  )
    .map(([, value]) => value)
    .sort((a, b) => d3.descending(a.words, b.words))
    .map((d, index) => ({ ...d, rank: index + 1 }));
}

function summarizeLexicalStats(values) {
  const wordCounts = new Map();
  const phraseCounts = new Map();

  for (const row of values) {
    const words = normalizedWords(row.text).filter(word => !STOP_WORDS.has(word));
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    for (let index = 0; index < words.length - 1; index += 1) {
      const phrase = `${words[index]} ${words[index + 1]}`;
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
    }
  }

  const topWords = sortedCounts(wordCounts)
    .slice(0, 18)
    .map(([word, count]) => ({ word, count }));
  const topPhrases = sortedCounts(phraseCounts)
    .filter(([, count]) => count >= 2)
    .slice(0, 8)
    .map(([phrase, count]) => ({ phrase, count }));
  const topPhrase = sortedCounts(phraseCounts)[0];
  const topWord = topWords[0];
  const topSpokenPhrase = topPhrase && topPhrase[1] >= 3
    ? { text: topPhrase[0], count: topPhrase[1], kind: "phrase" }
    : topWord
      ? { text: topWord.word, count: topWord.count, kind: "word" }
      : { text: "n/a", count: 0, kind: "word" };

  return {
    wordCloud: topWords,
    topPhrases,
    topSpokenPhrase
  };
}

function normalizedWords(text) {
  const matches = String(text || "").toLowerCase().match(WORD_PATTERN);
  return matches ? matches : [];
}

function sortedCounts(countMap) {
  return Array.from(countMap.entries()).sort((left, right) => {
    const delta = right[1] - left[1];
    return delta !== 0 ? delta : left[0].localeCompare(right[0]);
  });
}
