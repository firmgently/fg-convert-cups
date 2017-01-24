
var
constants = {
  DEBUG_MODE: false,
  DEFAULT_CUPSIZE: 240,
  DEFAULT_MEASUREMENT_CONVERT_TO: 'ML',
  DEFAULT_TEMPERATURE_CONVERT_TO: 'C'
},
convertedTabID_ar = [],
updateTitle,
onClick, onMessage, onStorageUpdateTitle;

onClick = function(tab) {
  chrome.tabs.insertCSS(tab.id, {
    "file": "fg-convertcups.css"
  });
  chrome.tabs.executeScript(tab.id, {
    "file": "FGConvertCups.js"
  });
  // every time the extension is run, save the tab ID to convertedTabID_ar
  // to be used eg. when cup size option is changed we can refresh all affected tabs
  convertedTabID_ar.push(tab.id);
};

onMessage = function(request, sender, sendResponse) {
  if (request.message === "requestConstants") {
    sendResponse({constants: constants});
  }
};

onStorageUpdateTitle = function(result){
  var
  title = "ConvertCups - press to convert:\n\n",
  separator = " - ";

  if (result.measurementConvertTo === "ML") {
    title += separator + "cups --> ml/litres";
  } else {
    title += separator + "ml/litres --> cups";
  }
  title += " (" + result.cupsize + "ml cup size)\n";
  if (result.temperatureConvertTo === "F") {
    title += separator + "Celsius --> Fahrenheit\n";
  } else {
    title += separator + "Fahrenheit --> Celsius\n";
  }
  title += "\n\nChange these settings in the extension options";
  chrome.browserAction.setTitle({ title: title });
};

updateTitle = function() {
  // logMsg("constants.DEFAULT_CUPSIZE: " + constants.DEFAULT_CUPSIZE);
  chrome.storage.local.get({
    cupsize: constants.DEFAULT_CUPSIZE,
    measurementConvertTo: constants.DEFAULT_MEASUREMENT_CONVERT_TO,
    temperatureConvertTo: constants.DEFAULT_TEMPERATURE_CONVERT_TO
  }, onStorageUpdateTitle);
};

if (constants.DEBUG_MODE) {
  logMsg = function(msg) {
    console.log(msg);
  };
} else {
  logMsg = function() {};
}

chrome.browserAction.onClicked.addListener(onClick);
chrome.runtime.onMessage.addListener(onMessage);

updateTitle();
