import { analyzePhraseOwnership, displayName, factsFor, imageFor, pageUrlFor, roleFor } from "./data.js";

const { d3 } = window;
export const DISPLAYED_CHARACTER_COUNT = 15;
let phraseOwnershipContext = null;
let phraseInputBound = false;

export function renderDetails({ characters, selectedCharacter, visibleEpisodes, formatNumber, tooltip }) {
  const selected = characters.find(d => d.character === selectedCharacter) || characters[0];
  if (!selected) return;

  renderAvatar(selected.character);
  d3.select("#selected-name-link")
    .text(displayName(selected.character))
    .attr("href", pageUrlFor(selected.character) || "https://www.severance.wiki/list_of_characters");
  d3.select("#selected-role").text(roleFor(selected.character));

  const facts = factsFor(selected.character);
  const details = [
    { key: "lines", label: "Total Lines", value: formatNumber(selected.lines) },
    { key: "words", label: "Total Words Spoken", value: formatNumber(selected.words) },
    { key: "episodes", label: "Episodes Appeared In", value: `${selected.episodes.size} / ${visibleEpisodes.length}` },
    { key: "portrayedBy", label: "Portrayed By", value: facts.portrayedBy },
    { key: "status", label: "Status", value: facts.status },
    { key: "firstAppearance", label: "First Appearance", value: facts.firstAppearance }
  ];

  const rows = d3.select("#detail-list").selectAll(".detail-row").data(details, d => d.key);
  const enter = rows.enter().append("div").attr("class", "detail-row");
  enter.append("div").attr("class", "detail-label");
  enter.append("div").attr("class", "detail-value");

  rows.merge(enter).select(".detail-label").text(d => d.label);
  rows.merge(enter).select(".detail-value").text(d => d.value);
  rows.exit().remove();

  renderWordCloud(selected, tooltip);
  renderPhraseChart(selected, formatNumber);
  const phraseLabel = selected.topSpokenPhrase?.kind === "phrase" ? "Most Spoken Phrase" : "Most Spoken Word";
  const phraseText = selected.topSpokenPhrase?.text || "n/a";
  const phraseCount = selected.topSpokenPhrase?.count || 0;
  d3.select("#top-phrase-label").text(phraseLabel);
  d3.select("#top-phrase-value").text(`${phraseText} (${formatNumber(phraseCount)})`);
}

function renderAvatar(character) {
  const image = imageFor(character);
  const avatar = d3.select("#selected-avatar");
  avatar.selectAll("*").remove();
  avatar.text("");
  avatar.style("background-image", image.url ? `url("${image.url}")` : null);
  avatar.attr("role", image.url ? "img" : null);
  avatar.attr("aria-label", image.url ? image.alt : null);
  avatar.classed("has-image", Boolean(image.url));
  avatar.classed("avatar-mark-scout", character === "Mark Scout");
  avatar.classed("avatar-seth-milchick", character === "Seth Milchick");
  avatar.classed("avatar-asal-reghabi", character === "Asal Reghabi");
  avatar.classed("avatar-peter-kilmer", character === "Peter Kilmer");
  avatar.classed("avatar-ms-casey", character === "Ms. Casey");
  avatar.classed("avatar-gemma-scout", character === "Gemma Scout");
}

