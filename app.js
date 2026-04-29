import { episodes, loadTranscriptRows, summarizeRows } from "./data.js";
import { renderDetails, renderHeatmap, renderPhraseOwnership, renderRanking } from "./charts.js";
import { renderChord } from "./chord.js"; 

const { d3 } = window;
const state = {
  season: "all",
  rows: [],
  characters: [],
  selected: "Mark Scout",
  heatmapSelection: [],
  heatmapEpisodeSelection: [],
  heatmapSeasonSelection: null,
  heatmapBrushMode: false
};
const formatNumber = d3.format(",");
const tooltip = d3.select("#tooltip");

loadTranscriptRows().then(({ rows }) => {
  state.rows = rows;
  bindControls();
  renderAll();
});

function renderAll() {
  updateSummaries();
  const visibleEpisodes = seasonEpisodes();
  const visibleRows = filteredRows();
  const renderContext = {
    characters: state.characters,
    selectedCharacter: state.selected,
    visibleEpisodes: visibleEpisodes,
    visibleRows: visibleRows,
    formatNumber: formatNumber,
    tooltip: tooltip,
    onSelect: selectCharacter,
    selectedHeatmapCharacters: state.heatmapSelection,
    onToggleHeatmapCharacter: toggleHeatmapCharacter,
    selectedHeatmapEpisodes: state.heatmapEpisodeSelection,
    onToggleHeatmapEpisode: toggleHeatmapEpisode,
    selectedHeatmapSeason: state.heatmapSeasonSelection,
    onToggleHeatmapSeason: toggleHeatmapSeason,
    heatmapBrushMode: state.heatmapBrushMode,
    onBrushSelect: applyHeatmapBrushSelection
  };

  renderRanking(renderContext);
  renderDetails(renderContext);
  renderHeatmap(renderContext);
  renderPhraseOwnership(renderContext);
  renderChord(renderContext);
  updateHeatmapControls();
  d3.select("#episode-count").text(episodes.length);
}

function updateSummaries() {
  state.characters = summarizeRows(filteredRows());
  if (!state.characters.some(d => d.character === state.selected)) {
    state.selected = state.characters[0]?.character || "Mark Scout";
  }
}

function filteredRows() {
  return state.season === "all"
    ? state.rows
    : state.rows.filter(d => d.season === Number(state.season));
}

function seasonEpisodes() {
  return state.season === "all"
    ? episodes
    : episodes.filter(d => d.season === Number(state.season));
}

function selectCharacter(character) {
  state.selected = character;
  renderAll();
}

function toggleHeatmapCharacter(character) {
  const current = new Set(state.heatmapSelection);
  if (current.has(character)) {
    current.delete(character);
  } else {
    current.add(character);
  }
  state.heatmapSelection = Array.from(current);
  renderAll();
}

function toggleHeatmapEpisode(episodeId) {
  const current = new Set(state.heatmapEpisodeSelection);
  if (current.has(episodeId)) {
    current.delete(episodeId);
  } else {
    current.add(episodeId);
  }
  state.heatmapEpisodeSelection = Array.from(current);
  renderAll();
}

function toggleHeatmapSeason(season) {
  if (state.heatmapSeasonSelection === season) {
    state.heatmapSeasonSelection = null;
    state.heatmapEpisodeSelection = [];
  } else {
    state.heatmapSeasonSelection = season;
  }
  renderAll();
}

function applyHeatmapBrushSelection({ characters, episodes }) {
  const nextCharacters = new Set(state.heatmapSelection);
  characters.forEach(character => nextCharacters.add(character));
  const nextEpisodes = new Set(state.heatmapEpisodeSelection);
  episodes.forEach(episodeId => nextEpisodes.add(episodeId));
  state.heatmapSelection = Array.from(nextCharacters);
  state.heatmapEpisodeSelection = Array.from(nextEpisodes);
  renderAll();
}

function toggleHeatmapBrushMode() {
  state.heatmapBrushMode = !state.heatmapBrushMode;
  renderAll();
}

function clearHeatmapSelections() {
  state.heatmapSelection = [];
  state.heatmapEpisodeSelection = [];
  state.heatmapSeasonSelection = null;
  renderAll();
}

function updateHeatmapControls() {
  d3.select("#heatmap-brush-toggle")
    .classed("active", state.heatmapBrushMode)
    .attr("aria-pressed", state.heatmapBrushMode ? "true" : "false")
    .text("Brush");

  d3.select("#heatmap-clear-button").on("click", clearHeatmapSelections);
  d3.select("#heatmap-brush-toggle").on("click", toggleHeatmapBrushMode);
}

function bindControls() {
  d3.selectAll(".tab").on("click", function() {
    state.season = this.dataset.season;
    d3.selectAll(".tab").classed("active", false);
    d3.select(this).classed("active", true);
    renderAll();
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 120);
  });
}