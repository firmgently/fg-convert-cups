
var
constants = {
  DEFAULT_CUPSIZE: 240,
  DEFAULT_MEASUREMENT_CONVERT_TO: 'ML',
  DEFAULT_TEMPERATURE_CONVERT_TO: 'C'
},
convertedTabID_ar = [],
updateTitle,
onClick, onMessage, onStorageUpdateTitle, executionComplete;

onClick = function(tab) {
  // console.log("tab.id: " + tab.id);
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

onMessage = function(request, sender, sendResponse) {
  if (request.message === "requestConstants") {
    sendResponse({constants: constants});
  }
};

executionComplete = function() {
  console.log("ConvertCups: Script Finished Executing .. ");
};

onStorageUpdateTitle = function(result){
  var
  title = "Press to convert:\n\n",
  separator = " - ";

  if (result.measurementConvertTo === "ML") {
    title += separator + "cups to ml/litres\n";
  } else {
    title += separator + "ml/litres to cups\n";
  }
  if (result.temperatureConvertTo === "F") {
    title += separator + "Celsius to Fahrenheit\n";
  } else {
    title += separator + "Fahrenheit to Celsius\n";
  }
  title += separator + "using " + result.cupsize + "ml cup size";
  title += "\n\n(change this in the extension options)";
  chrome.browserAction.setTitle({ title: title });
};

updateTitle = function() {
  chrome.storage.local.get({
    cupsize: constants.DEFAULT_CUPSIZE,
    measurementConvertTo: constants.DEFAULT_MEASUREMENT_CONVERT_TO,
    temperatureConvertTo: constants.DEFAULT_TEMPERATURE_CONVERT_TO
  }, onStorageUpdateTitle);
};

chrome.browserAction.onClicked.addListener(onClick);
chrome.runtime.onMessage.addListener(onMessage);

updateTitle();
