// load in the major arcana data, make it available in the global name space
let majorArcanaData = null;
let majorArcanaLoaded = false;
fetch('./data/major_arcana.json')
  .then(d => d.json())
  .then(d => {
    majorArcanaData = d;
    majorArcanaLoaded = true;
  });

//Pentacles: outlier strength
// Visualization: histogram with red outlier glyph

//Wands: category variance
// Visualization: bar chart

//Cups: correlation
// Visualization: scatterplot

//Swords: missing data or nulls
// Visualization: histogram with nulls/missing data on the side

/*
Stuff that needs to be in our card objects
suit,
cardtitle: `${value.capitalize()} of ${suit.capitalize()}`,
cardvalue: idx,
tip: `This is the ${value} of ${suit}`,
charttype: CHARTTYPE_MAP[suit],
dims: {
  // xDim will be ignored if not used (e.g. in boxplot)
  xDim: chooseRandom(columnTypes.measure),
  yDim: chooseRandom(columnTypes.measure)
}
*/

/**
 * Entry point for the minor arcana analyses
 * data - array of objects
 */
function generateAllMinorArcana(data) {
  data.reverse();
  const summary = profileFields(data);
  const pentacles = generatePentacles(data, summary);
  const wands = generateWands(data, summary);
  const cups = generateCups(data, summary);
  const swords = generateSwords(data, summary);

  const all = [...pentacles, ...swords, ...cups, ...wands];
  console.log(all);
  return all;
}

/**
 * Determine the largestt z-score difference between values
 * data - array of objects
 * accessor - accessor function
 */
function outlierStrength(data, accessor) {
  //largest z scores
  const stdev = dl.stdev(data, accessor);
  const min = dl.min(data, accessor);
  const max = dl.max(data, accessor);
  const mean = dl.mean(data, accessor);
  return stdev === 0
    ? 0
    : Math.max(Math.abs(min - mean) / stdev, Math.max(max - mean) / stdev);
}

/**
 * Calculate the variance for bar charts
 * data - array of objects
 * x - x dim name, string
 * y - y dim name, string
 * groupFunc - aggregation function for groupby, string
 */
function categoryVarianceStrength(data, x, y, groupFunc = 'mean') {
  const vals = dl
    .groupby(x)
    .summarize([{name: y, ops: [groupFunc], as: ['val']}])
    .execute(data);

  //Normalize values so fields with bigger numbers have bigger strengths.
  const range = dl.max(vals, 'val');
  vals.forEach(function(d) {
    d.val /= range;
  });

  const barVar = dl.variance(vals, 'val');

  return barVar === 0 ? 0 : barVar;
}

// hacks to get around how datalib doesn't like .s in field names
const sanitizeKey = key => key.replace(/\./g, '!!!???!!!');
const unsanitizeKey = key => key.replace(/\!\!\!\?\?\?\!\!\!/g, '.');
/**
 * Generate a basic summary of all of the data fields
 * data - array of objects
 */
function profileFields(data) {
  const types = dl.type.inferAll(data);
  return dl.summary(data).map(d => ({...d, type: types[d.field]}));
}

/**
 * Construct the analyses for the swords
 * The more invalid/missing values, the higher position the field takes
 * data - array of objects
 * summary - field profile object
 */
function generateSwords(_, summary) {
  let swords = summary.map(function(field) {
    let missing = field.count === 0 ? 0 : field.missing;
    missing = field.unique.hasOwnProperty('')
      ? missing + field.unique['']
      : missing;
    return {
      suit: 'swords',
      xDim: field.field,
      yDim: field.field,
      strength: field.count === 0 ? 0 : missing / field.count,
      charttype: 'histogram',
      tip: 'This field has data quality issues.'
    };
  });

  // TODO i suspect this line is deleting all of the swords?
  //Remove fields with no nulls or missing values
  swords = swords.filter(d => d.strength > 0);

  //Sort in descending order of %missing.
  swords.sort(dl.comparator('-strength'));

  //Only return the top 13, since that's all the slots we have
  return swords.slice(0, 14).map(function(d, i) {
    const value = data[i];
    const suit = d.suit;
    return {
      ...d,
      cardtitle: `${value.capitalize()} of ${suit.capitalize()}`,
      cardvalue: value
    };
  });
}

/**
 * Construct the analyses for the pentacles
 * The more extreme the max/min is in terms of z-scores the higher position the field takes
 * data - array of objects
 * summary - field profile object
 */
