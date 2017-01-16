var save_options, restore_options;

// Saves options to chrome.storage.local.
save_options = function() {
  var
  radios = document.getElementsByName('cupsize'),
  length = radios.length,
  i, cupsize, convertedTabID_ar;
  console.log("save_options()");

  for (i = 0; i < length; i++) {
    if (radios[i].checked) {
      // console.log(radios[i].value);
      cupsize = radios[i].value;
      break;
    }
  }

  chrome.storage.local.set({
    chosencupsize: cupsize
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.innerHTML = 'Options saved.<span>Refresh any recipe pages - old sizes will still be showing!</span>';
    setTimeout(function() {
      status.textContent = '';
    }, 7000);
  });
  // reload page NOT WORKING YET
  convertedTabID_ar = chrome.extension.getBackgroundPage().convertedTabID_ar;
  // tell all converted tabs about change option change
  for (i = 0; i < convertedTabID_ar.length; i++) {
    chrome.tabs.sendMessage(convertedTabID_ar[i], {
      message: "optionsSaved"
    });
  }
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
restore_options = function() {
  console.log("restore_options()");
  // Use default value cupsize = '240'
  chrome.storage.local.get({
    chosencupsize: '240'
  }, function(items) {
    var
    radios = document.getElementsByName('cupsize'),
    length = radios.length,
    i;

    for (i = 0; i < length; i++) {
      if (radios[i].value == items.chosencupsize) {
        radios[i].checked = true;
        break;
      }
    }
  });
};

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