function renderWordCloud(selected, tooltip) {
  const svg = d3.select("#word-cloud");
  const words = selected.wordCloud || [];
  const width = Math.max(280, svg.node()?.getBoundingClientRect().width || 320);
  const height = 238;
  const cx = width / 2;
  const cy = 100;
  const maxRadius = Math.min(width * 0.38, 104);

  const maxCount = d3.max(words, d => d.count) || 1;
  const minCount = d3.min(words, d => d.count) || 1;
  const size = d3.scaleLinear().domain([minCount, maxCount]).range([12, 38]);
  const sortedWords = words.slice().sort((a, b) => d3.descending(a.count, b.count));

  svg.attr("viewBox", `0 0 ${width} ${height}`).style("height", `${height}px`);

  const bulbOutline = [
    `M ${cx} ${24}`,
    `C ${cx - maxRadius} ${24}, ${cx - maxRadius - 16} ${152}, ${cx - 16} ${166}`,
    `L ${cx - 22} ${192}`,
    `L ${cx + 22} ${192}`,
    `L ${cx + 16} ${166}`,
    `C ${cx + maxRadius + 16} ${152}, ${cx + maxRadius} ${24}, ${cx} ${24}`
  ].join(" ");

  const frame = svg.selectAll(".word-cloud-frame").data([0]);
  frame.enter().append("path").attr("class", "word-cloud-frame");
  frame.attr("d", bulbOutline);

  const placements = layoutBulbWords(sortedWords, size, cx, cy, maxRadius);

  const tokens = svg.selectAll(".word-cloud-token").data(placements, d => d.word);
  const tokenEnter = tokens.enter()
    .append("text")
    .attr("class", "word-cloud-token")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle");
  tokenEnter.merge(tokens)
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .style("font-size", d => `${d.fontSize}px`)
    .style("font-weight", d => (d.count === maxCount ? 780 : 580))
    .text(d => d.word)
    .on("mouseenter", (event, d) => showTooltip(event, tooltip, `<strong>${d.word}</strong><br>${d3.format(",")(d.count)} mentions`))
    .on("mousemove", event => moveTooltip(event, tooltip))
    .on("mouseleave", () => tooltip.style("opacity", 0));
  tokenEnter.merge(tokens)
    .selectAll("title")
    .data(d => [d])
    .join("title")
    .text(d => `${d.word}: ${d.count}`);
  tokens.exit().remove();
}

function layoutBulbWords(words, sizeScale, cx, cy, radius) {
  if (!words.length) return [];
  const placed = [];
  const center = words[0];
  const centerFont = Math.round(sizeScale(center.count));
  placed.push(createPlacement(center, cx, cy, centerFont));

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    const fontSize = Math.round(sizeScale(word.count));
    const progress = index / Math.max(words.length - 1, 1);
    const targetRadius = 20 + progress * (radius + 18);
    const angleStart = index * 2.399963229728653;
    let accepted = null;

    for (let step = 0; step < 140; step += 1) {
      const angle = angleStart + step * 0.46;
      const radial = targetRadius + step * 0.95;
      const x = cx + Math.cos(angle) * radial;
      const y = cy + Math.sin(angle) * radial * 0.95;
      const candidate = createPlacement(word, x, y, fontSize);
      if (isInsideBulb(candidate, cx, cy, radius) && !overlapsAny(candidate, placed)) {
        accepted = candidate;
        break;
      }
    }

    placed.push(accepted || createPlacement(word, cx, cy + radius + 20 + index * 2, fontSize));
  }
  return placed;
}

function createPlacement(wordDatum, x, y, fontSize) {
  const width = Math.max(fontSize * 0.56 * wordDatum.word.length, fontSize * 1.1);
  const height = fontSize;
  return {
    word: wordDatum.word,
    count: wordDatum.count,
    x,
    y,
    fontSize,
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2
  };
}

function isInsideBulb(candidate, cx, cy, radius) {
  const points = [
    [candidate.left, candidate.top],
    [candidate.right, candidate.top],
    [candidate.left, candidate.bottom],
    [candidate.right, candidate.bottom]
  ];
  return points.every(([x, y]) => pointInsideBulb(x, y, cx, cy, radius));
}

function pointInsideBulb(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  const globe = (dx * dx) / (radius * radius) + (dy * dy) / ((radius + 20) * (radius + 20)) <= 1;
  if (globe) return true;
  const neckTop = cy + radius - 10;
  const neckBottom = neckTop + 48;
  const neckHalfWidth = 28;
  return y >= neckTop && y <= neckBottom && Math.abs(dx) <= neckHalfWidth;
}

function overlapsAny(candidate, placed) {
  return placed.some(existing =>
    candidate.left < existing.right + 4 &&
    candidate.right > existing.left - 4 &&
    candidate.top < existing.bottom + 4 &&
    candidate.bottom > existing.top - 4
  );
}

