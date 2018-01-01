(function(){

function log(message) {
  browser.runtime.sendMessage({
    _context: 'log',
    message: message
  });
}

function sendFields() {
  browser.runtime.sendMessage({
    _context: 'fields',
    fields: {
      author: null,
      updated: null,
      title: null,
      year: null
    }
  });
}

function run() {
  try {
    log({
      what: 'loaded'
    });
    sendFields();
  }
  catch(e) {
    console.log(e);
    log({
      what: 'Problem running',
      error: e
    });
  }
}

run();

})();

