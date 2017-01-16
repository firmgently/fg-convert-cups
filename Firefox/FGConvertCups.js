var
cupsToMlMult = 240, // default
mlToLitreMult = 0.001,

convertCupString, replaceTextInNode;

browser.storage.local.get(
  { 'chosencupsize': cupsToMlMult },
  function(result){
    cupsToMlMult = parseInt(result.chosencupsize);
    replaceTextInNode(document.body);
  }
);

// convertCupString is called from within the scope of a regular expression
// (so is a string replace callback). The RegExp passes all groupings/substrings as
// consecutive arguments
convertCupString = function(match, whole, longFrac, uniFrac, entFrac, decFrac, hexFrac) {
  // var str = p2;
  var
  wholeNum = whole === undefined ? 0 : parseInt(whole, 10),
  fraction = 0,
  ml, str;

  // console.log("match: " + match);
  // console.log("whole: " + whole);
  // console.log("longFrac: " + longFrac);
  // console.log("uniFrac: " + uniFrac);
  // console.log("entFrac: " + entFrac);
  // console.log("decFrac: " + decFrac);
  // console.log("hexFrac: " + hexFrac);

  if (longFrac) {
    // eval is perfect for this job and deemed to be safe in this context
    // input (longFrac) is taken from the DOM only and if the user is on a
    // site where the DOM is compromised then it can run malicious JS already
    fraction = eval(longFrac);
  } else if (uniFrac === "¼" || entFrac === "&frac14"  || decFrac === "&#188;"  || hexFrac === "&#xBC;") {
    fraction = 0.25;
  } else if (uniFrac === "½" || entFrac === "&frac12"  || decFrac === "&#189;"  || hexFrac === "&#xBD;") {
    fraction = 0.5;
  } else if (uniFrac === "¾" || entFrac === "&frac34"  || decFrac === "&#190;"  || hexFrac === "&#xBE;") {
    fraction = 0.75;
  }
  // console.log("wholeNum: " + wholeNum);
  // console.log("fraction: " + fraction);
  ml = (wholeNum + fraction) * cupsToMlMult;
  if (ml > 1000) {
    str = (ml * mlToLitreMult) + "l";
  } else {
    str = ml + "ml";
  }

  // return str;
  str = "<span class='fg-converted-cup'>" + str;
  str += "<span>" + match + "</span>";
  str += "</span>";
  return str;
};

// replaceTextInNode scans through a node replacing all cups with millilitres
// then recurses into any child nodes
replaceTextInNode = function(parentNode) {
  var node, pattern;
  pattern = new RegExp(/(?!\s)(\d+\s?)?(\d+(?:[/.]\d+))?\s?(¼|½|¾)?(&frac14;|&frac12;|&frac34;)?(&#188;|&#189;|&#190;)?(&#xBC;|&#xBD;|&#xBE;)?\s(?:cups|cup)/, 'ig'); // put plurals (longest string) first eg. cups|cup not cup|cups
  for (var i = parentNode.childNodes.length-1; i >= 0; i--){
    node = parentNode.childNodes[i];

    if (node.nodeType == Element.TEXT_NODE && node.parentElement) {
      // node.textContent = node.textContent.replace(pattern, convertCupString);
      if (node.textContent.indexOf("cup") !== -1) { // optimisation to prevent slow RegExp being run against every text node
        node.parentElement.innerHTML = node.parentElement.innerHTML.replace(pattern, convertCupString);
      }
    } else if (node.nodeType == Element.ELEMENT_NODE){
      //  recurse into child nodes
      replaceTextInNode(node);
    }
  }
};
