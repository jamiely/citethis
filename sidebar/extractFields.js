(function(){

function log(message) {
  browser.runtime.sendMessage({
    _context: 'log',
    message: message
  });
}

function sendFields() {
  log('sendFields');
  browser.runtime.sendMessage({
    _context: 'fields',
    fields: {
      author: getAuthor(),
      updated: null,
      title: null,
      year: null
    }
  });
}

function getAuthorHasBylineElement() {
  var el = document.querySelectorAll('byline'),
    rtn = null;

  if (!el) return;

  var val = el.value || el.innerHTML;
  if (! val) return;
  if (val == '') return;

  return val;
}

function getMetaTag( metaTagName ) {
  metaTagName = metaTagName.toLowerCase();

  try {
    var meta = document.querySelectorAll("meta");
    for (var i = 0; i < meta.length; i++) {
      if (meta[i].name && meta[i].name.toLowerCase() == metaTagName) {
        return meta[i];
      }
    }
  }
  catch ( e ) {
    log({
      what: 'Problem getting meta tag',
      error: error
    });
  }
  return null;
}

function getAuthor() {
  return formatAuthor(extractAuthor());
}

function extractAuthor() {
  var author = "Last, First",
    metaByl = getMetaTag ( "byl" ),
    metaAuthor = getMetaTag ( "author" ),
    siteSpec = null;

  if ( siteSpec || siteSpec == '' ) {
    return siteSpec;
  }

  try {
    log('extractAuthor 1');
    var first = getAuthorHasBylineElement();
    if(first) return first;

    log('extractAuthor 2');
    if ( metaAuthor && metaAuthor.content != '') {
      log(metaAuthor.content);
      return metaAuthor.content;
    }

    log('extractAuthor 3');
    if ( metaByl && metaByl.content != '' ) {
      // check for a byline meta element
      return metaByl.content;
    }

    log('extractAuthor 4');
    // see if there are any elements marked byline
    let elByl = document.querySelectorAll( "byline" );
    if ( elByl && elByl.length > 0 ) {
      // strip and stripTags functions from prototypejs
      author = elByl[0].
        textContent.
        replace(/^\s+/, '').replace(/\s+$/, '');

      return author;
    }

    log('extractAuthor 5');
    // see if there are any elements with a byline class
    let elsBylineClass = document.querySelectorAll('.byline-author');
    if(elsBylineClass && elsBylineClass.length > 0) {
      log('.byline-author');
      let el = elsBylineClass[0];
      return el.dataset['byline-name'];
    }

    log('extractAuthor 6');
    // check for author elements
    let els = document.querySelectorAll('author');
    if(els && els.lenth > 0) {
      return els[0].textContent;
    }

    log('extractAuthor 7');
    var parts = document.body ? document.body.textContent.match ( /by (([A-Z\.'-] ?){2,3})/ ) : null;
    //console.log ( "parts: " + parts );
    if ( parts && parts[0] ) {
      return reduceWhitespace ( parts[0] );
    }
  }
  catch(e){
    alert ( e.message );
  }

  return formatAuthor(author);
}

function formatAuthor( author ) {
  if(! author) return '';

  try {
    author = reduceWhitespace (author);

    author = author.replace(/^\s*by */i, ''); // remove "by"

    // deal with associated press?
    author = author.replace(/,\s*Associated Press[.\s\S]+$/ig, '');
    author = author.replace(/,\s*AP[.\s\S]+$/g, '');

    author = trim (author);
    author = capitalize (author);
    return author;
  }
  catch(e) {
    alert ( 'formatAuthor exception: ' + e );
    return '';
  }
}

function capitalize(str) {
  return str.toLowerCase().replace(/\b\w/g,
    function(capture){
      return capture.toUpperCase();
    }
  );
}

/**
 * Will remove whitespace from either side of the string.
 * will also remove non-word characters at end of string.
 */
function trim(str) {
  return str.replace(/^\s+/, '').replace(/[\s\W]+$/, ''); //trim
}

function reduceWhitespace( str ) {
  return str.replace (/\s+/, ' ');
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

