
function getMetaTag(name) {
  const metas = document.querySelectorAll(`meta[name=${name}]`);
  if(metas && metas.length > 0) {
    return metas[0];
  }
  return null;
}

function coalesceFns(firstFn, ...rest) {
  try {
    let result = firstFn()
    if(result) return result;
  } catch(e) {
    console.log(e);
  }

  if(rest.length == 0) return null;

  return coalesceFns(...rest);
}

function getFirstBySelector(selector) {
  const els = document.querySelectorAll(selector);
  if(els && els.length > 0) {
    return els[0];
  }
  return null;
}

class Wikipedia {
  is(data) {
    return /wikipedia\.org\//i.test(data.url);
  }

  get(data) {
    let siteData = {
      author: this.getAuthor(data),
      title: this.getTitle(data)
    };
    return Object.assign({}, data, siteData);
  }

  getAuthor() {
    console.log('wikipedia author');
    return '';
  }

  getTitle(tab) {
    if(! tab || ! tab.title) return null;

    return tab.title.replace(/ - Wikipedia.+/, '');
  }
};

class CNN {
  is(data) {
    return /cnn\.com\//i.test(data.url);
  }

  get(data){
    let siteData = {
      author: this.getAuthor(data),
      title: this.getTitle(data)
    };
    return Object.assign(data, siteData);
  }

  getAuthor(tab) {
    var els = document.getElementsByClassName('cnn_strycbftrtxt');
    if (els && els.length > 0 ) {
      var e = els[0],
        matches = /^cnn's(.+) contributed.+/ig.exec(e.innerHTML);
      if (matches && matches.length > 1 ) {
        return matches[1];
      }
    }
    var metaAuthor = getMetaTag ( "author" );
    if ( metaAuthor ) {
      return metaAuthor.getAttribute('content');
    }

    return '';
  }

  getTitle(tab) {
    if(!tab || ! tab.title) return null;
    return tab.title.replace(/ - CNN.+/, '');
  }
};

class Huffington {
  is(data) {
    return /huffingtonpost\.com/i.test ( data.url );
  }

  get(data) {
    let siteData = {
      author: this.getAuthor(data)
    };
    return Object.assign(data, siteData);
  }

  getAuthor(tab) {
    const fns = 'author-card__link bn-author-name yr-author-name'.split(' ')
      .map((className) => {
        return () => {
          return getFirstBySelector(`.${className}`).innerText;
        };
      });
    return coalesceFns(...fns, () => '');
  }
};

class ABCNews {
  is(data) {
    return /abcnews\.go\.com/i.test (data.url);
  }

  get(data){
    let siteData = {
      author: this.getAuthor(data)
    };
    return Object.assign(data, siteData);
  }

  getAuthor(tab) {
    var el = getFirstBySelector('[rel=author]');
    if(el) return el.innerText;
    return null;
  }
};

class FoxNews{
  is(data) {
    return /fox\w+\.com/i.test(data.url);
  }

  get(data) {
    let siteData = {
      title: this.getTitle(data),
      author: this.getAuthor(data)
    };
    return Object.assign(data, siteData);
  }

  getAuthor(data) {
    let extract8 = document.querySelectorAll('.author-byline');
    if(extract8 && extract8.length > 0) {
      return extract8[0].innerText.replace(/ \| .*/, '');
    }
  }

  getTitle(tab) {
    if(! tab.title) return;

    return tab.title.
      replace(/.*FOXNews.com\s+-\s+/i, '').
      replace(/ - FOX.+/i, '');
  }
};

const SiteSpecificHandlers = [new Wikipedia(), new CNN(), new Huffington(), new ABCNews(), new FoxNews()];


const getSiteSpecific = function(data) {
  let handlers = SiteSpecificHandlers;
  // run site specific functions
  for(let i = 0; i < handlers.length; i++){
    var handler = handlers[i]; // set of functions
    if ( handler && handler.is && handler.is (data) ) { // if func is exists
      return handler;
    }
  }
  return null;
};

export {
  SiteSpecificHandlers,
  getSiteSpecific
};


