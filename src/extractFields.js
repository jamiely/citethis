import {
  SiteSpecificHandlers,
  getSiteSpecific
} from './siteSpecific';
import { formatAuthor } from './formatting';
import {
  getAuthorHasBylineElement,
  getMetaTag,
  extractAuthor
} from './extractors';

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

