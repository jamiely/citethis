var citethis = {
  $: function (el) { return document.getElementById ( el ); },
  citationStyles: {
  	/**
  	 * These are functions which return a citation template. The variables
  	 * are prefixed by dollar signs.
  	 * @param {Object} data
  	 */
  	apa: function(data) {
		// apa specifies using not disclosed when the year is unknown http://owl.english.purdue.edu/owl/resource/560/10/
        var year = !data.year || data.year == '' ? "n.d." : "$year";

		// date should be spelled out!
		if ( data.author ) {
			return '$author. ('+year+') $title. Retrieved from $url';
		}
		else {
			return '$title. ('+year+') Retrieved from $url';
		}
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

  	return;

  	var n = new Date(),
		timestamp = [
			n.getFullYear(),
			n.getMonth(),
			n.getDate (),
			n.getHours(),
			n.getMinutes(),
			n.getSeconds()
			].join ("");

  	citethis.$('txtDebug').value = timestamp + ': ' + msg + '\n' + citethis.$('txtDebug').value;
  },
  onLoad: function() {
  	try {
		// initialization code

		this.initialized = true;
		this.strings = document.getElementById("citethis-strings");
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", function(e){
			this.showContextMenu(e);
		}, false);

        citethis.debug ( '1' );
		citethis.showCitationWindow(false);
		citethis.setPageVariables(true);
		window.setInterval(this.checkPage, 1000);
		var e = citethis.$('txtCitationText'), select = function(e){
			citethis.$('txtCitationText').select();
		};

	    citethis.debug (2);
		citethis.$('txtCitationText').addEventListener("focus", select, false);
		citethis.$('txtCitationText').addEventListener("click", select, false);

		var fields = 'txtAuthor txtYearPublished txtTitle txtURL txtLastAccessed txtLastUpdated'.split(' ');
		for (var i = 0; i < fields.length; i++) {
			citethis.$(fields[i]).addEventListener('blur', citethis.generateCitation, false);
		}

		citethis.debug(3);

		// setup preferences

		this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("citethis.");
		this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this.prefs.addObserver("", this, false);
        citethis.debug(4);
		citethis.updateCitationStyle();
		citethis.debug(5);
		citethis.updateCitation();
		citethis.debug(6);

	}
	catch (e) {
		citethis.debug ( 'Load issue: ' + e.message );
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

		immediateUpdate = immediateUpdate === true;
		var f = citethis.setPageVariables;
		if (immediateUpdate) {
			f();
		}
		else {
			window.setTimeout(f, 1000);
		}
	}
	catch(e) {
		citethis.debug(e.message);
	}
  },

  updateCitationStyle: function () {
  	try {
		citethis.dateformat = String( citethis.prefs.getCharPref("dateformat") );
        citethis.debug("Got Date Format");

		citethis.citationStyle = String( citethis.prefs.getCharPref("citationStyle") ).toLowerCase();
		citethis.debug("Got citation style");
	    citethis.citethis.citationStyleCustom = String( citethis.prefs.getCharPref("citationStyleCustom") ).toLowerCase();
		citethis.debug("Got Custom Style");
	    citethis.$('lblCitationStyle').value = citethis.citationStyle.toUpperCase();

	}
	catch (e) {
		citethis.debug(e.message);
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

  setPageVariables: function ( setLastAccessed ) {
  	citethis.doc = window._content.document;
  	citethis._isFirstRun = true;
	//setLastAccessed = setLastAccessed === true;
	setLastAccessed = true;
	citethis.$('txtAuthor').value = citethis.getAuthor ();
	citethis.$('txtYearPublished').value = citethis.getYearPublished ();
	citethis.$('txtTitle').value = citethis.getTitle ();
	citethis.$('txtURL').value = citethis.getURL ();
	if ( setLastAccessed ) {
		citethis.$('txtLastAccessed').value = citethis.getLastAccessed ();
		citethis.$('txtLastUpdated').value = citethis.getLastUpdated ();
	}

	citethis.generateCitation ();

  },

  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-citethis").hidden = gContextMenu.onImage;
  },
  onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    // promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                // this.strings.getString("helloMessage"));
	//promptService.alert ( window, 'Citation', citethis.getCitation () );
	citethis.openCitationDialog ();
  },

  alert: function (msg) {
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, 'Message', msg);
  },


  getCitation: function ( template ) {
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
  getMetaTag: function ( metaTagName ) {
  	metaTagName = metaTagName.toLowerCase();
	citethis.debug ( "metaTag: " + metaTagName );
	try {
		if ( citethis._isFirstRun ) {
			citethis._isFirstRun = false;

			var root =  citethis.doc.documentElement;
			citethis.debug ( "root: " + root );
			if (root) {
				citethis.debug("root tag : " + root.tagName);
				//citethis.debug("innerhtml: \n" + root.innerHTML);
			}
		}
		var head = citethis.doc.getElementsByTagName ("head");
		citethis.debug ( "head length: " + head.length );
		//if (head.length > 0) {
			//head = head[0];
			//var meta = head.getElementsByTagName("meta"); // retrieve all of the document's meta tags
			var meta = citethis.doc.getElementsByTagName("meta");
			citethis.debug("meta.length = " + meta.length);
			//citethis.debug ("innerhtml\n" + head.innerHTML);
			citethis.debug("parts.length = " + citethis.doc.getElementsByTagName("script").length);
			for (var i = 0; i < meta.length; i++) {
				if (meta[i].name && meta[i].name == metaTagName) {
					return meta[i];
				}
			}
		//}
	}
	catch ( e ) {
		alert ( e.message );
	}
	return null;
  },

  _reduceWhitespace: function ( str ) {
  	return str.replace (/\s{2,}/, ' ');
  },

  siteSpecific: {
    Wikipedia: {
		// @todo cache these funcs. change on page load
		is: function () {

			return /wikipedia\.org\//i.test(gURLBar.value);
		},
		getAuthor: function () {
			return '';
		},
		getTitle: function () {
			return document.title.replace(/ - Wikipedia.+/, '');
		}
	}
  },

  getSiteSpecific: function(funcName) {
    // run site specific functions
    for (var site in citethis.siteSpecific) {
        var funcs = citethis.siteSpecific [ site ]; // set of functions
        if ( funcs && funcs.is && funcs.is () ) { // if func is exists
			if (funcs[funcName]) { // if func exists
				return funcs[funcName]();
			}
        }
    }
	return null;
  },

  getAuthor: function () {
  	var author = "Last, First",
		metaByl = citethis.getMetaTag ( "byl" ),
		siteSpec =  citethis.getSiteSpecific('getAuthor');

    citethis.debug("author: " + siteSpec);
    if ( siteSpec || siteSpec == '' ) return siteSpec;

	try {
		citethis.debug ( "metaByl: " + metaByl );
		if ( metaByl ) {
			// check for a byline meta element
			author = metaByl.content;
		}
		else {
			// see if there are any elements marked byline
			var elByl = citethis.doc.getElementsByClassName ( "byline" );

			if ( elByl && elByl.length > 0 ) {
				// strip and stripTags functions from prototypejs
				author = elByl[0].
					textContent.
					replace(/^\s+/, '').replace(/\s+$/, '');

				author = citethis._reduceWhitespace ( author );
;
			}
			else {
				var parts = citethis.doc.body ? citethis.doc.body.textContent.match ( /by (([A-Z\.'-] ?){2,3})/ ) : null;
				citethis.debug ( "parts: " + parts );
				if ( parts && parts[0] ) {
					author = citethis._reduceWhitespace ( parts[0] );
				}
				else {
					// other fail-safes
				}
			}
		}
	}
	catch(e){
		alert ( e.message );
	}
	return String(author).replace(/^by */i, '');
  },

  getYearPublished: function () {
	return new Date().getFullYear();
  },

  getURL: function () {
	return gURLBar.value;
  },

  getLastUpdated: function () {
  	return citethis.getLastAccessed();
  },

  getLastAccessed: function () {

	var m_names = ["January", "February", "March",
		"April", "May", "June", "July", "August", "September",
		"October", "November", "December"];

	var d = new Date();
	var curr_date = d.getDate();
	var curr_month = d.getMonth();
	var curr_year = d.getFullYear();


	//return m_names[curr_month] + ' ' + curr_date + ', ' + curr_year;


	return Date.today().toString(citethis.dateformat);

  },

  getTitle: function () {
  	var siteSpec =  citethis.getSiteSpecific('getTitle');
    if ( siteSpec ) return siteSpec;
	if ( document.title == "Mozilla Firefox" )
	   return "Website Title";
	// some people have reported the browser is attached to title.
	// i see no such thing! putting this here just in case.
	return document.title.replace(/ - Mozilla Firefox$/i, '');
  },

  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    citethis.onMenuItemCommand(e);
  },

  showCitationWindow: function ( val ) {
	citethis.$('vboxCitation').parentNode.style.display = val ? '' : 'none';
	if ( val ) {
		citethis.updateCitation();
	}
  },

  citethisWindowIsVisible: function () {
	return citethis.$('vboxCitation').parentNode.style.display == '';
  },

  toggleCitationWindow: function () {
	citethis.showCitationWindow ( ! citethis.citethisWindowIsVisible () );
  },

  openCitationDialog : function () {
	try {
		citethis.toggleCitationWindow ();
	}
	catch ( e ) {
		citethis.alert ( e.message );
	}

  }

};
window.addEventListener("load", function(e) { citethis.onLoad(e); }, false);
window.addEventListener("unload", function(e) { citethis.shutdown(e); }, false);

