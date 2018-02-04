import {
  SiteSpecificHandlers,
  getSiteSpecific
} from './siteSpecific';
import { formatAuthor } from './formatting';
import { getAuthorHasBylineElement, getMetaTag } from './extractors';

(function(){

function sendFields() {
  console.log('sendFields');
  let envelope = {
    _context: 'fields',
    fields: {
      author: getAuthor(),
      url: window.location.href,
      title: document.title
    }
  };
  let handler = getSiteSpecific(envelope.fields);
  if(handler && handler.get) {
    console.log('Calling site specific handler');
    let handlerFields = handler.get(envelope.fields);
    if(handlerFields.author) {
      handlerFields.author = formatAuthor(handlerFields.author);
    }
    envelope.fields = handlerFields;
  }
  console.log(`got handler ${handler}`);
  browser.runtime.sendMessage(envelope);
}


function getAuthor() {
  const result = formatAuthor(extractAuthor());
  if(!result) {
    return '';
  }
  return result;
}

function extractAuthor() {
  var author = "Last, First",
    metaByl = getMetaTag ( "byl" ),
    metaAuthor = getMetaTag ( "author" ),
    siteSpec = null;

  try {
    console.log('extractAuthor 1');
    var first = getAuthorHasBylineElement();
    if(first) return first;

    console.log('extractAuthor 2');
    if ( metaAuthor ) {
      const content = metaAuthor.getAttribute('content');
      console.log(`content: ${content}`);
      return content;
    }

    console.log('extractAuthor 3');
    if ( metaByl && metaByl.content != '' ) {
      // check for a byline meta element
      return metaByl.content;
    }

    console.log('extractAuthor 4');
    // see if there are any elements marked byline
    let elByl = document.querySelectorAll( "byline" );
    if ( elByl && elByl.length > 0 ) {
      // strip and stripTags functions from prototypejs
      author = elByl[0].
        textContent.
        replace(/^\s+/, '').replace(/\s+$/, '');

      return author;
    }

    console.log('extractAuthor 5');
    // see if there are any elements with a byline class
    let elsBylineClass = document.querySelectorAll('.byline-author');
    if(elsBylineClass && elsBylineClass.length > 0) {
      console.log('.byline-author');
      let el = elsBylineClass[0];
      return el.dataset['byline-name'];
    }

    console.log('extractAuthor 6');
    // check for author elements
    let els = document.querySelectorAll('author');
    if(els && els.lenth > 0) {
      return els[0].textContent;
    }

    console.log('extractAuthor 7');
    var parts = document.body ? document.body.textContent.match ( /by (([A-Z\.'-] ?){2,3})/ ) : null;
    //console.log ( "parts: " + parts );
    if ( parts && parts[0] ) {
      return reduceWhitespace ( parts[0] );
    }

    let extract8 = document.querySelectorAll('.author-byline');
    if(extract8 && extract8.length > 0) {
      return extract8[0].innerText;
    }
  }
  catch(e){
    alert ( e.message );
  }

  return formatAuthor(author);
}


function run() {
  try {
    console.log({
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

document.addEventListener("DOMContentLoaded", run);
run();

})();

