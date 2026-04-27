import { episodes, loadTranscriptRows, summarizeRows } from "./data.js";
import { renderDetails, renderHeatmap, renderRanking } from "./charts.js";

const { d3 } = window;
const state = {
  season: "all",
  rows: [],
  characters: [],
  selected: "Mark Scout"
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
  const renderContext = {
    characters: state.characters,
    selectedCharacter: state.selected,
    visibleEpisodes,
    formatNumber,
    onSelect: selectCharacter
  };

  renderRanking(renderContext);
  renderDetails(renderContext);
  renderHeatmap({ ...renderContext, tooltip });
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