function renderPhraseChart(selected, formatNumber) {
  const svg = d3.select("#phrase-chart");
  const phrases = (selected.topPhrases || []).slice(0, 6);
  const width = Math.max(280, svg.node()?.getBoundingClientRect().width || 320);
  const margin = { top: 6, right: 64, bottom: 6, left: 8 };
  const rowHeight = 27;
  const height = Math.max(44, margin.top + margin.bottom + phrases.length * rowHeight);

  svg.attr("viewBox", `0 0 ${width} ${height}`).style("height", `${height}px`);
  svg.selectAll("*").remove();
  if (!phrases.length) {
    svg.append("text")
      .attr("class", "phrase-empty")
      .attr("x", width / 2)
      .attr("y", 26)
      .attr("text-anchor", "middle")
      .text("No repeated phrases in this filter");
    return;
  }

  const x = d3.scaleLinear()
    .domain([0, d3.max(phrases, d => d.count) || 1])
    .range([margin.left + 150, width - margin.right]);

  const rows = svg.selectAll(".phrase-row")
    .data(phrases)
    .enter()
    .append("g")
    .attr("class", "phrase-row")
    .attr("transform", (_, i) => `translate(0, ${margin.top + i * rowHeight})`);

  rows.append("text")
    .attr("class", "phrase-label")
    .attr("x", margin.left)
    .attr("y", 16)
    .text(d => d.phrase);

  rows.append("rect")
    .attr("class", "phrase-bar-bg")
    .attr("x", margin.left + 150)
    .attr("y", 5)
    .attr("width", width - margin.left - margin.right - 150)
    .attr("height", 12);

  rows.append("rect")
    .attr("class", "phrase-bar")
    .attr("x", margin.left + 150)
    .attr("y", 5)
    .attr("width", d => Math.max(2, x(d.count) - (margin.left + 150)))
    .attr("height", 12);

  rows.append("text")
    .attr("class", "phrase-count")
    .attr("x", width - margin.right + 6)
    .attr("y", 16)
    .text(d => formatNumber(d.count));
}

export function renderRanking({ characters, selectedCharacter, visibleEpisodes, formatNumber, onSelect }) {
  const svg = d3.select("#ranking-chart");
  const svgNode = svg.node();
  const panelStyle = window.getComputedStyle(svgNode.closest(".ranking-panel"));
  const contentInset = parseFloat(panelStyle.paddingLeft) || 0;
  const contentEndInset = parseFloat(panelStyle.paddingRight) || contentInset;
  const width = Math.max(680 + contentInset + contentEndInset, svgNode.getBoundingClientRect().width);
  const contentWidth = width - contentInset - contentEndInset;
  const topRows = characters.slice(0, DISPLAYED_CHARACTER_COUNT);
  const margin = { top: 48 };
  const rowHeight = 41;
  const finalRuleY = margin.top + topRows.length * rowHeight - 22;
  const chartHeight = finalRuleY + 2;
  const rankX = contentInset + 18;
  const nameX = contentInset + 68;
  const barX = contentInset + Math.min(280, Math.max(210, contentWidth * 0.26));
  const wordsX = contentInset + Math.max(contentWidth * 0.61, barX - contentInset + 245);
  const minDotGap = 5.2;
  const dotsX = Math.min(
    contentInset + Math.max(contentWidth * 0.8, wordsX - contentInset + 125),
    width - contentEndInset - (visibleEpisodes.length - 1) * minDotGap - 8
  );
  const dotGap = Math.min(15, Math.max(minDotGap, (width - contentEndInset - dotsX - 12) / Math.max(visibleEpisodes.length - 1, 1)));
  const dotRadius = Math.min(4.7, Math.max(2.2, dotGap * 0.35));
  const barWidth = Math.max(180, wordsX - barX - 38);
  const compactHeader = contentWidth < 760;

  clearSvg(svg, width, chartHeight);
  svg.append("text").attr("class", "table-head").attr("x", rankX).attr("y", 19).text("RANK");
  svg.append("text").attr("class", "table-head").attr("x", nameX).attr("y", 19).text("CHARACTER");
  svg.append("text").attr("class", "table-head").attr("x", wordsX).attr("y", 19).text(compactHeader ? "WORDS" : "TOTAL WORDS SPOKEN");
  svg.append("circle").attr("class", "dot").attr("cx", dotsX + 6).attr("cy", 16).attr("r", 5);
  svg.append("text").attr("class", "table-head").attr("x", dotsX + 24).attr("y", 19).text("EPISODES");

  const x = d3.scaleLinear()
    .domain([0, Math.max(16000, d3.max(topRows, d => d.words) || 1)])
    .range([0, barWidth]);

  topRows.forEach((character, index) => {
    const row = svg.append("g")
      .attr("class", "rank-row")
      .classed("selected", character.character === selectedCharacter)
      .attr("transform", `translate(0, ${margin.top + index * rowHeight})`)
      .on("click", () => onSelect(character.character));

    row.append("rect").attr("class", "row-hit").attr("x", 0).attr("y", -19).attr("width", width).attr("height", rowHeight - 2);
    row.append("line").attr("class", "row-rule").attr("x1", 0).attr("x2", width).attr("y1", -22).attr("y2", -22);
    row.append("rect").attr("class", "bar-bg").attr("x", barX).attr("y", -12).attr("width", barWidth).attr("height", 19);
    row.append("rect").attr("class", "bar").attr("x", barX).attr("y", -12).attr("height", 19).attr("width", x(character.words));
    row.append("text").attr("class", "rank-num").attr("x", rankX + 16).attr("y", 5).attr("text-anchor", "middle").text(character.rank);
    row.append("text").attr("class", "char-name").attr("x", nameX).attr("y", 5).text(character.display);
    row.append("text").attr("class", "word-count").attr("x", wordsX).attr("y", 5).text(formatNumber(character.words));

    const episodeDots = row.append("g").attr("class", "episode-dots");
    visibleEpisodes.forEach((episode, episodeIndex) => {
      episodeDots.append("circle")
        .attr("class", character.episodes.has(episode.id) ? "dot" : "dot-empty")
        .attr("cx", dotsX + episodeIndex * dotGap + 6)
        .attr("cy", 0)
        .attr("r", dotRadius);
    });
  });
}

