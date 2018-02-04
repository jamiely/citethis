

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

export {
  getAuthorHasBylineElement,
  getMetaTag
};

