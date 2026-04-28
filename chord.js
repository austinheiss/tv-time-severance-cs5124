import { displayName, factsFor, imageFor, roleFor } from "./data.js";
import{ DISPLAYED_CHARACTER_COUNT } from "./charts.js"

const { d3 } = window;


export function renderChord({ characters, visibleEpisodes, visibleRows, tooltip, formatNumber, onSelect }) {
    const svg = d3.select("#chord-chart");
    const width = Math.max(720, svg.node().getBoundingClientRect().width);
    const topRows = characters.slice(0, DISPLAYED_CHARACTER_COUNT);
    const margin = { top: 46, right: 0, bottom: 14, left: 184 };
    const rowHeight = 27;
    const cellGap = 2;
    const height = margin.top + topRows.length * rowHeight + margin.bottom;
    const maxWords = d3.max(topRows, d => d3.max(Array.from(d.episodeWords.values()))) || 1;
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 10;

    // console.log(visibleRows);
    // const chord = d3.chord()
    //     .padAngle(10 / innerRadius)
    //     .sortSubgroups(d3.descending)
    //     .sortChords(d3.descending);

    // const arc = d3.arc()
    //     .innerRadius(innerRadius)
    //     .outerRadius(outerRadius);

    // const ribbon = d3.ribbon()
    //     .radius(innerRadius - 1)
    //     .padAngle(1 / innerRadius);

    // const color = d3.scaleOrdinal(names, colors);
}