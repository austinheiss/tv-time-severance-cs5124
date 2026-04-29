import { displayName, factsFor, imageFor, roleFor, canonicalSpeaker } from "./data.js";
import{ DISPLAYED_CHARACTER_COUNT } from "./charts.js"

const { d3 } = window;


export function renderChord({ characters, visibleEpisodes, visibleRows, tooltip, formatNumber, onSelect }) {
    const width = 800;
    const margin = { top: 100, right: 100, bottom: 100, left: 100 };
    const height = 800
    const outerRadius = Math.min(width, height) * 0.4 - 60;
    const innerRadius = outerRadius - 10;
    const topRows = new Set(Array.from(
        characters.slice(0, DISPLAYED_CHARACTER_COUNT),
        (d) => canonicalSpeaker(d.character)
    ));
    d3.select("#chord-chart").selectAll("*").remove();

    const svg = d3.select("#chord-chart")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [
            -width / 2,
            -height / 2,
            width,
            height,
        ])
        .attr("style", "width: 100%; height: auto; font: 10px sans-serif;");

    const chord = d3.chord()
        .padAngle(10 / innerRadius)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
        .radius(innerRadius - 1)
        .padAngle(1 / innerRadius);

    const topVisibleRows = visibleRows.filter(
        (d) => (
            topRows.has(canonicalSpeaker(d.canonical)) & 
            topRows.has(canonicalSpeaker(d.talking_to))
        )
    )
    var names = Array.from(topRows);
    const color = d3.scaleOrdinal(names, d3.schemePaired);
    
    let wordCountMatrix = buildInteractionMatrix(topVisibleRows).matrix;

    const tickStep = d3.tickStep(0, d3.sum(wordCountMatrix.flat()), 100);
    const chords = chord(wordCountMatrix);

    const group = svg.append("g")
        .selectAll()
        .data(chords.groups)
        .join("g");

    group.append("path")
        .attr("fill", d => color(names[d.index]))
        .attr("d", arc);

    group.append("title")
        .text(d => `${names[d.index]}\n${d.value}`);

    const groupTick = group.append("g")
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

    group.select("text")
        .attr("font-weight", "bold")
        .text(function(d) {
          return this.getAttribute("text-anchor") === "end"
              ? `↑ ${names[d.index]}`
              : `${names[d.index]} ↓`;
        });

    svg.append("g")
        .attr("fill-opacity", 0.8)
        .selectAll("path")
        .data(chords)
        .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("fill", d => color(names[d.source.index]))
        .attr("d", ribbon)
        .append("title")
        .text(d => `${d.source.value} ${names[d.target.index]} → ${names[d.source.index]}${d.source.index === d.target.index ? "" : `\n${d.target.value} ${names[d.source.index]} → ${names[d.target.index]}`}`);
}


        // .on("mouseover", (event, d) => {
        //     d3.select("#tooltip")
        //         .style("display", "block")
        //         .html(`<p>test</p>`)
        //         .style("border", "1px solid #69b3a2");
        // })
        // .on("mousemove", (event) => {
        //     d3.select("#tooltip")
        //         .style("left", (event.pageX + 15) + "px")
        //         .style("top", (event.pageY + 15) + "px");
        // })
        // .on("mouseout", () => {
        //     d3.select("#tooltip")
        //         .style("display", "none");
        // });


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