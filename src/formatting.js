/**
 * Will remove whitespace from either side of the string.
 * will also remove non-word characters at end of string.
 */
function trim(str) {
  return str.replace(/^\s+/g, '').replace(/[\s\W]+$/, ''); //trim
}

function reduceWhitespace( str ) {
  return str.replace (/\s+/g, ' ');
}

function formatAuthor( author ) {
  console.log('formatAuthor');

  if(! author) return '';

  author = reduceWhitespace (author);

  author = author.replace(/^\s*by */i, ''); // remove "by"

  // deal with associated press?
  author = author.replace(/,\s*Associated Press[.\s\S]*$/ig, '');
  author = author.replace(/,\s*AP[.\s\S]*$/g, '');

  author = trim (author);
  author = capitalize (author);
  return author;
}

function capitalize(str) {
  return str.toLowerCase().replace(/\b\w/g,
    function(capture){
      return capture.toUpperCase();
    }
  );
}

export {
  formatAuthor
};

