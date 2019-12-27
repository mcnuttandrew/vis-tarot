/**
 * A single place where all of the relevant scales are made
 * returns an object of scales.
 *
 * the xWindow and yWindow scales refer to the full viewing pane, and use index coordinates (e.g. 0 to 1)
 *
 * svg - the d3 selection for the full svg pane
 * labels - an array of entities (strings, numbers whatever) to determine the behaviour of the band scale
 */
function makeScales(svg, labels) {
  const width = parseInt(svg.style('width'));
  const height = parseInt(svg.style('height'));
  const margin = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  };
  const xWindow = d3
    .scaleLinear()
    .domain([0, 1.2])
    .range([margin.left, width - margin.left - margin.right]);
  const yWindow = d3
    .scaleLinear()
    .domain([0, 1])
    .range([margin.top, height - margin.bottom - margin.top]);

  const xScale = d3
    .scaleBand()
    .domain(labels)
    .range([0.05, 1 - 0.05])
    .paddingOuter(0.1)
    .paddingInner(0.05);

  return {xScale, xWindow, yWindow};
}

/**
 * Util method for determining the size in index space of the cards, returns an object
 */
function getCardHeightWidth() {
  const size = 0.3;
  let h = size;
  let w = (57.15 / 88.9) * size;
  return {h, w};
}

/**
 * The dumbest shuffling algo imaginable, returns a randomly shuffled copy of an array
 * arr - an array of anything to shuffle
 */
function shuffle(arr) {
  return arr.sort(() => Math.sign(Math.random() - 0.5));
}

const ROMAN_NUM_LOOKUP = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
  'XXI',
  'XXII'
];
/**
 * The dumbest roman numeral generator, just a wrapper to a look up table
 */
function toRomanNumeral(idx) {
  return ROMAN_NUM_LOOKUP[idx];
}
