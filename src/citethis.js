import {
  SiteSpecificHandlers,
  getSiteSpecific
} from './siteSpecific';

(function(root) {

var lastUrl = null;

function executeContentScript(tab) {
  browser.tabs.executeScript({
    file: '/sidebar/extractFields.js'
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
  if(! message._context) return;

  if(message._context == 'log') {
    console.log(message.message);
    return;
  }

  if(message._context == 'fields') {
    console.log({
      what: 'Got fields from execute script',
      fields: message.fields
    });
    citethis._setPageVariablesWithOpts(Object.assign(
      citethis.getDefaultPageVariables(), message.fields));
  }
  console.log(message._context);
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
    },
    bibtex: function (data) {
      data.bibID = citethis.generateBibTexID(data);
      if (data.author) {
        return `@article\{${data.bibID},\n\tauthor\t={$author},\n\ttitle\t={$title},\n\tyear\t={$year},\n\turl\t={$url}\n\t\}`;
      }
      else {
        throw new Error("Source lacks all required BibTex data: author, year");
      }
    },
  },

  prefs: null,
  currentURL: '',
  citationStyle: 'apa',
  citationStyleCustom: '',
  dateformat: "MMMM dd, yyyy",
  debug: function ( msg ){

  },

  clearCitationList: function() {
    citethis.$('citationList').value = '';
  },

  addCitationToList: function(newCitation) {
    newCitation = newCitation || citethis.getCitationText ();
    console.log(`Adding citation to list: ${newCitation}`);
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
    citethis.updateCitation({
      immediateUpdate: true
    });
  },

  onTabUpdated: function() {
    citethis.onTabActivated();
  },

  onCitationStyleChanged: function(event) {
    citethis.citationStyle = event.target.value;
    console.log(`citation style changed to ${citethis.citationStyle}`);
    this.updateCitation({
      forceUpdate: true
    });
  },

  onDateFormatChanged: function(event) {
    const newValue = event.target.value
    if(citethis.dateformat === newValue) {
      return;
    }

    citethis.dateformat = newValue;
    console.log(`date format changed to ${citethis.dateformat}`);
    this.updateCitation({
      forceUpdate: true
    });
  },

  onLoad: function() {
    try {

      browser.runtime.onMessage.addListener(onContentScriptMessage);
      browser.tabs.onActivated.addListener(citethis.onTabActivated);
      browser.tabs.onUpdated.addListener(citethis.onTabActivated);
      // initialization code

      this.initialized = true;

      citethis.setPageVariables({
        setLastAccessed: true
      });
      setInterval(this.checkPage, 1000);
      var e = citethis.$('txtCitationText'), select = function(e){
        citethis.$('txtCitationText').select();
      };

      citethis.$('txtCitationText').addEventListener("focus", select, false);
      citethis.$('txtCitationText').addEventListener("click", select, false);
      document.getElementById('preferences').addEventListener('change', this.onCitationStyleChanged.bind(this));
      let elDateFormat = document.getElementById('dateFormat');
      elDateFormat.value = citethis.dateformat;
      let onDateFormatChanged = this.onDateFormatChanged.bind(this)
      const events = 'keyup change blur'.split(' ');
      events.forEach((type) => {
        elDateFormat.addEventListener(type, onDateFormatChanged);
      });

      var fields = 'txtAuthor txtYearPublished txtTitle txtURL txtLastAccessed txtLastUpdated'.split(' ');
      const update = this.generateCitationDelayed.bind(this);
      fields.forEach((field) => {
        events.forEach((event) => {
          document.getElementById(field)
            .addEventListener(event, update, false);
        });
      });

      citethis.updateCitation();

      document.getElementById('btnAddToCitationList').addEventListener(
        'click', () => {
          citethis.addCitationToList();
        }
      );
      document.getElementById('citationList').addEventListener('focus', (event) => {
        event.target.select();
      });


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
  updateCitation: function ( options ) {
    if(citethis.updateCitationIsPending) {
      console.log('update is already pending');
      return;
    }

    const opts = Object.assign({
      immediateUpdate: false,
      forceUpdate: false
    }, options);
    console.log('updateCitation');
    try {
      if (!citethis.citethisWindowIsVisible())
        return;

      //console.log('updateCitation: a');
      const immediateUpdate = opts.immediateUpdate === true;
      var f = () => {
        citethis.setPageVariables({
          setLastAccessed: true,
          forceUpdate: opts.forceUpdate
        });
        citethis.updateCitationIsPending = false;
        console.log('updateCitation complete');
      };
      citethis.updateCitationIsPending = true;
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

  generateCitationDelayed: function() {
    if(citethis.generateCitationDelayedPending) {
      return;
    }

    citethis.generateCitationDelayedPending = true;
    setTimeout(() => {
      citethis.generateCitation();
      citethis.generateCitationDelayedPending = false;
    }, 100);
  },

  getCitationText: function () {
    return citethis.$('txtCitationText').value;
  },

  _cachedUrl: '',

  setPageVariables: function( options ) {
    const opts = Object.assign({
      setLastAccessed: false,
      forceUpdate: false
    }, options);

    citethis.getActiveTab().then((tab) => {
      // prevent regeneration if we're at the same place
      if(!opts.forceUpdate && tab.url == lastUrl) return;

      lastUrl = tab.url;
      executeContentScript(tab);
      citethis._setPageVariables(tab, tab.url, tab.title, opts.setLastAccessed);
    });
  },

  _setPageVariablesWithOpts: function(opts) {
    console.log('set page variables with opts');

    function coal(first, ...args) {
      function rest() {
        return coal.apply(null, args);
      }
      if(first === undefined) return rest();
      if(first === null) return rest();

      return first;
    }

    let $ = citethis.$;
    console.log(opts);
    $('txtAuthor').value = coal(opts.author, $('txtAuthor').value);
    $('txtYearPublished').value = coal(opts.year, $('txtYearPublished').value);
    $('txtTitle').value = coal(opts.title, $('txtTitle').value);
    $('txtURL').value = coal(opts.url, $('txtURL').value);
    $('txtLastAccessed').value = coal(opts.accessed, $('txtLastAccessed').value);
    $('txtLastUpdated').value = coal(opts.updated, $('txtLastUpdated').value);

    citethis.generateCitation ();
  },

  _setPageVariables: function ( tab, url, title, setLastAccessed ) {
    console.log('_setPageVariables');
    citethis.doc = document;
    citethis._isFirstRun = true;
    setLastAccessed = true;
    citethis._setPageVariablesWithOpts(Object.assign(citethis.getDefaultPageVariables(), {
      author: citethis.getAuthor (tab),
      title: citethis.prepareTitle (tab),
      url: tab.url
    }));

    console.log('Generated citation...');
  },

  getDefaultPageVariables() {
    return {
      year: citethis.getYearPublished (),
      accessed: citethis.getLastAccessed(),
      updated: citethis.getLastUpdated()
    }
  },

  getCitation: function ( template ) {
    citethis.citationStyle = citethis.citationStyle;
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
    return template;
  },

  _isFirstRun: true,

  getFirstElementByClass: function (className, prop) {
    prop = prop || 'innerHTML';
    var els = citethis.doc.getElementsByClassName(className); 
    if ( els && els.length > 0 ) {
      return els[0][prop];
    }
    return null;
  },

  getSiteSpecificByTab: function(tab, funcName) {
    let handler = getSiteSpecific(tab);
    let func = handler[funcName];
    if (func) { // if func exists
      console.log({
        what: 'Calling site specific func',
        funcName: funcName,
        tab: tab
      });
      return func.call(this, tab);
    }
    return null;
  },

  generateBibTexID(data) {
    if (data.author && data.year) {
      return `${data.author.replace(/\s/g, "_") + '_' + data.year + '_' + citethis.getDomain()}`;
    } else if (data.author) {
      return `${data.author.replace(/\s/g, "_") + (data.year ? '_' + data.year : '') + '_' + citethis.getDomain()}`;
    } else {
      throw new Error("Source lacks all required BibTex data: author, year, journal");
    }
  },

  /**
   * Check to see if there is an element with ID "byline"
   */
  getElement: function ( id ) {
    return citethis.doc.getElementById ( id );
  },

  getAuthor: function() {
    return null;
    //return citethis.formatAuthor (author);
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
    console.log('got last accessed');
    return citethis.Date.format(new Date(), citethis.dateformat);
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
    if (!title) return null;

    var h = citethis.getDomain ();

    try{
      // if host appears in title, probably should be removed.
      title = title.replace (new RegExp('\\b' + h + '\\b', 'ig'), '');
      title = title.replace (/^\W+/, ''); // replace non-word chars at beginning
      title = title.replace(/\W+$/, ''); //replace at end 
    }
    catch(e){console.log('error in formatTitle:'+e);}
    return title;

  },

  prepareTitle: function (tab) {
    let title = tab.title;

    var siteSpec =  citethis.getSiteSpecificByTab(tab, 'getTitle');
    if ( siteSpec ) {
      return citethis.formatTitle(siteSpec);
    }

    if ( title == "Mozilla Firefox" ) {
      return "Website Title";
    }
    // some people have reported the browser is attached to title.
    let formatted = citethis.formatTitle(title.replace(/ - Mozilla Firefox$/i, ''));

    return formatted;
  },

  citethisWindowIsVisible: function () {
    return citethis.$('citethisRoot').parentNode.style.display == '';
  }
};

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

})(window);
