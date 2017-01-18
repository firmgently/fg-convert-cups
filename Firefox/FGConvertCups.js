var
DEFAULT_CUPSIZE = 240, // default
mlToLitreMult = 0.001,
litreRounding = 10, // 10 = 1 decimal place, 100 = 2 dec. pl
celsiusRounding = 10, // 10 = round to nearest 10
patternCups = "", patternFahr = "",
cupsToMlMult, convertCupString, convertFahrString, replaceTextInNode, messageHandler,
regExpCups, regExpFahr, regExpFahrCheap;

// build the pattern for the cups regular expression
patternCups += "(?!\\s?cup)"; // negative lookahead - whitespace (optional) and 'cup' can't be the next thing (prevents match on eg. 'beefcup'/'cups')
patternCups += "(?!\\b)?"; // word boundary (noncapturing optional group)
patternCups += "(\\d+\\s?)?"; // one or more digits, optionally followed by whitespace (optional group)
patternCups += "(\\d+(?:[/.]\\d+))?"; // one or more digits, optionally followed by a noncapturing group of a slash or dot and one or more digits (optional group)
patternCups += "\\s?"; // whitespace character (optional)
patternCups += "(¼|⅓|½|⅔|¾)?"; // unicode fraction (optional group)
patternCups += "(&frac14;|&frac12;|&frac34;)?"; // HTML entity fractions (optional group)
patternCups += "(&#188;|&#8531;|&#189;|&#8532;|&#190;)?"; // HTML decimal fractions (optional group)
patternCups += "(&#xBC;|&#x2153;|&#xBD;|&#x2154;|&#xBE;)?"; // HTML hexadecimal fractions (optional group)
patternCups += "\\s?"; // optional whitespace character
patternCups += "(?:cups|cup)"; // longest string first eg. cups|cup not cup|cups (noncapturing compulsory group)

// build the pattern for the fahrenheit regular expression
patternFahr += "(\\d+(?:.\\d+)?)+\\s?"; // at least 1 digit with or without decimal point and/or whitespace
patternFahr += "(?:"; // begin noncapturing group
patternFahr += "(?:(?:°|degrees|deg|&#176;|&deg;)\\s?)"; // noncapturing degree group with/without whitespace
patternFahr += "|"; // OR seperator
patternFahr += "(?:(?:farhenheit|fahrenheit|f\\b))"; // noncapturing fahrenheit group
patternFahr += ")+"; // require at least one of two previous groups

regExpCups = new RegExp(patternCups, 'ig');
regExpFahr = new RegExp(patternFahr, 'ig');
regExpFahrCheap = new RegExp(/\d+(.+)?(f|d|°|&#176;|&deg;)+/, 'ig');

// get cup size from options
chrome.storage.local.get(
  { 'chosencupsize': DEFAULT_CUPSIZE },
  function(result){
    cupsToMlMult = parseInt(result.chosencupsize);
    replaceTextInNode(document.body);
  }
);



// convertCupString is called from within the scope of a regular expression
// (so is a string replace callback). The RegExp passes all groupings/substrings as
// consecutive arguments
convertCupString = function(match, whole, longFrac, uniFrac, entFrac, decFrac, hexFrac) {
  var
  wholeNum = whole === undefined ? 0 : parseInt(whole, 10),
  fraction = 0,
  ml, str;

  if (longFrac) {
    // eval is perfect for this job and deemed to be safe in this context as
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
    str = (Math.round((ml * mlToLitreMult) * litreRounding) / litreRounding) + "L";
  } else {
    str = ml + "ml";
  }

  str = "<span class='fg-converted-cup'>" + str;
  str += "<span>" + match + "</span>";
  str += "</span>";
  return str;
};

convertFahrString = function(match, degrees) {
  var celsius, str;
  // TODO make sure temperature is within  sensible range for oven
  celsius = Math.round(((degrees-32) * (5/9)) / celsiusRounding) * celsiusRounding;
  str = celsius + "&deg;C";
  str = "<span class='fg-converted-cup'>" + str;
  str += "<span>" + match + "</span>";
  str += "</span>";
  return str;
};

// replaceTextInNode scans through a node replacing all cups with millilitres
// then recurses into any child nodes
replaceTextInNode = function(parentNode) {
  var node, nodeParentElement;
  for (var i = parentNode.childNodes.length-1; i >= 0; i--){
    node = parentNode.childNodes[i];

    if (node.nodeType == Element.TEXT_NODE && node.parentElement) {
      nodeParentElement = node.parentElement;
      if (node.textContent.toLowerCase().indexOf("cup") !== -1) { // optimisation to prevent slow RegExp being run against every text node
        nodeParentElement.innerHTML = nodeParentElement.innerHTML.replace(regExpCups, convertCupString);
      }
      // do simple check for something that looks like a fahrenheit temp first
      // to save doing expensive replace with complex regex
      if (node.textContent.match(regExpFahrCheap)) {
        nodeParentElement.innerHTML = nodeParentElement.innerHTML.replace(regExpFahr, convertFahrString);
      }
    } else if (node.nodeType == Element.ELEMENT_NODE){
      //  recurse into child nodes
      replaceTextInNode(node);
    }
  }
};

messageHandler = function(ob, sender) {
  if (ob.message === "optionsSaved") { window.location.reload(); }
};

chrome.runtime.onMessage.addListener(messageHandler);
