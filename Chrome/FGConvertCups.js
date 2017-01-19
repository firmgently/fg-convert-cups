var
ML_TO_LITRE_MULT = 0.001,
LITRE_DEC_ROUNDING = 10, // 10 = 1 decimal place, 100 = 2 dec. pl
TEMPERATURE_ROUNDING = 10, // 10 = round to nearest 10

patternCups = "", patternFahr = "",
patternMl = "", patternCels = "",
constants = {},

cupsToMlMult,
convertCupString, convertFahrString,
convertMlString, convertCelsString,
getStoredData, replaceTextInNode, messageHandler,
onSendMessage, onStorageGet,
measurementConvertTo, temperatureConvertTo,
fractionaliseCups,
regExpCups, regExpFahr, regExpFahrCheap, regExpMlCheap,
regExpMl, regExpCels, regExpCelsCheap;

// build the pattern for the cups regular expression
// TODO not capturing eg. '¼ cup' ("fraction first")
// TODO some recipes use asterisk as degrees symbol
patternCups += "(?!\\s?cup)"; // negative lookahead - whitespace (optional) and 'cup' can't be the next thing (prevents match on eg. 'beefcup'/'cups')
patternCups += "\\b"; // word boundary
patternCups += "(\\d+\\s?)?"; // one or more digits, optionally followed by whitespace (optional group)
patternCups += "(\\d+(?:[/.]\\d+))?"; // one or more digits, optionally followed by a noncapturing group of a slash or dot and one or more digits (optional group)
patternCups += "\\s?"; // whitespace character (optional)
patternCups += "(¼|⅓|½|⅔|¾)?"; // unicode fraction (optional group)
patternCups += "(&frac14;|&frac12;|&frac34;)?"; // HTML entity fractions (optional group)
patternCups += "(&#188;|&#8531;|&#189;|&#8532;|&#190;)?"; // HTML decimal fractions (optional group)
patternCups += "(&#xBC;|&#x2153;|&#xBD;|&#x2154;|&#xBE;)?"; // HTML hexadecimal fractions (optional group)
patternCups += "\\s?"; // optional whitespace character
patternCups += "(?:cups|cup)"; // longest string first eg. cups|cup not cup|cups (noncapturing compulsory group)
console.log(patternCups);

// build the pattern for the fahrenheit regular expression
patternFahr += "(\\d+(?:.\\d+)?)+\\s?"; // at least 1 digit with or without decimal point and/or whitespace
patternFahr += "(?:"; // begin noncapturing group
patternFahr += "(?:(?:°|degrees|deg|&#186;|&#176;|&deg;|º|&ordm;|&#xba;)\\s?)"; // noncapturing degree group with/without whitespace
patternFahr += "(?!\\s?c)"; // not followed by c (rules out centigrade false positives)
patternFahr += "|"; // OR seperator
patternFahr += "(?:(?:farhenheit|fahrenheit|f\\b))"; // noncapturing fahrenheit group
patternFahr += ")+"; // require at least one of two previous groups
console.log(patternFahr);

// build the pattern for the ml/litres regular expression
// patternMl += "(?!\\s?(?:m|l))"; // negative lookahead - whitespace (optional) and 'm' or 'l' can't be the next thing
patternMl += "\\b"; // word boundary
patternMl += "(\\d+(?:[/.]\\d+)?)"; // one or more digits, optionally followed by a noncapturing group of a slash or dot and one or more digits (optional group)
patternMl += "\\s?"; // optional whitespace character
patternMl += "(?:milliliters|millilitres|milliliter|millilitre|litres|liters|litre|liter|ml|mi|l)"; // longest string first eg. cups|cup not cup|cups (noncapturing compulsory group)
console.log(patternMl);

// build the pattern for the celsius regular expression
patternCels += "(\\d+(?:.\\d+)?)+\\s?"; // at least 1 digit with or without decimal point and/or whitespace
patternCels += "(?:"; // begin noncapturing group
patternCels += "(?:(?:°|degrees|deg|&#186;|&#176;|&deg;|º|&ordm;|&#xba;)\\s?)"; // noncapturing degree group with/without whitespace
patternCels += "(?!\\s?f)"; // not followed by f (rules out fahrenheit false positives)
patternCels += "|"; // OR seperator
patternCels += "(?:(?:celsius|centigrade|c\\b))"; // noncapturing fahrenheit group
patternCels += ")+"; // require at least one of two previous groups

