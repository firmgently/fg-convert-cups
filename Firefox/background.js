
var
convertedTabID_ar = [],
onClick, executionComplete;

onClick = function(tab) {
  chrome.tabs.insertCSS(tab.id, {
    "file": "fg-convertcups.css"
  });
  chrome.tabs.executeScript(tab.id, {
    "file": "FGConvertCups.js"
  }, executionComplete);
  // every time the extension is run, save the tab ID to convertedTabID_ar
  // to be used eg. when cup size option is changed we can refresh all affected tabs
  convertedTabID_ar.push(tab.id);
};

executionComplete = function() {
  console.log("ConvertCups: Script Finished Executing .. ");
};

chrome.browserAction.onClicked.addListener(onClick);