export function renderHeatmap({ characters, visibleEpisodes, tooltip, formatNumber, onSelect, selectedHeatmapCharacters = [], onToggleHeatmapCharacter, selectedHeatmapEpisodes = [], onToggleHeatmapEpisode, selectedHeatmapSeason = null, onToggleHeatmapSeason, heatmapBrushMode = false, onBrushSelect }) {
  const svg = d3.select("#heatmap-chart");
  const width = Math.max(720, svg.node().getBoundingClientRect().width);
  const topRows = characters.slice(0, DISPLAYED_CHARACTER_COUNT);
  const margin = { top: 46, right: 0, bottom: 14, left: 184 };
  const rowHeight = 27;
  const cellGap = 2;
  const innerWidth = width - margin.left - margin.right;
  const cellWidth = innerWidth / visibleEpisodes.length;
  const height = margin.top + topRows.length * rowHeight + margin.bottom;
  const selectedSet = new Set(selectedHeatmapCharacters.filter(character => topRows.some(row => row.character === character)));
  const selectedEpisodeSet = new Set(selectedHeatmapEpisodes.filter(episodeId => visibleEpisodes.some(episode => episode.id === episodeId)));
  const seasonEpisodes = selectedHeatmapSeason ? visibleEpisodes.filter(episode => episode.season === selectedHeatmapSeason) : [];
  const seasonEpisodeSet = new Set(seasonEpisodes.map(episode => episode.id));
  const hasHeatmapSelection = selectedSet.size > 0;
  const hasEpisodeSelection = selectedEpisodeSet.size > 0;
  const hasSeasonSelection = Boolean(selectedHeatmapSeason);
  const activeRows = hasHeatmapSelection ? topRows.filter(row => selectedSet.has(row.character)) : topRows;
  const activeEpisodes = hasSeasonSelection
    ? seasonEpisodes
    : (hasEpisodeSelection ? visibleEpisodes.filter(episode => selectedEpisodeSet.has(episode.id)) : visibleEpisodes);
  const activeValues = activeRows.flatMap(row => activeEpisodes.map(episode => row.episodeWords.get(episode.id) || 0));
  const maxWords = d3.max(activeValues) || 1;
  const color = d3.scaleSequential()
    .domain([0, maxWords])
    .interpolator(t => d3.interpolateRgb("#eef5f4", "#0d6a67")(Math.pow(t, 0.7)));

  clearSvg(svg, width, height);
  drawSeasonLabels(svg, visibleEpisodes, margin, cellWidth, height, selectedHeatmapSeason, onToggleHeatmapSeason);

  visibleEpisodes.forEach((episode, index) => {
    const episodeSelected = hasSeasonSelection
      ? seasonEpisodeSet.has(episode.id)
      : (!hasEpisodeSelection || selectedEpisodeSet.has(episode.id));
    svg.append("text")
      .attr("class", "episode-label")
      .classed("selected", episodeSelected && (hasEpisodeSelection || hasSeasonSelection))
      .classed("dimmed", (hasEpisodeSelection || hasSeasonSelection) && !episodeSelected)
      .attr("x", margin.left + index * cellWidth + cellWidth / 2)
      .attr("y", 38)
      .attr("text-anchor", "middle")
      .style("cursor", "pointer")
      .on("click", () => onToggleHeatmapEpisode?.(episode.id))
      .text(episode.label);

    svg.append("rect")
      .attr("class", "heat-column-hit")
      .attr("x", margin.left + index * cellWidth)
      .attr("y", margin.top - 6)
      .attr("width", Math.max(2, cellWidth - cellGap))
      .attr("height", height - margin.top + 6)
      .on("click", () => onToggleHeatmapEpisode?.(episode.id));
  });

  topRows.forEach((character, index) => {
    const rowSelected = !hasHeatmapSelection || selectedSet.has(character.character);
    const row = svg.append("g")
      .attr("class", "heat-row")
      .classed("selected", rowSelected && hasHeatmapSelection)
      .classed("dimmed", hasHeatmapSelection && !rowSelected)
      .attr("transform", `translate(0, ${margin.top + index * rowHeight})`);

    row.append("rect")
      .attr("class", "heat-row-hit")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", margin.left - 12)
      .attr("height", rowHeight - cellGap)
      .on("click", () => onToggleHeatmapCharacter?.(character.character));

    row.append("text")
      .attr("class", "heat-label")
      .attr("x", 0)
      .attr("y", 18)
      .style("cursor", "pointer")
      .on("click", () => onToggleHeatmapCharacter?.(character.character))
      .text(character.display);

    visibleEpisodes.forEach((episode, episodeIndex) => {
      const words = character.episodeWords.get(episode.id) || 0;
      const episodeSelected = hasSeasonSelection
        ? seasonEpisodeSet.has(episode.id)
        : (!hasEpisodeSelection || selectedEpisodeSet.has(episode.id));
      const cellSelected = rowSelected && episodeSelected;
      const fill = rowSelected
        ? (episodeSelected
          ? (words ? color(words) : "#edf2f2")
          : (words ? "#dbe0e1" : "#eceff0"))
        : (words ? "#d7ddde" : "#eceff0");
      row.append("rect")
        .attr("class", "heat-cell")
        .classed("selected-cell", cellSelected && (hasHeatmapSelection || hasEpisodeSelection))
        .classed("dimmed-cell", (hasHeatmapSelection && !rowSelected) || (hasEpisodeSelection && !episodeSelected))
        .attr("x", margin.left + episodeIndex * cellWidth)
        .attr("y", 0)
        .attr("width", Math.max(2, cellWidth - cellGap))
        .attr("height", rowHeight - cellGap)
        .attr("fill", fill)
        .on("mouseenter", event => showTooltip(event, tooltip, `<strong>${character.display}</strong><br>${episode.label}: ${formatNumber(words)} words`))
        .on("mousemove", event => moveTooltip(event, tooltip))
        .on("mouseleave", () => tooltip.style("opacity", 0))
        .on("click", () => onSelect(character.character));
    });
  });

  if (heatmapBrushMode) {
    const brush = d3.brush()
      .extent([
        [margin.left, margin.top],
        [margin.left + innerWidth, margin.top + topRows.length * rowHeight]
      ])
      .on("end", event => {
        if (!event.selection) return;
        const [[x0, y0], [x1, y1]] = event.selection;
        const brushedCharacters = topRows.slice(
          Math.max(0, Math.floor((y0 - margin.top) / rowHeight)),
          Math.min(topRows.length, Math.ceil((y1 - margin.top) / rowHeight))
        ).map(row => row.character);
        const brushedEpisodes = visibleEpisodes.slice(
          Math.max(0, Math.floor((x0 - margin.left) / cellWidth)),
          Math.min(visibleEpisodes.length, Math.ceil((x1 - margin.left) / cellWidth))
        ).map(episode => episode.id);

        if (brushedCharacters.length || brushedEpisodes.length) {
          onBrushSelect?.({ characters: brushedCharacters, episodes: brushedEpisodes });
        }
      });

    svg.append("g")
      .attr("class", "heatmap-brush")
      .call(brush);
  }
}

