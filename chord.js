import { displayName, factsFor, imageFor, roleFor, canonicalSpeaker } from "./data.js";
import{ DISPLAYED_CHARACTER_COUNT, showTooltip, moveTooltip } from "./charts.js"

const { d3 } = window;


export function renderChord({ characters, visibleEpisodes, visibleRows, tooltip, formatNumber, onSelect }) {
    const width = 800;
    const margin = { top: 100, right: 100, bottom: 100, left: 100 };
    const height = 800
    const topRows = new Set(Array.from(
        characters.slice(0, DISPLAYED_CHARACTER_COUNT),
        (d) => canonicalSpeaker(d.character)
    ));
    d3.select("#chord-chart").selectAll("*").remove();
    console.log(topRows)

    const topVisibleRows = visibleRows.filter(
        (d) => (
            topRows.has(canonicalSpeaker(d.canonical)) & 
            topRows.has(canonicalSpeaker(d.talking_to))
        )
    )
    var names = Array.from(topRows);
    const colors = d3.scaleOrdinal(names, d3.schemePaired);
    
    let matrix = buildInteractionMatrix(topVisibleRows).matrix;

    const innerRadius = Math.min(width, height) * 0.4;
    const outerRadius = innerRadius + 6;

    const chord = d3.chordDirected()
        .padAngle(12 / innerRadius)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const ribbon = d3.ribbonArrow()
        .radius(innerRadius - 0.5)
        .padAngle(1 / innerRadius);

    const svg = d3.select("#chord-chart")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "width: 100%; height: auto; font: 10px sans-serif;");

    const chords = chord(matrix);

    svg.append("path")
        .attr("fill", "none")
        .attr("d", d3.arc()({outerRadius, startAngle: 0, endAngle: 2 * Math.PI}));

    const ribbons = svg.append("g")
        .attr("fill-opacity", 0.75)
        .selectAll()
        .data(chords)
        .join("path")
        .attr("d", ribbon)
        .attr("fill", d => colors(names[d.source.index]))
        .style("mix-blend-mode", "multiply")
        .on("mouseenter", function(event, d) {
            ribbons.style("opacity", r =>
                (r === d ? 1 : 0.25)
            );
            showTooltip(
                event,
                tooltip, 
                `${names[d.source.index]} said ${d.source.value} words to ${names[d.target.index]}`) 
        })
        .on("mousemove", event => moveTooltip(event, tooltip))
        .on("mouseleave", function() {
            ribbons.style("opacity", 1);
            tooltip.style("opacity", 0)
        });

    const g = svg.append("g")
      .selectAll()
      .data(chords.groups)
      .join("g");

    const arcs = g.append("path")
        .attr("d", arc)
        .attr("fill", d => colors(names[d.index]))
        .attr("stroke", "#fff")
        .on("mouseenter", function(event, d) {
            arcs.style("opacity", r =>
                (r === d ? 1 : 0.25)
            );
            ribbons.style("opacity", r =>
                (r === d ? 1 : 0.25)
            );
            showTooltip(
                event,
                tooltip, 
                `${names[d.index]} said ${d3.sum(matrix[d.index])} words and was told ${d3.sum(matrix, row => row[d.index])} words`
            )
        })
        .on("mousemove", event => moveTooltip(event, tooltip))
        .on("mouseleave", function() {
            arcs.style("opacity", 1);
            ribbons.style("opacity", 1);
            tooltip.style("opacity", 0)
        });

    const tickStep = d3.tickStep(0, d3.sum(matrix.flat()), 50);
    const groupTick = g.append("g")
        .selectAll()
        .data(d => groupTicks(d, tickStep))
        .join("g")
        .attr("transform", d => `rotate(${d.angle * 180 / Math.PI - 90}) translate(${outerRadius},0)`);

    groupTick.append("line")
        .attr("stroke", "currentColor")
        .attr("x2", 6);

    groupTick.append("text")
        .attr("x", 8)
        .attr("dy", "0.35em")
        .attr("transform", d => d.angle > Math.PI ? "rotate(180) translate(-16)" : null)
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
        .text(d => d.value);

    g.select("text")
        .attr("font-weight", "bold")
        .text(function(d) {
            return this.getAttribute("text-anchor") === "end"
            ? `↑ ${names[d.index]}`
            : `${names[d.index]} ↓`;
        });
}



function buildInteractionMatrix(dialogues) {
  // Step 1: collect unique character names
  const characters = new Set();
  dialogues.forEach(d => {
    characters.add(canonicalSpeaker(d.canonical));
    characters.add(canonicalSpeaker(d.talking_to));
  });

  const charList = Array.from(characters);
  const n = charList.length;

  // Map character -> index
  const charToIdx = {};
  charList.forEach((c, i) => {
    charToIdx[canonicalSpeaker(c)] = i;
  });

  // Step 2: initialize matrix (n x n)
  const matrix = Array.from({ length: n }, () =>
    Array(n).fill(0)
  );

  // Step 3: fill matrix
  dialogues.forEach(d => {
    const speakerIdx = charToIdx[canonicalSpeaker(d.canonical)];
    const listenerIdx = charToIdx[canonicalSpeaker(d.talking_to)];

    // Count words (simple split on whitespace)
    const wordCount = d.text.trim().split(/\s+/).filter(Boolean).length;

    // (i, j): words character j spoke to character i
    matrix[listenerIdx][speakerIdx] += wordCount;
  });

  return { matrix, charList };
}


function groupTicks(d, step) {
  const k = (d.endAngle - d.startAngle) / d.value;
  return d3.range(0, d.value, step).map(value => {
    return {value: value, angle: value * k + d.startAngle};
  });
}