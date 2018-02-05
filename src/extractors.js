import { formatAuthor } from './formatting';

function getAuthorHasBylineElement(__doc) {
  const doc = __doc || document;

  var els = doc.querySelectorAll('byline');

  if (!els || els.length == 0) return;

  let el = els[0];

  var val = el.value || el.innerHTML;
  if (! val) return;
  if (val == '') return;

  return val;
}

function getMetaTag( metaTagName, __doc ) {
  const doc = __doc || document;

  metaTagName = metaTagName.toLowerCase();

  try {
    var meta = doc.querySelectorAll("meta");
    for (var i = 0; i < meta.length; i++) {
      if (meta[i].name && meta[i].name.toLowerCase() == metaTagName) {
        return meta[i];
      }
    }
  }
  catch ( e ) {
    console.log({
      what: 'Problem getting meta tag',
      error: error
    });
  }
  return null;
}

function extractAuthor(__doc) {
  const doc = __doc || document;

  var author = "Last, First",
    metaByl = getMetaTag ( "byl", doc ),
    metaAuthor = getMetaTag ( "author", doc ),
    siteSpec = null;

  try {
    console.log('extractAuthor 1');
    var first = getAuthorHasBylineElement(doc);
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
    let elByl = doc.querySelectorAll( "byline" );
    if ( elByl && elByl.length > 0 ) {
      // strip and stripTags functions from prototypejs
      author = elByl[0].
        textContent.
        replace(/^\s+/, '').replace(/\s+$/, '');

      return author;
    }

    console.log('extractAuthor 5');
    // see if there are any elements with a byline class
    let elsBylineClass = doc.querySelectorAll('.byline-author');
    if(elsBylineClass && elsBylineClass.length > 0) {
      let el = elsBylineClass[0];
      if(el.dataset) {
        return el.dataset['byline-name'];
      }
      const attr = el.getAttribute('data-byline-name')
      if(attr) {
        return attr;
      }
    }

    console.log('extractAuthor 6');
    // check for author elements
    let els = doc.querySelectorAll('author');
    if(els && els.length > 0) {
      return els[0].textContent;
    }

    console.log('extractAuthor 7');
    var parts = doc.body ? doc.body.textContent.match ( /by (([A-Z\.'-]+ ?){2,3})/i ) : null;
    //console.log ( "parts: " + parts );
    if ( parts && parts[0] ) {
      return formatAuthor ( parts[0] );
    }

    let extract8 = doc.querySelectorAll('.author-byline');
    if(extract8 && extract8.length > 0) {
      return extract8[0].textContent;
    }
  }
  catch(e){
    console.log ( e.message );
  }

  return formatAuthor(author);
}

export {
  getAuthorHasBylineElement,
  getMetaTag,
  extractAuthor
};