export function renderPhraseOwnership(context) {
  phraseOwnershipContext = context;
  bindPhraseInput();
  const query = d3.select("#phrase-query").property("value").trim();
  const analysis = analyzePhraseOwnership(context.visibleRows, query);
  renderPhraseMeta(query, analysis, context.visibleEpisodes, context.formatNumber);
  renderPhraseTimeline(context, query, analysis);
  renderPhraseOwners(context, query, analysis);
}

function bindPhraseInput() {
  if (phraseInputBound) return;
  d3.select("#phrase-query").on("input", () => {
    if (phraseOwnershipContext) renderPhraseOwnership(phraseOwnershipContext);
  });
  phraseInputBound = true;
}

function renderPhraseMeta(query, analysis, visibleEpisodes, formatNumber) {
  const meta = d3.select("#phrase-meta");
  if (!query) {
    meta.text("Type a word or phrase to begin.");
    return;
  }
  if (!analysis.totalMentions) {
    meta.text(`No mentions of "${query}" in this filter.`);
    return;
  }
  const firstEpisode = visibleEpisodes.find(episode => episode.id === analysis.firstEpisodeId);
  const firstLabel = firstEpisode ? firstEpisode.label : "outside selected episodes";
  meta.text(`${formatNumber(analysis.totalMentions)} mentions across this filter. First appears in ${firstLabel}.`);
}

