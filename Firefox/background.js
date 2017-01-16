var clickListener = function(tab) {
  browser.tabs.insertCSS(tab.id, {
    "file": "fg-convertcups.css"
  });
  browser.tabs.executeScript(tab.id, {
      "file": "FGConvertCups.js"
  }, function () {
      console.log("ConvertCups: Script Finished Executing .. ");
  });
};
browser.browserAction.onClicked.addListener(clickListener);
