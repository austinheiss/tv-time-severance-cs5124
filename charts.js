import { displayName, factsFor, imageFor, roleFor } from "./data.js";

const { d3 } = window;
const DISPLAYED_CHARACTER_COUNT = 15;

export function renderDetails({ characters, selectedCharacter, visibleEpisodes, formatNumber }) {
  const selected = characters.find(d => d.character === selectedCharacter) || characters[0];
  if (!selected) return;

  renderAvatar(selected.character);
  d3.select("#selected-name").text(displayName(selected.character));
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

export function renderHeatmap({ characters, visibleEpisodes, tooltip, formatNumber, onSelect }) {
  const svg = d3.select("#heatmap-chart");
  const width = Math.max(720, svg.node().getBoundingClientRect().width);
  const topRows = characters.slice(0, DISPLAYED_CHARACTER_COUNT);
  const margin = { top: 46, right: 0, bottom: 14, left: 184 };
  const rowHeight = 27;
  const cellGap = 2;
  const innerWidth = width - margin.left - margin.right;
  const cellWidth = innerWidth / visibleEpisodes.length;
  const height = margin.top + topRows.length * rowHeight + margin.bottom;
  const maxWords = d3.max(topRows, d => d3.max(Array.from(d.episodeWords.values()))) || 1;
  const color = d3.scaleSequential()
    .domain([0, maxWords])
    .interpolator(t => d3.interpolateRgb("#eef5f4", "#0d6a67")(Math.pow(t, 0.7)));

  clearSvg(svg, width, height);
  drawSeasonLabels(svg, visibleEpisodes, margin, cellWidth, height);

  visibleEpisodes.forEach((episode, index) => {
    svg.append("text")
      .attr("class", "episode-label")
      .attr("x", margin.left + index * cellWidth + cellWidth / 2)
      .attr("y", 38)
      .attr("text-anchor", "middle")
      .text(episode.label);
  });

  topRows.forEach((character, index) => {
    const row = svg.append("g")
      .attr("class", "heat-row")
      .attr("transform", `translate(0, ${margin.top + index * rowHeight})`);

    row.append("text")
      .attr("class", "heat-label")
      .attr("x", 0)
      .attr("y", 18)
      .text(character.display);

    visibleEpisodes.forEach((episode, episodeIndex) => {
      const words = character.episodeWords.get(episode.id) || 0;
      row.append("rect")
        .attr("class", "heat-cell")
        .attr("x", margin.left + episodeIndex * cellWidth)
        .attr("y", 0)
        .attr("width", Math.max(2, cellWidth - cellGap))
        .attr("height", rowHeight - cellGap)
        .attr("fill", words ? color(words) : "#edf2f2")
        .on("mouseenter", event => showTooltip(event, tooltip, `<strong>${character.display}</strong><br>${episode.label}: ${formatNumber(words)} words`))
        .on("mousemove", event => moveTooltip(event, tooltip))
        .on("mouseleave", () => tooltip.style("opacity", 0))
        .on("click", () => onSelect(character.character));
    });
  });
}

function clearSvg(svg, width, height) {
  svg.attr("viewBox", `0 0 ${width} ${height}`)
    .style("height", `${height}px`)
    .selectAll("*")
    .remove();
}

function drawSeasonLabels(svg, episodes, margin, cellWidth, height) {
  const s1Count = episodes.filter(d => d.season === 1).length;
  const s2Count = episodes.filter(d => d.season === 2).length;
  if (s1Count) {
    svg.append("text").attr("class", "season-label").attr("x", margin.left + (s1Count * cellWidth) / 2).attr("y", 16).attr("text-anchor", "middle").text("SEASON 1");
  }
  if (s2Count) {
    svg.append("text").attr("class", "season-label").attr("x", margin.left + s1Count * cellWidth + (s2Count * cellWidth) / 2).attr("y", 16).attr("text-anchor", "middle").text("SEASON 2");
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

function showTooltip(event, tooltip, content) {
  tooltip.style("opacity", 1).html(content);
  moveTooltip(event, tooltip);
}

function moveTooltip(event, tooltip) {
  tooltip.style("left", `${event.clientX}px`).style("top", `${event.clientY}px`);
}