function renderPhraseTimeline({ visibleEpisodes, tooltip, formatNumber }, query, analysis) {
  const svg = d3.select("#phrase-timeline-chart");
  const width = Math.max(720, svg.node().getBoundingClientRect().width);
  const height = 170;
  const margin = { top: 24, right: 20, bottom: 36, left: 44 };
  svg.attr("viewBox", `0 0 ${width} ${height}`).style("height", `${height}px`);
  svg.selectAll("*").remove();

  svg.append("text").attr("class", "phrase-chart-title").attr("x", margin.left).attr("y", 14).text("Mentions by Episode");
  if (!query) return;

  const data = visibleEpisodes.map(episode => ({
    ...episode,
    count: analysis.byEpisode.get(episode.id) || 0
  }));
  const x = d3.scaleBand()
    .domain(data.map(d => d.id))
    .range([margin.left, width - margin.right])
    .padding(0.18);
  const y = d3.scaleLinear()
    .domain([0, Math.max(1, d3.max(data, d => d.count) || 1)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(id => data.find(d => d.id === id)?.label || id).tickSizeOuter(0))
    .selectAll("text")
    .attr("class", "phrase-axis-tick")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end");

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format("d")))
    .selectAll("text")
    .attr("class", "phrase-axis-tick");

  svg.selectAll(".phrase-episode-bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "phrase-episode-bar")
    .attr("x", d => x(d.id))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.count))
    .on("mouseenter", (event, d) => showTooltip(event, tooltip, `<strong>${query}</strong><br>${d.label}: ${formatNumber(d.count)}`))
    .on("mousemove", event => moveTooltip(event, tooltip))
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