regExpCups = new RegExp(patternCups, 'ig');
regExpFahr = new RegExp(patternFahr, 'ig');
regExpMl = new RegExp(patternMl, 'ig');
regExpCels = new RegExp(patternCels, 'ig');
regExpFahrCheap = new RegExp(/\d+(.+)?(f|d|°|&#176;|&deg;)+/, 'ig');
regExpCelsCheap = new RegExp(/\d+(.+)?(c|d|°|&#176;|&deg;)+/, 'ig');
regExpMlCheap = new RegExp(/\d+(.+)?(millilitres|litres|ml|l|)+/, 'ig');

onSendMessage = function(response) {
  var prop;
  if (response.constants) {
    for (prop in response.constants) { constants[prop] = response.constants; }
    getStoredData();
  }
};

getStoredData = function() {
  chrome.storage.local.get({
    cupsize: constants.DEFAULT_CUPSIZE,
    measurementConvertTo: constants.DEFAULT_MEASUREMENT_CONVERT_TO,
    temperatureConvertTo: constants.DEFAULT_TEMPERATURE_CONVERT_TO
  }, onStorageGet);
};

onStorageGet = function(result){
  cupsToMlMult = parseInt(result.cupsize);
  measurementConvertTo = result.measurementConvertTo;
  temperatureConvertTo = result.temperatureConvertTo;
  // TODO only allow conversion once per page load (otherwise get weird results)
  replaceTextInNode(document.body);
};


// convertCupString is called from within the scope of a regular expression
// (so is a string replace callback). The RegExp passes all groupings/substrings as
// consecutive arguments
convertCupString = function(match, whole, longFrac, uniFrac, entFrac, decFrac, hexFrac) {
  var
  wholeNum = whole === undefined ? 0 : parseInt(whole, 10),
  fraction = 0,
  ml, str;

  if (longFrac) {
    // eval is perfect for this job and I'm calling it safe in this context as
    // input (longFrac) is taken from the DOM only and if the user is on a
    // site where the DOM is compromised then it can run malicious JS already
    /* jshint ignore:start */
    fraction = eval(longFrac);
    /* jshint ignore:end */
  } else if (uniFrac === "¼" || entFrac === "&frac14" || decFrac === "&#188;" || hexFrac === "&#xBC;") {
    fraction = 0.25;
  } else if (uniFrac === "⅓" || decFrac === "&#8531;" || hexFrac === "&#x2153;") {
    fraction = 0.3333;
  } else if (uniFrac === "½" || entFrac === "&frac12" || decFrac === "&#189;" || hexFrac === "&#xBD;") {
    fraction = 0.5;
  } else if (uniFrac === "⅔" || decFrac === "&#8532;" || hexFrac === "&#x2154;") {
    fraction = 0.6666;
  } else if (uniFrac === "¾" || entFrac === "&frac34" || decFrac === "&#190;" || hexFrac === "&#xBE;") {
    fraction = 0.75;
  }

  ml = Math.round((wholeNum + fraction) * cupsToMlMult);
  if (ml > 1000) { // show big values as litres not ml
    str = (Math.round((ml * ML_TO_LITRE_MULT) * LITRE_DEC_ROUNDING) / LITRE_DEC_ROUNDING) + "L";
  } else {
    str = ml + "ml";
  }

  str = "<span class='fg-converted-cup'>" + str;
  str += "<span>" + match + "</span>";
  str += "</span>";
  return str;
};

// constants is called from within the scope of a regular expression
// (so is a string replace callback).
convertMlString = function(match, whole) {
  var
  wholeNum = whole === undefined ? 0 : parseInt(whole, 10), // if lower than 10 presume this is litres and not ml
  ml = (wholeNum < 10) ? wholeNum * 1000 : wholeNum,
  cups, str;

  cups = ml / cupsToMlMult;
  str = fractionaliseCups(cups) + " cups";

  str = "<span class='fg-converted-cup'>" + str;
  str += "<span>" + match + "</span>";
  str += "</span>";
  return str;
};

convertFahrString = function(match, degrees) {
  var celsius, str;
  celsius = Math.round(((degrees-32) * (5/9)) / TEMPERATURE_ROUNDING) * TEMPERATURE_ROUNDING;
  str = celsius + "&deg;C";
  str = "<span class='fg-converted-cup'>" + str;
  str += "<span>" + match + "</span>";
  str += "</span>";
  return str;
};

convertCelsString = function(match, degrees) {
  var fahrenheit, str;
  fahrenheit = Math.round(((degrees * (9/5)) + 32) / TEMPERATURE_ROUNDING) * TEMPERATURE_ROUNDING;
  str = fahrenheit + "&deg;F";
  str = "<span class='fg-converted-cup'>" + str;
  str += "<span>" + match + "</span>";
  str += "</span>";
  return str;
};

fractionaliseCups = function(n) {
  var
  str = ("" + n),
  ar = str.split("."),
  whole = ar[0],
  fraction;

  console.log(n);

  if (ar.length == 2) {
    fraction = parseFloat("0." + ar[1], 10);
    console.log("\tfraction: " + fraction);
    if (fraction < 0.15) {
      fraction = ""; // round down
    } else if (fraction < 0.3) {
      fraction = "&frac14"; // 1/4
    } else if (fraction < 0.4) {
      fraction = "&#8531;"; // 1/3
    } else if (fraction < 0.6) {
      fraction = "&frac12"; // 1/2
    } else if (fraction < 0.7) {
      fraction = "&#8532;"; // 2/3
    } else if (fraction < 0.8) {
      fraction = "&frac34"; // 3/4
    } else if (fraction < 0.9) {
      whole = parseInt(whole, 10) + 1; // round up
      whole = "" + whole;
    }
  }

  console.log("\twhole: " + whole);
  console.log("\tfraction: " + fraction);
  return whole + fraction;
};

// replaceTextInNode scans through a node replacing all cups with millilitres
// then recurses into any child nodes
replaceTextInNode = function(parentNode) {
  var
  i, lastChildNodeIndex = parentNode.childNodes.length-1,
  node, nodeParentElement;

  for (i = lastChildNodeIndex; i >= 0; i--){
    node = parentNode.childNodes[i];

    if (node.nodeType == Element.TEXT_NODE && node.parentElement) {
      nodeParentElement = node.parentElement;
      if (measurementConvertTo === "ML") {
        if (node.textContent.toLowerCase().indexOf("cup") !== -1) { // optimisation to prevent slow RegExp being run against every text node
          nodeParentElement.innerHTML = nodeParentElement.innerHTML.replace(regExpCups, convertCupString);
        }
      } else {
        if (node.textContent.match(regExpMlCheap)) { // optimisation to prevent slow RegExp being run against every text node
          nodeParentElement.innerHTML = nodeParentElement.innerHTML.replace(regExpMl, convertMlString);
        }
      }
      if (temperatureConvertTo === "C") {
        // do simple check for something that looks like a fahrenheit temp first
        // to save doing expensive replace with complex regex
        if (node.textContent.match(regExpFahrCheap)) {
          nodeParentElement.innerHTML = nodeParentElement.innerHTML.replace(regExpFahr, convertFahrString);
        }
      } else {
        if (node.textContent.match(regExpCelsCheap)) {
          nodeParentElement.innerHTML = nodeParentElement.innerHTML.replace(regExpCels, convertCelsString);
        }
      }
    } else if (node.nodeType == Element.ELEMENT_NODE){
      replaceTextInNode(node); // recurse into child nodes
    }
  }
};

messageHandler = function(ob, sender) {
  // reload when options are changed by the user (to prevent confusion
  // over old conversion values being shown)
  if (ob.message === "optionsSaved") { window.location.reload(); }
};

chrome.runtime.onMessage.addListener(messageHandler);

// start setup by requesting app constants
chrome.runtime.sendMessage({message: 'requestConstants'}, onSendMessage);