function generatePentacles(data, summary) {
  let pentacles = summary
    .filter(d => d.type == 'number' || d.type == 'integer')
    .map(field => ({
      suit: 'pentacles',
      xDim: field.field,
      yDim: field.field,
      charttype: 'boxplot',
      strength: outlierStrength(data, field.field),
      tip: 'There is at least one extreme value in this field.'
    }));

  //remove fields with no variation
  pentacles = pentacles.filter(d => d.strength > 0);

  //Sort in descending order of %missing.
  pentacles.sort(dl.comparator('-strength'));

  //Only return the top 13, since that's all the slots we have
  return pentacles.slice(0, 14).map(function(d, i) {
    const value = data[i];
    const suit = d.suit;
    return {
      ...d,
      cardtitle: `${`${value}`.capitalize()} of ${suit.capitalize()}`,
      cardvalue: value
    };
  });
}

/**
 * Construct the analyses for the wands
 * The higher the variance in bar heights when categorical variables are aggregated
 * the higher position the field takes.
 *
 * data - array of objects
 * summary - field profile object
 */
function generateWands(data, summary) {
  let wands = [];
  const qs = summary.filter(d => d.type == 'number' || d.type == 'integer');
  //only want nominal fields where there's at least some aggregation to do
  const ns = summary.filter(
    d =>
      (d.type == 'boolean' || d.type == 'string' || d.distinct == 2) &&
      d.distinct < d.count
  );

  //could potentially check median, max, min, stdev and so on but let's keep it simple for now.
  const funcs = ['mean', 'count'];

  // this sucks, stylistically.
  // I don't really want to build the correlation matrix though, since we're just grabbing the top n.
  funcs.forEach(func =>
    qs.forEach(y =>
      ns.forEach(x => {
        const wandObj = {
          suit: 'wands',
          xDim: x.field,
          yDim: y.field,
          charttype: 'barchart',
          func,
          strength: categoryVarianceStrength(data, x.field, y.field, func),
          tip: 'There is high variably in values in these fields'
        };
        wands.push(wandObj);
      })
    )
  );

  //remove fields with no variation
  wands = wands.filter(d => d.strength > 0);

  //Sort in descending order of quasi-F statistic.
  wands.sort(dl.comparator('-strength'));

  //Only return the top 13, since that's all the slots we have
  return wands.slice(0, 14).map(function(d, i) {
    const value = data[i];
    const suit = d.suit;
    return {
      ...d,
      cardtitle: `${`${value}`.capitalize()} of ${suit.capitalize()}`,
      cardvalue: value
    };
  });
}

/**
 * Construct the analyses for the cups
 * The higher the correlation between two fields, the higher the position.
 *
 * data - array of objects
 * summary - field profile object
 */
function generateCups(data, summary) {
  let cups = [];
  const qs = summary.filter(d => d.type == 'number' || d.type == 'integer');
  qs.forEach(function(x, i) {
    //don't check self-correlation.
    qs.filter((_, j) => i != j).forEach(function(y) {
      const strength = dl.cor(data, x.field, y.field);
      const cupObj = {
        suit: 'cups',
        xDim: x.field,
        yDim: y.field,
        charttype: 'scatterplot',
        strength: strength,
        tip: 'These fields are highly correlated.'
      };
      cups.push(cupObj);
    });
  });

  // remove fields with no correlation, but also fields that are perfectly correlated
  cups = cups.filter(
    d => d.strength > 0 && isFinite(d.strength) && d.strength < 1
  );

  //Sort in descending order of quasi-F statistic.
  cups.sort(dl.comparator('-strength'));

  // Only return the top 13, since that's all the slots we have
  return cups.slice(0, 14).map(function(d, i) {
    const value = data[i];
    const suit = d.suit;
    return {
      ...d,
      cardtitle: `${`${value}`.capitalize()} of ${suit.capitalize()}`,
      cardvalue: value
    };
  });
}

/**
 * Compute the cards in the deck
 * cards have types like
   {
     common to all:
       "cardtitle": string, (our name for the card)
       "tip": string, (the associated tooltip)
       "suit": string (cups, pentacles, wands, swords, "major arcana")

     if major arcana:
       "cardnum": number,
       "tradname": string,
       "image": image name

     if minor arcana:
      "charttype": the chart type to be used, see charts.js
       "dims": {ANY} the necessary information to render teh relevant chart
       "cardvalue": number, the value of the card
   },
 *
 * data - the the data be analyzed by the system
 */
function computeCards(data) {
  const santizedData = data.map(row => {
    return data.columns.reduce((acc, key) => {
      acc[sanitizeKey(key)] = row[key] || null;
      return acc;
    }, {});
  });
  const minor = generateAllMinorArcana(santizedData).map(card => {
    return {
      ...card,
      xDim: unsanitizeKey(card.xDim),
      yDim: unsanitizeKey(card.yDim)
    };
  });
  return {major: majorArcanaData, minor};
}
