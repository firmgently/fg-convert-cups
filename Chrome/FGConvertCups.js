
/*

ConvertCups extension by FirmGently (2017)

Converts recipe measurements from cups-to-ml or ml-to-cups.

---------------------------------------------------------
*/

// create namespace: uk.co.firmgently
var uk = (uk !== undefined) ? uk : {};
uk.co = (uk.co !== undefined) ? uk.co : {};
uk.co.firmgently = (uk.co.firmgently !== undefined) ? uk.co.firmgently : {};

if ("undefined" === typeof(FGConvertCups)) {var FGConvertCups = {};}
uk.co.firmgently.FGConvertCups = (function() {
  var
  ML_TO_LITRE_MULT = 0.001,
  LITRE_DEC_ROUNDING = 10, // 10 = 1 decimal place, 100 = 2 dec. pl
  TEMPERATURE_ROUNDING = 10, // 10 = round to nearest 10

  patternCups = "", patternFahr = "",
  patternMl = "", patternCels = "",
  constants = {},

  logMsg, cupsToMlMult,
  convertCupString, convertFahrString,
  convertMlString, convertCelsString,
  convertStringFraction,
  getStoredData, replaceTextInNode, messageHandler,
  onSendMessage, onStorageGet, wrapMatchedText,
  measurementConvertTo, temperatureConvertTo,
  fractionaliseCups,
  regExpCups, regExpFahr, regExpFahrCheap, regExpMlCheap,
  regExpMl, regExpCels, regExpCelsCheap;


  // build the pattern for the cups regular expression
  patternCups += "(?!\\s?cup)"; // negative lookahead - whitespace (optional) and 'cup' can't be the next thing (prevents match on eg. 'beefcup'/'cups')
  patternCups += "(\\d+\\s?)?"; // one or more digits, optionally followed by whitespace (optional group)
  patternCups += "(\\d+(?:[/.]\\d+)\\s?)?"; // one or more digits, optionally followed by a noncapturing group of a slash or dot, one or more digits and optional whitespace (optional group)
  patternCups += "(¼|⅓|½|⅔|¾|⅒)?"; // unicode fraction (optional group)
  patternCups += "(&frac14;|&frac12;|&frac34;)?"; // HTML entity fractions (optional group)
  patternCups += "(&#188;|&#8531;|&#189;|&#8532;|&#190;|&#8530;)?"; // HTML decimal fractions (optional group)
  patternCups += "(&#xBC;|&#x2153;|&#xBD;|&#x2154;|&#xBE;|&#x2152;)?"; // HTML hexadecimal fractions (optional group)
  patternCups += "\\s?"; // optional whitespace character
  patternCups += "(?:cups|cup)"; // longest string first eg. cups|cup not cup|cups (noncapturing compulsory group)

  // build the pattern for the fahrenheit regular expression
  // (some recipes use asterisk as degrees symbol)
  patternFahr += "(\\d+(?:.\\d+)?)+\\s?"; // at least 1 digit with or without decimal point and/or whitespace
  patternFahr += "(?:"; // begin noncapturing group
  patternFahr += "(?:(?:°|degrees|deg|&#186;|&#176;|&deg;|º|&ordm;|&#xba;|\\*)\\s?)"; // noncapturing degree group with/without whitespace
  patternFahr += "(?!\\s?c)"; // not followed by c (rules out centigrade false positives)
  patternFahr += "|"; // OR seperator
  patternFahr += "(?:(?:farhenheit|fahrenheit|f\\b))"; // noncapturing fahrenheit group
  patternFahr += ")+"; // require at least one of two previous groups

  // build the pattern for the ml/litres regular expression
  patternMl += "\\b"; // word boundary
  patternMl += "(\\d+(?:[/.]\\d+)?)"; // one or more digits, optionally followed by a noncapturing group of a slash or dot and one or more digits (optional group)
  patternMl += "\\s?"; // optional whitespace character
  patternMl += "(?:milliliters|millilitres|milliliter|millilitre|litres|liters|litre|liter|ml|l)"; // longest string first eg. cups|cup not cup|cups (noncapturing compulsory group)
  patternMl += "(?:\\b)"; // not followed by b (fixes getting caught out by eg. 8lb)

  // build the pattern for the celsius regular expression
  patternCels += "(\\d+(?:.\\d+)?)+\\s?"; // at least 1 digit with or without decimal point and/or whitespace
  patternCels += "(?:"; // begin noncapturing group
  patternCels += "(?:(?:°|degrees|deg|&#186;|&#176;|&deg;|º|&ordm;|&#xba;|\\*)\\s?)"; // noncapturing degree group with/without whitespace
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
    if (response && response.constants) {
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
    // window.fgConvertCupsHasRunOnce must be declared globally
    // (on the window object) for persistance. Don't allow the
    // conversion/replacement to run more than once on the same
    // DOM as multiple find/replaces can corrupt content
    if (window.fgConvertCupsHasRunOnce === undefined) {
      cupsToMlMult = parseInt(result.cupsize);
      measurementConvertTo = result.measurementConvertTo;
      temperatureConvertTo = result.temperatureConvertTo;
      replaceTextInNode(document.body);
      if (result.DEBUG_MODE) {
        logMsg = function(msg) { console.log(msg); };
      } else {
        logMsg = function() {};
      }
      window.fgConvertCupsHasRunOnce = true;
    } else {
      logMsg("Page already converted");
    }
  };

  wrapMatchedText = function(str, match) {
    str = "<span class='fg-converted-cup'>" + str;
    str += "<span>" + match + "</span>";
    str += "</span>";
    return str;
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
      fraction = convertStringFraction(longFrac);
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
    } else if (uniFrac === "⅒" || decFrac === "&#8530;" || hexFrac === "&#x2152;") {
      fraction = 0.1;
    }

    ml = Math.round((wholeNum + fraction) * cupsToMlMult);
    if (ml >= 1000) { // show big values as litres not ml
      str = (Math.round((ml * ML_TO_LITRE_MULT) * LITRE_DEC_ROUNDING) / LITRE_DEC_ROUNDING) + "L";
    } else {
      str = ml + "ml";
    }

    return wrapMatchedText(str, match);
  };

  // constants is called from within the scope of a regular expression
  // (so is a string replace callback).
  convertMlString = function(match, whole) {
    var
    wholeNum = whole === undefined ? 0 : parseInt(whole, 10),
    ml = (wholeNum < 5) ? wholeNum * 1000 : wholeNum, // if lower than 5 presume this is litres and not ml
    cups, str, fractionalised_ob;

    cups = ml / cupsToMlMult;

    fractionalised_ob = fractionaliseCups(cups);
    if (fractionalised_ob.singular) {
      str = fractionalised_ob.cups + " cup";
    } else {
      str = fractionalised_ob.cups + " cups";
    }

    return wrapMatchedText(str, match);
  };

  convertFahrString = function(match, degrees) {
    var celsius, str;
    celsius = Math.round(((degrees-32) * (5/9)) / TEMPERATURE_ROUNDING) * TEMPERATURE_ROUNDING;
    str = celsius + "&deg;C";
    return wrapMatchedText(str, match);
  };

  convertCelsString = function(match, degrees) {
    var fahrenheit, str;
    fahrenheit = Math.round(((degrees * (9/5)) + 32) / TEMPERATURE_ROUNDING) * TEMPERATURE_ROUNDING;
    str = fahrenheit + "&deg;F";
    return wrapMatchedText(str, match);
  };

  convertStringFraction = function(str) {
    var ar = str.split("/"), ret;
    if (ar[1] !== 0) {
      ret = ar[0]/ar[1];
    } else {
      ret = 0;
    }
    return ret;
  };

  fractionaliseCups = function(n) {
    var
    str = ("" + n),
    ar = str.split("."),
    whole = parseInt(ar[0], 10),
    fraction = "",
    singular = false;

    if (ar.length == 2) {
      fraction = parseFloat("0." + ar[1], 10);
      logMsg("\tfraction: " + fraction);
      if (fraction < 0.07) {
        if (whole === 0) {
          fraction = "&#8530;"; // 1/10 (to avoid rounding a positive volume down to total zero)
        } else {
          fraction = ""; // round down
        }
      } else if (fraction < 0.13) {
        fraction = "&#8530;"; // 1/10
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
        whole += 1; // round up
        whole = "" + whole;
        fraction = "";
      }
    }

    if (whole === 0 || (whole === 1 && fraction === "")) { singular = true; }
    if (whole === 0) { whole = ""; } // convert zero number to empty string

    return { cups: whole + fraction, singular: singular};
  };

  // replaceTextInNode scans through a node replacing all cups with millilitres
  // then recurses into any child nodes
  replaceTextInNode = function(node) {
    var
    lastChildNodeIndex = node.childNodes.length-1,
    i, child, html, matchFound, replacementNode;

    for (i = lastChildNodeIndex; i >= 0; i--){
      child = node.childNodes[i];
      matchFound = false;

      if (child.nodeType == Element.TEXT_NODE) {
      // if (child.nodeType == Element.TEXT_NODE && child.parentElement) {
        html = child.textContent;
        // cup conversion
        if (measurementConvertTo === "ML") { // convert to ml
          if (html.toLowerCase().indexOf("cup") !== -1) { // optimisation to prevent slow RegExp being run against every text node
            html = html.replace(regExpCups, convertCupString);
            matchFound = true;
          }
        } else { // convert to cups
          if (html.match(regExpMlCheap)) { // optimisation to prevent slow RegExp being run against every text node
            html = html.replace(regExpMl, convertMlString);
            matchFound = true;
          }
        }
        // temp conversion
        if (temperatureConvertTo === "C") { // convert to Celsius
          // do simple check for something that looks like a fahrenheit temp first
          // to save doing expensive replace with complex regex
          if (html.match(regExpFahrCheap)) {
            html = html.replace(regExpFahr, convertFahrString);
            matchFound = true;
          }
        } else { // convert to Fahrenheit
          if (html.match(regExpCelsCheap)) {
            html = html.replace(regExpCels, convertCelsString);
            matchFound = true;
          }
        }
      } else if (node.nodeType == Element.ELEMENT_NODE){
        replaceTextInNode(child); // recurse into child nodes
      }

      if (matchFound) {
        replacementNode = document.createElement("span");
        replacementNode.innerHTML = html;
        child.parentNode.replaceChild(replacementNode, child);
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

}());
