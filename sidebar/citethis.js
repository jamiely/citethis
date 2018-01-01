(function(root) {

var lastUrl = null;

function executeContentScript(tab) {
  browser.tabs.executeScript({
    file: 'extractFields.js'
  })
    .then(() => {
      console.log('executed content script');
    })
    .catch((error) => {
      console.error({
        what: 'Failed to execute script',
        error: error
      });
    });
}

function onContentScriptMessage(message, context) {
  if(message._context && message._context == 'log') {
    console.log(message.message);
  } else {
    console.log(message._context);
  }
}

const citethis = {
  DEBUG: true,

  //

  // retrieve a preference by name
  getPref: function(name) {
    return this.prefs.getCharPref(name);
  },

  // only works for XUL elements. use citethis.getElement to get page elements.
  $: function (el) {
    let element = document.getElementById ( el );
    if(! element) {
      console.log('Element was null: ' + el);
    }
    return element;
  },

  timers: [],

  //initTimer: function (fun, ms, type) {
  //try {
  //// Now it is time to create the timer...  
  //var timer 
  //= Components.classes["@mozilla.org/timer;1"]
  //.createInstance(Components.interfaces.nsITimer);

  //timer.initWithCallback(
  //{ notify: fun },
  //ms,
  //type);

  //citethis.timers.push(timer);
  //}
  //catch(e) {
  //console.log('Could not initiate timer because ' + e.message);
  //}
  //},

  capitalize: function (str) {
    return str.toLowerCase().replace(/\b\w/g, 
      function(capture){
        return capture.toUpperCase();
      }
    );	
  },

  citationStyles: {
    /**
     * These are functions which return a citation template. The variables
     * are prefixed by dollar signs.
     * @param {Object} data
     */
    apa: function(data) {
      // apa specifies using not disclosed when the year is 
      // unknown http://owl.english.purdue.edu/owl/resource/560/10/
      var year = !data.year || data.year == '' ? "n.d." : "$year";

      // date should be spelled out!
      if ( data.author ) {
        return '$author. ('+year+') $title. Retrieved $lastAccessed, from $url';
      }
      else {
        return '$title. ('+year+') Retrieved $lastAccessed, from $url';
      }
    },
    harvard: function(data) {
      var base = '$title. Available from: <$url>. [$lastAccessed].'
      if(data.author) {
        base ='$author. n.d., ' + base; 
      }
      return base;
    },
    ama: function(data) {
      if (data.author) {
        return '$author. $title. $url. Updated $lastUpdated. Accessed $lastAccessed.';
      }
      else {
        return '$title. $url. Updated $lastUpdated. Accessed $lastAccessed.';
      }
    },
    mla: function (data) {
      if (data.author) {
        return '"$title." $site. $lastUpdated. $publisher, Web. $lastAccessed. <$url>'
      }
      else {
        return '$author. "$title". $site. $lastUpdated. $publisher, Web. $lastAccessed. <$url>';
      }
    }
  },

  prefs: null,
  currentURL: '',
  citationStyle: '??specify default here',
  citationStyleCustom: '',
  dateformat: "MMMM dd, yyyy",
  debug: function ( msg ){

  },

  clearCitationList: function() {
    citethis.$('citationList').value = '';
  },

  addCitationToList: function(newCitation) {
    newCitation = newCitation || citethis.getCitationText ();
    citethis.$('citationList').value += newCitation + '\n';
  },

  getActiveTab () {
    return browser.tabs.query({
      active: true,
      currentWindow: true
    }).then(function(ts) {
      if(ts.length == 0) {
        return;
      }
      let tab = ts[0];
      citethis._cachedUrl = tab.url;
      //console.log(JSON.stringify(tab));
      return tab;
    });
  },

  getTitlePromise() {
    return citethis.getTabProp('title');
  },

  getTabProp(propName) {
    return citethis.getActiveTab().then((tab) => {
      return tab[propName];
    });
  },

  onTabActivated: function() {
    //console.log('tab was activated');
    const now = true;
    citethis.updateCitation(now);
  },

  onTabUpdated: function() {
    citethis.onTabActivated();
  },


  onLoad: function() {
    try {

      browser.runtime.onMessage.addListener(onContentScriptMessage);
      browser.tabs.onActivated.addListener(citethis.onTabActivated);
      browser.tabs.onUpdated.addListener(citethis.onTabActivated);
      // initialization code

      this.initialized = true;
      //document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", function(e){
      //this.showContextMenu(e);
      //}, false);

      //console.log ( '1' );
      citethis.showCitationWindow(false);
      //console.log ( '1a' );
      citethis.setPageVariables(true);
      setInterval(this.checkPage, 1000);
      var e = citethis.$('txtCitationText'), select = function(e){
        citethis.$('txtCitationText').select();
      };

      //console.log (2);
      citethis.$('txtCitationText').addEventListener("focus", select, false);
      citethis.$('txtCitationText').addEventListener("click", select, false);

      var fields = 'txtAuthor txtYearPublished txtTitle txtURL txtLastAccessed txtLastUpdated'.split(' ');
      for (var i = 0; i < fields.length; i++) {
        citethis.$(fields[i]).addEventListener('blur', citethis.generateCitation, false);
      }

      //console.log(3);

      // setup preferences

      //this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
      //getService(Components.interfaces.nsIPrefService).
      //getBranch("extensions.citethis@angelforge.org.");
      //this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
      //this.prefs.addObserver("", this, false);
      //console.log(4);
      citethis.updateCitationStyle();
      //console.log(5);
      citethis.updateCitation();
      //console.log(6);

      citethis.$('btnAddToCitationList').onclick = function () { citethis.addCitationToList(); };


      if ( !console.log) {
        var d1 = citethis.$('txtDebug'),
          d2 = citethis.$('hboxDebug');
        if(d1) d1.style.display = 'none';
        if(d2) d2.style.display = 'none';
      }

    }
    catch (e) {
      console.log ( 'Load issue: ' + e.message );
    }
  },

  /**
   * Causes the citation to be updated.
   * @param {Object} immediateUpdate
   */
  updateCitation: function ( immediateUpdate ) {
    try {
      if (!citethis.citethisWindowIsVisible())
        return;

      //console.log('updateCitation: a');
      immediateUpdate = immediateUpdate === true;
      var f = citethis.setPageVariables;
      if (immediateUpdate) {
        f();
      }
      else {
        setTimeout(f, 1000);
      }
    }
    catch(e) {
      console.log(e.message);
    }
  },

  updateCitationStyle: function () {
    try {
      citethis.dateformat = String( citethis.prefs.getCharPref("dateformat") );
      //console.log("Got Date Format");

      citethis.citationStyle = String( citethis.prefs.getCharPref("citationStyle") ).toLowerCase();
      //console.log("Got citation style: " + citethis.citationStyle);
      citethis.citethis.citationStyleCustom = String( citethis.prefs.getCharPref("citationStyleCustom") ).toLowerCase();
      //console.log("Got Custom Style");
      citethis.$('lblCitationStyle').value = citethis.citationStyle.toUpperCase();

    }
    catch (e) {
      console.log(e.message);
    }
  },

  /**
   * Used to observe changes on preferences.
   * @param {Object} subject
   * @param {Object} topic
   * @param {Object} data
   */
  observe: function(subject, topic, data)
  {
    if (topic != "nsPref:changed")
    {
      return;
    }


    // update citation
    citethis.updateCitationStyle ();
    // update the citation
    citethis.updateCitation ();
  },


  shutdown: function()
  {
    this.prefs.removeObserver("", this);
  },


  checkPage: function () {
    try {
      if (citethis.getURL() != citethis.currentURL) {
        citethis.currentURL = citethis.getURL();
        citethis.updateCitation();
      }
    }
    catch ( e ) {
      alert ( 'Problem checking page: ' + e.message );
    }
  },

  /**
   * Will generate the citation and set
   * the citation box with the value of that
   * citation.
   */
  generateCitation: function () {
    citethis.$('txtCitationText').value = citethis.getCitation ();
  },

  getCitationText: function () {
    return citethis.$('txtCitationText').value;
  },

  _cachedUrl: '',

  setPageVariables: function( setLastAccessed ) {
    citethis.getActiveTab().then((tab) => {
      // prevent regeneration if we're at the same place
      if(tab.url == lastUrl) return;

      lastUrl = tab.url;
      executeContentScript(tab);
      citethis._setPageVariables(tab, tab.url, tab.title, setLastAccessed);
    });
  },

  _setPageVariables: function ( tab, url, title, setLastAccessed ) {
    citethis.doc = document;
    citethis._isFirstRun = true;
    //setLastAccessed = setLastAccessed === true;
    setLastAccessed = true;
    citethis.$('txtAuthor').value = citethis.getAuthor (tab);
    citethis.$('txtYearPublished').value = citethis.getYearPublished ();
    citethis.$('txtTitle').value = citethis.prepareTitle (tab);
    //console.log('got title');
    citethis.$('txtURL').value = tab.url;
    //console.log('got url');
    if ( setLastAccessed ) {
      citethis.$('txtLastAccessed').value = citethis.getLastAccessed ();
      citethis.$('txtLastUpdated').value = citethis.getLastUpdated ();
    }

    //console.log('Generating citation...');
    citethis.generateCitation ();
    console.log('Generated citation...');

  },

  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-citethis").hidden = gContextMenu.onImage;
  },
  onMenuItemCommand: function(e) {
    //var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
    //.getService(Components.interfaces.nsIPromptService);
    //citethis.openCitationDialog ();
  },

  getCitation: function ( template ) {
    citethis.citationStyle = 'apa';
    console.log('Get citation using style: ' + citethis.citationStyle);
    var selectedTemplate = citethis.citationStyles[citethis.citationStyle];
    template = template || selectedTemplate || citethis.citationStyles.apa;

    // if there is a custom template specified, use it here.
    if ( citethis.citationStyleCustom && citethis.citationStyleCustom != '') {
      template = citethis.citationStyleCustom;
    }

    var p = {
      author: citethis.$('txtAuthor').value,
      year: citethis.$('txtYearPublished').value,
      title: citethis.$('txtTitle').value,
      url: citethis.$('txtURL').value,
      lastAccessed: citethis.$('txtLastAccessed').value,
      lastUpdated: citethis.$('txtLastUpdated').value
    };

    // retrieve template using passed data.
    if ( typeof template == 'function' ) template = template(p);
    for ( var key in p ){
      template = template.replace ( "$" + key, p[key] );
    }
    //console.log('Returning template');
    return template;
  },

  _isFirstRun: true,
  getMetaTag: function ( metaTagName ) {
    metaTagName = metaTagName.toLowerCase();
    //console.log ( "metaTag: " + metaTagName );
    try {
      if ( citethis._isFirstRun ) {
        citethis._isFirstRun = false;

        var root =  citethis.doc.documentElement;
        //console.log ( "root: " + root );
        if (root) {
          //console.log("root tag : " + root.tagName);
        }
      }
      var head = citethis.doc.getElementsByTagName ("head");
      //console.log ( "head length: " + head.length );
      var meta = citethis.doc.getElementsByTagName("meta");
      //console.log("meta.length = " + meta.length);
      //console.log("parts.length = " + citethis.doc.getElementsByTagName("script").length);
      for (var i = 0; i < meta.length; i++) {
        if (meta[i].name && meta[i].name.toLowerCase() == metaTagName) {
          return meta[i];
        }
      }
    }
    catch ( e ) {
      alert ( e.message );
    }
    return null;
  },

  _reduceWhitespace: function ( str ) {
    return str.replace (/\s+/, ' ');
  },

  getFirstElementByClass: function (className, prop) {
    prop = prop || 'innerHTML';
    var els = citethis.doc.getElementsByClassName(className); 
    if ( els && els.length > 0 ) {
      return els[0][prop];
    }
    return null;
  },

  getSiteSpecificByTab: function(tab, funcName) {
    let handlers = SiteSpecificHandlers
    // run site specific functions
    for(let i = 0; i < handlers.length; i++){
      var handler = handlers[i]; // set of functions
      if ( handler && handler.is && handler.is (tab) ) { // if func is exists
        let func = handler[funcName];
        if (func) { // if func exists
          console.log({
            what: 'Calling site specific func',
            funcName: funcName,
            tab: tab
          });
          return func.call(this, tab);
        }
      }
    }
    return null;
  },
  /**
   * Will remove whitespace from either side of the string.
   * will also remove non-word characters at end of string.
   */
  trim: function(str) {
    return str.replace(/^\s+/, '').replace(/[\s\W]+$/, ''); //trim
  },

  formatAuthor: function ( author ) {
    try {
      if (author) {			
        author = citethis._reduceWhitespace (author);


        author = author.replace(/^\s*by */i, ''); // remove "by"

        // deal with associated press? 
        author = author.replace(/,\s*Associated Press[.\s\S]+$/ig, '');
        author = author.replace(/,\s*AP[.\s\S]+$/g, '');

        author = citethis.trim (author);
        author = citethis.capitalize (author);
        return author;
      }
      return '';
    }
    catch (e){
      alert ( 'formatAuthor exception: ' + e );
      return '';
    }
  },

  /**
   * Check to see if there is an element with ID "byline"
   */
  getAuthorHasBylineElement: function () {

    var el = citethis.getElement('byline'),
      rtn = null;
    //console.log ('getAuthorHasBylineElement started ' + el);
    if (el) {
      //console.log ('getAuthorHasBylineElement: has el' + el);
      var val = el.value || el.innerHTML;
      if (val && val != '') {
        rtn = val;
      }
    }
    return rtn;
  },

  getElement: function ( id ) {
    return citethis.doc.getElementById ( id );
  },

  getAuthor: function (tab) {
    var author = "Last, First",
      metaByl = citethis.getMetaTag ( "byl" ),
      metaAuthor = citethis.getMetaTag ( "author" ),
      siteSpec =  citethis.getSiteSpecificByTab(tab, 'getAuthor');

    //console.log("author: " + siteSpec);
    if ( siteSpec || siteSpec == '' ) return citethis.formatAuthor (siteSpec);

    try {
      //console.log ( "metaByl: " + metaByl );
      //console.log ( "metaAuthor: " + metaAuthor );
      var first = citethis.getAuthorHasBylineElement();

      if ( first ) {
        author = first;
      }
      else if ( metaAuthor && metaAuthor.content != '') {
        author = metaAuthor.content;
      }
      else if ( metaByl && metaByl.content != '' ) {
        // check for a byline meta element
        author = metaByl.content;
      }
      else {
        // see if there are any elements marked byline
        var elByl = citethis.doc.getElementsByClassName ( "byline" );

        //console.log('byline elements:' + elByl.length);

        if ( elByl && elByl.length > 0 ) {
          // strip and stripTags functions from prototypejs
          author = elByl[0].
            textContent.
            replace(/^\s+/, '').replace(/\s+$/, '');

          author = citethis._reduceWhitespace ( author );
          ;
        }
        else {
          // check for author elements
          var elAuthorText = citethis.getFirstElementByClass('author', 'textContent');
          if(elAuthorText && elAuthorText != '') {
            author = elAuthorText;
          }
          else {
            var parts = citethis.doc.body ? citethis.doc.body.textContent.match ( /by (([A-Z\.'-] ?){2,3})/ ) : null;
            //console.log ( "parts: " + parts );
            if ( parts && parts[0] ) {
              author = citethis._reduceWhitespace ( parts[0] );
            }
            else {
              // other fail-safes
            }
          }
        }
      }
    }
    catch(e){
      alert ( e.message );
    }
    return citethis.formatAuthor (author);
  },

  getYearPublished: function () {
    return new Date().getFullYear();
  },

  getURL: function () {
    return citethis._cachedUrl;
  },

  getLastUpdated: function () {
    return citethis.getLastAccessed();
  },

  getLastAccessed: function () {

    var m_names = ["January", "February", "March",
      "April", "May", "June", "July", "August", "September",
      "October", "November", "December"];

    var d = new Date();
    return citethis.Date.format(d, citethis.dateformat);
  },

  getHost: function() {
    var parts = citethis.getURL().split('/');
    if(parts.length <= 2) {
      console.log('No host available');
      return '';
    }
    return parts[2]; // returns part before com, net'
  },

  getDomain: function () {
    var parts = citethis.getHost().split('.');
    if(parts.length >= 2) return parts[parts.length-2];

    console.log('no domain available');
    return '';
  },

  formatTitle: function ( title ) {
    //console.log('formatting ' + title);
    if (!title) return null;

    //console.log('domain?');
    var h = citethis.getDomain ();
    //console.log('domain: ' + h);

    try{
      // if host appears in title, probably should be removed.
      title = title.replace (new RegExp('\\b' + h + '\\b', 'ig'), '');
      //console.log('domain: ' + h);
      title = title.replace (/^\W+/, ''); // replace non-word chars at beginning
      title = title.replace(/\W+$/, ''); //replace at end 
    }
    catch(e){console.log('error in formatTitle:'+e);}
    return title;

  },

  prepareTitle: function (tab) {
    let title = tab.title;

    //console.log('prepareTitle: getting');
    var siteSpec =  citethis.getSiteSpecificByTab(tab, 'getTitle');
    if ( siteSpec ) {
      //console.log('prepareTitle: got site specific title');
      return citethis.formatTitle(siteSpec);
    }

    if ( title == "Mozilla Firefox" ) {
      return "Website Title";
    }
    // some people have reported the browser is attached to title.
    //console.log('prepareTitle: formatting title: ' + title);
    let formatted = citethis.formatTitle(title.replace(/ - Mozilla Firefox$/i, ''));

    return formatted;
  },

  showCitationWindow: function ( val ) {
    //citethis.$('citethisRoot').parentNode.style.display = val ? '' : 'none';
    if ( val ) {
      citethis.updateCitation();
    }
  },

  citethisWindowIsVisible: function () {
    return citethis.$('citethisRoot').parentNode.style.display == '';
  },

  toggleCitationWindow: function () {
    citethis.showCitationWindow ( ! citethis.citethisWindowIsVisible () );
  },

  openCitationDialog : function () {
    try {
      citethis.toggleCitationWindow ();
    }
    catch ( e ) {
      alert ( e.message );
    }

  }

};

const Wikipedia = {
  is: function(tab) {
    return /wikipedia\.org\//i.test(tab.url);
  },
  getAuthor: () => {
    return '';
  },
  getTitle: (tab) => {
    tab.title.replace(/ - Wikipedia.+/, '');
  }
};

const CNN = {
  is: function(tab) {
    return /cnn\.com\//i.test(tab.url);
  },
  getAuthor: function(tab) {
    var els = document.getElementsByClassName('cnn_strycbftrtxt');
    if (els && els.length > 0 ) {
      var e = els[0],
        matches = /^cnn's(.+) contributed.+/ig.exec(e.innerHTML);
      if (matches && matches.length > 1 ) {
        return matches[1];
      }
    }
    // try getting metadata__byline__author
    els = citethis.doc.getElementsByClassName('metadata__byline__author');
    console.log('CNN metadata');
    if(els && els.length > 0) {
      var content = els[0].innerHtml;
      return content;
    }
    // try getting meta author
    var metaAuthor = citethis.getMetaTag ( "author" );
    if ( metaAuthor ) {
      var c = metaAuthor.content,
        parts = c.split(',');
      parts = parts.slice(0, parts.length-1);
      return parts.join (',');
    }
    return null;
  },
  getTitle: function(tab) {
    return tab.title.replace(/ - CNN.+/, '');
  }
};

const Huffington = {
  is: function (tab) {
    return /huffingtonpost\.com/i.test ( tab.url );
  },
  getAuthor: function (tab) {
    return citethis.getFirstElementByClass ('wire_author');
  }
};

const ABCNews = {
  is: function (tab) {
    return /abcnews\.go\.com/i.test (tab.url);
  },
  getAuthor: function (tab) {
    var a = citethis.getFirstElementByClass ('story_byline', 'textContent');

    return a ? a.replace(/ABC.+/i, ''): null;
  }
};

const FoxNews = {
  is: function (tab) { return /fox\w+\.com/i.test(tab.url); },
  getTitle: function (tab) {
    return tab.title.
      replace(/.*FOXNews.com\s+-\s+/i, '').
      replace(/ - FOX.+/i, '');
  }
};

const NYT = {
  is: (tab) => { return /nytimes.com/i.test(tab.url); },
  getAuthor: (tab) => {
    let el = document.querySelector('.byline-author');
    console.log({
      what: 'Getting NYT author',
      el: el,
      body: document.body
    });
    return null;
  }
};

const SiteSpecificHandlers = [Wikipedia, CNN, Huffington, ABCNews, FoxNews, NYT];

// the following functions taken from datejs library, with MIT license.
citethis.Date = {}; 
citethis.Date.CultureInfo = {
    name: "en-US",
    englishName: "English (United States)",
    nativeName: "English (United States)",
    dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    abbreviatedDayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    shortestDayNames: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    firstLetterDayNames: ["S", "M", "T", "W", "T", "F", "S"],
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    abbreviatedMonthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    amDesignator: "AM",
    pmDesignator: "PM",
    firstDayOfWeek: 0,
    twoDigitYearMax: 2029,
    dateElementOrder: "mdy",
    formatPatterns: {
        shortDate: "M/d/yyyy",
        longDate: "dddd, MMMM dd, yyyy",
        shortTime: "h:mm tt",
        longTime: "h:mm:ss tt",
        fullDateTime: "dddd, MMMM dd, yyyy h:mm:ss tt",
        sortableDateTime: "yyyy-MM-ddTHH:mm:ss",
        universalSortableDateTime: "yyyy-MM-dd HH:mm:ssZ",
        rfc1123: "ddd, dd MMM yyyy HH:mm:ss GMT",
        monthDay: "MMMM dd",
        yearMonth: "MMMM, yyyy"
    },
    regexPatterns: {
        jan: /^jan(uary)?/i,
        feb: /^feb(ruary)?/i,
        mar: /^mar(ch)?/i,
        apr: /^apr(il)?/i,
        may: /^may/i,
        jun: /^jun(e)?/i,
        jul: /^jul(y)?/i,
        aug: /^aug(ust)?/i,
        sep: /^sep(t(ember)?)?/i,
        oct: /^oct(ober)?/i,
        nov: /^nov(ember)?/i,
        dec: /^dec(ember)?/i,
        sun: /^su(n(day)?)?/i,
        mon: /^mo(n(day)?)?/i,
        tue: /^tu(e(s(day)?)?)?/i,
        wed: /^we(d(nesday)?)?/i,
        thu: /^th(u(r(s(day)?)?)?)?/i,
        fri: /^fr(i(day)?)?/i,
        sat: /^sa(t(urday)?)?/i,
        future: /^next/i,
        past: /^last|past|prev(ious)?/i,
        add: /^(\+|after|from)/i,
        subtract: /^(\-|before|ago)/i,
        yesterday: /^yesterday/i,
        today: /^t(oday)?/i,
        tomorrow: /^tomorrow/i,
        now: /^n(ow)?/i,
        millisecond: /^ms|milli(second)?s?/i,
        second: /^sec(ond)?s?/i,
        minute: /^min(ute)?s?/i,
        hour: /^h(ou)?rs?/i,
        week: /^w(ee)?k/i,
        month: /^m(o(nth)?s?)?/i,
        day: /^d(ays?)?/i,
        year: /^y((ea)?rs?)?/i,
        shortMeridian: /^(a|p)/i,
        longMeridian: /^(a\.?m?\.?|p\.?m?\.?)/i,
        timezone: /^((e(s|d)t|c(s|d)t|m(s|d)t|p(s|d)t)|((gmt)?\s*(\+|\-)\s*\d\d\d\d?)|gmt)/i,
        ordinalSuffix: /^\s*(st|nd|rd|th)/i,
        timeContext: /^\s*(\:|a|p)/i
    },
    abbreviatedTimeZoneStandard: {
        GMT: "-000",
        EST: "-0400",
        CST: "-0500",
        MST: "-0600",
        PST: "-0700"
    },
    abbreviatedTimeZoneDST: {
        GMT: "-000",
        EDT: "-0500",
        CDT: "-0600",
        MDT: "-0700",
        PDT: "-0800"
    }
};
citethis.Date.getMonthNumberFromName = function (name) {
    var n = citethis.Date.CultureInfo.monthNames,
        m = citethis.Date.CultureInfo.abbreviatedMonthNames,
        s = name.toLowerCase();
    for (var i = 0; i < n.length; i++) {
        if (n[i].toLowerCase() == s || m[i].toLowerCase() == s) {
            return i;
        }
    }
    return -1;
};
citethis.Date.getDayNumberFromName = function (name) {
    var n = citethis.Date.CultureInfo.dayNames,
        m = citethis.Date.CultureInfo.abbreviatedDayNames,
        o = citethis.Date.CultureInfo.shortestDayNames,
        s = name.toLowerCase();
    for (var i = 0; i < n.length; i++) {
        if (n[i].toLowerCase() == s || m[i].toLowerCase() == s) {
            return i;
        }
    }
    return -1;
};
citethis.Date.isLeapYear = function (year) {
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
};
citethis.Date.getDaysInMonth = function (year, month) {
    return [31, (citethis.Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};
citethis.Date.getTimezoneOffset = function (s, dst) {
    return (dst || false) ? citethis.Date.CultureInfo.abbreviatedTimeZoneDST[s.toUpperCase()] : 		
		citethis.Date.CultureInfo.abbreviatedTimeZoneStandard[s.toUpperCase()];
};
citethis.Date.getTimezoneAbbreviation = function (offset, dst) {
    var n = (dst || false) ? citethis.Date.CultureInfo.abbreviatedTimeZoneDST : citethis.Date.CultureInfo.abbreviatedTimeZoneStandard,
    p;
    for (p in n) {
        if (n[p] === offset) {
            return p;
        }
    }
    return null;
};
citethis.Date.getDayName = function (dt, abbrev) {
    return abbrev ? citethis.Date.CultureInfo.abbreviatedDayNames[dt.getDay()] : citethis.Date.CultureInfo.dayNames[dt.getDay()];
};
citethis.Date.getMonthName = function (dt, abbrev) {
    return abbrev ? citethis.Date.CultureInfo.abbreviatedMonthNames[dt.getMonth()] : citethis.Date.CultureInfo.monthNames[dt.getMonth()];
};
citethis.Date.format = function (dt, format) {
	var self = dt;
    var p = function p(s) {
        return (s.toString().length == 1) ? "0" + s : s;
    };
    return format ? format.replace(/dd?d?d?|MM?M?M?|yy?y?y?|hh?|HH?|mm?|ss?|tt?|zz?z?/g, function (format) {
        switch (format) {
        case "hh":
            return p(self.getHours() < 13 ? self.getHours() : (self.getHours() - 12));
        case "h":
            return self.getHours() < 13 ? self.getHours() : (self.getHours() - 12);
        case "HH":
            return p(self.getHours());
        case "H":
            return self.getHours();
        case "mm":
            return p(self.getMinutes());
        case "m":
            return self.getMinutes();
        case "ss":
            return p(self.getSeconds());
        case "s":
            return self.getSeconds();
        case "yyyy":
            return self.getFullYear();
        case "yy":
            return self.getFullYear().toString().substring(2, 4);
        case "dddd":
            return citethis.Date.getDayName(dt);
        case "ddd":
            return citethis.Date.getDayName(dt, true);
        case "dd":
            return p(self.getDate());
        case "d":
            return self.getDate().toString();
        case "MMMM":
            return citethis.Date.getMonthName(dt);
        case "MMM":
            return citethis.Date.getMonthName(dt, true);
        case "MM":
            return p((self.getMonth() + 1));
        case "M":
            return self.getMonth() + 1;
        case "t":
            return self.getHours() < 12 ? 'A' : 'P';
        case "tt":
            return self.getHours() < 12 ? 'AM' : 'PM';
        case "zzz":
        case "zz":
        case "z":
            return "";
        }
    }) : this._toString();
};

root.addEventListener("load", function(e) { citethis.onLoad(e); }, false);
root.addEventListener("unload", function(e) { citethis.shutdown(e); }, false);

})(window);
