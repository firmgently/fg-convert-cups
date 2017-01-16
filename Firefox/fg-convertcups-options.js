// Saves options to browser.storage.local.
function save_options() {
  var
  radios = document.getElementsByName('cupsize'),
  length = radios.length,
  i, cupsize;
  console.log("save_options()");

  for (i = 0; i < length; i++) {
    if (radios[i].checked) {
      console.log(radios[i].value);
      cupsize = radios[i].value;
      break;
    }
  }

  browser.storage.local.set({
    chosencupsize: cupsize
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
  // reload page
  // browser.extension.getBackgroundPage().window.location.reload();
}

// Restores select box and checkbox state using the preferences
// stored in browser.storage.
function restore_options() {
  console.log("restore_options()");
  // Use default value cupsize = '240'
  browser.storage.local.get({
    chosencupsize: '240'
  }, function(items) {
    var
    radios = document.getElementsByName('cupsize'),
    length = radios.length,
    i;

    for (i = 0; i < length; i++) {
      if (radios[i].value == items.chosencupsize) {
        console.log(radios[i].value);
        radios[i].checked = true;
        break;
      }
    }
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
