var
backgroundPage = chrome.extension.getBackgroundPage(),
onStorageSet, onStorageGet,
getCheckedRadio, setCheckedRadio,
save_options, restore_options;

// Saves options to chrome.storage.local
save_options = function() {
  var  convertedTabID_ar;

  chrome.storage.local.set({
    cupsize: getCheckedRadio('cup-size'),
    measurementConvertTo: getCheckedRadio('measurement-convert-to'),
    temperatureConvertTo: getCheckedRadio('temperature-convert-to')
  }, onStorageSet);

  backgroundPage.updateTitle();

  // tell all converted tabs about change option change
  convertedTabID_ar = backgroundPage.convertedTabID_ar;
  for (i = 0; i < convertedTabID_ar.length; i++) {
    chrome.tabs.sendMessage(convertedTabID_ar[i], {
      message: "optionsSaved"
    });
  }
};

// Restores form using the preferences stored in chrome.storage.local
restore_options = function() {
  chrome.storage.local.get({
    cupsize: backgroundPage.constants.DEFAULT_CUPSIZE,
    measurementConvertTo: backgroundPage.constants.DEFAULT_MEASUREMENT_CONVERT_TO,
    temperatureConvertTo: backgroundPage.constants.DEFAULT_TEMPERATURE_CONVERT_TO
  }, onStorageGet);
};

onStorageSet = function() {
  // Update status to let user know options were saved.
  var status = document.getElementById('status');
  status.innerHTML = 'OPTIONS SAVED';
  setTimeout(function() {
    status.textContent = '';
  }, 4000);
};

onStorageGet = function(items) {
  setCheckedRadio('cup-size', items.cupsize);
  setCheckedRadio('measurement-convert-to', items.measurementConvertTo);
  setCheckedRadio('temperature-convert-to', items.temperatureConvertTo);
};

getCheckedRadio = function(radioName) {
  var
  radios = document.getElementsByName(radioName),
  i, value;
  for (i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      value = radios[i].value;
      break;
    }
  }
  return value;
};

setCheckedRadio = function(radioName, value) {
  var
  radios = document.getElementsByName(radioName),
  i;
  for (i = 0; i < radios.length; i++) {
    if (radios[i].value == value) {
      radios[i].checked = true;
      break;
    }
  }
};

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