function renderPhraseOwners({ tooltip, formatNumber, onSelect }, query, analysis) {
  const svg = d3.select("#phrase-owner-chart");
  const width = Math.max(720, svg.node().getBoundingClientRect().width);
  const margin = { top: 24, right: 30, bottom: 16, left: 210 };
  const entries = Array.from(analysis.byCharacter.entries())
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 8)
    .map(([character, count]) => ({ character, count, label: displayName(character) }));
  const height = margin.top + margin.bottom + Math.max(1, entries.length) * 30;
  svg.attr("viewBox", `0 0 ${width} ${height}`).style("height", `${height}px`);
  svg.selectAll("*").remove();

  svg.append("text").attr("class", "phrase-chart-title").attr("x", margin.left).attr("y", 14).text("Top Characters Using This Phrase");
  if (!query || !entries.length) return;

  const x = d3.scaleLinear()
    .domain([0, d3.max(entries, d => d.count) || 1])
    .range([margin.left, width - margin.right]);
  const y = d3.scaleBand()
    .domain(entries.map(d => d.character))
    .range([margin.top, height - margin.bottom])
    .padding(0.25);

  svg.selectAll(".phrase-owner-label")
    .data(entries)
    .enter()
    .append("text")
    .attr("class", "phrase-owner-label")
    .attr("x", margin.left - 10)
    .attr("y", d => (y(d.character) || 0) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .text(d => d.label);

  svg.selectAll(".phrase-owner-bar")
    .data(entries)
    .enter()
    .append("rect")
    .attr("class", "phrase-owner-bar")
    .attr("x", margin.left)
    .attr("y", d => y(d.character))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.count) - margin.left)
    .on("mouseenter", (event, d) => showTooltip(event, tooltip, `<strong>${d.label}</strong><br>${query}: ${formatNumber(d.count)}`))
    .on("mousemove", event => moveTooltip(event, tooltip))
    .on("mouseleave", () => tooltip.style("opacity", 0))
    .on("click", (_, d) => onSelect(d.character));

  svg.selectAll(".phrase-owner-count")
    .data(entries)
    .enter()
    .append("text")
    .attr("class", "phrase-owner-count")
    .attr("x", d => x(d.count) + 6)
    .attr("y", d => (y(d.character) || 0) + y.bandwidth() / 2 + 4)
    .text(d => formatNumber(d.count));
}

function clearSvg(svg, width, height) {
  svg.attr("viewBox", `0 0 ${width} ${height}`)
    .style("height", `${height}px`)
    .selectAll("*")
    .remove();
}

function drawSeasonLabels(svg, episodes, margin, cellWidth, height, selectedSeason, onToggleSeason) {
  const s1Count = episodes.filter(d => d.season === 1).length;
  const s2Count = episodes.filter(d => d.season === 2).length;
  if (s1Count) {
    const s1Selected = selectedSeason === 1;
    svg.append("rect")
      .attr("class", "season-hit")
      .attr("x", margin.left)
      .attr("y", 0)
      .attr("width", s1Count * cellWidth)
      .attr("height", 22)
      .on("click", () => onToggleSeason?.(1));
    svg.append("text")
      .attr("class", "season-label")
      .classed("selected", s1Selected)
      .classed("dimmed", selectedSeason && !s1Selected)
      .attr("x", margin.left + (s1Count * cellWidth) / 2)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .style("cursor", "pointer")
      .on("click", () => onToggleSeason?.(1))
      .text("SEASON 1");
  }
  if (s2Count) {
    const s2Selected = selectedSeason === 2;
    svg.append("rect")
      .attr("class", "season-hit")
      .attr("x", margin.left + s1Count * cellWidth)
      .attr("y", 0)
      .attr("width", s2Count * cellWidth)
      .attr("height", 22)
      .on("click", () => onToggleSeason?.(2));
    svg.append("text")
      .attr("class", "season-label")
      .classed("selected", s2Selected)
      .classed("dimmed", selectedSeason && !s2Selected)
      .attr("x", margin.left + s1Count * cellWidth + (s2Count * cellWidth) / 2)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .style("cursor", "pointer")
      .on("click", () => onToggleSeason?.(2))
      .text("SEASON 2");
  }
  if (s1Count && s2Count) {
    svg.append("line")
      .attr("x1", margin.left + s1Count * cellWidth)
      .attr("x2", margin.left + s1Count * cellWidth)
      .attr("y1", 0)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#c6ccd0");
  }
}

export function showTooltip(event, tooltip, content) {
  tooltip.style("opacity", 1).html(content);
  moveTooltip(event, tooltip);
}

export function moveTooltip(event, tooltip) {
  tooltip.style("left", `${event.clientX}px`).style("top", `${event.clientY}px`);
}