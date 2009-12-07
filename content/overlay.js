function $ (el) { return document.getElementById ( el ); }

var citethis = {
  citationStyles: {
  	apa: '$author. ($year) $title. Available: $url. Last accessed $lastAccessed',
	ama: '$author. $title. $url. Updated $lastUpdated. Accessed $lastAccessed.'
  },
  
  prefs: null,
  currentURL: '',
  citationStyle: '??specify default here',
  citationStyleCustom: '',
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
			
  	$('txtDebug').value = timestamp + ': ' + msg + '\n' + $('txtDebug').value;
  },
  onLoad: function() {
    // initialization code
	 
    this.initialized = true;
    this.strings = document.getElementById("citethis-strings");
    document.getElementById("contentAreaContextMenu")
            .addEventListener("popupshowing", function(e) { this.showContextMenu(e); }, false);
	
	citethis.showCitationWindow ( false );
	citethis.setPageVariables (true);
	window.setInterval ( this.checkPage, 1000 );
	var e = $('txtCitationText'),
		select = function(e) { $('txtCitationText').select(); };
	$('txtCitationText').addEventListener("focus", select, false);
	$('txtCitationText').addEventListener("click", select, false);
	
	var fields = 'txtAuthor txtYearPublished txtTitle txtURL txtLastAccessed txtLastUpdated'.split ( ' ' );
	for ( var i = 0; i < fields.length; i ++ ) {
		$(fields[i]).addEventListener('blur', citethis.generateCitation, false);
	}
	
	// setup preferences
	
	this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("citethis.");
	this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
	this.prefs.addObserver("", this, false);
	
	citethis.updateCitationStyle();
	citethis.updateCitation();
  },
  
  /**
   * Causes the citation to be updated.
   * @param {Object} immediateUpdate
   */
  updateCitation: function ( immediateUpdate ) {
  	if ( ! citethis.citethisWindowIsVisible () ) return; 
	
  	immediateUpdate = immediateUpdate === true;
	var f = citethis.setPageVariables;
	if (immediateUpdate) {
		f ();
	}
	else {
		window.setTimeout(f, 1000);
	}
  },

  updateCitationStyle: function () {
  	citethis.citationStyle = String( citethis.prefs.getCharPref("citationStyle") ).toLowerCase();
	citethis.citethis.citationStyleCustom = String( citethis.prefs.getCharPref("citationStyleCustom") ).toLowerCase();
	$('lblCitationStyle').value = citethis.citationStyle.toUpperCase();
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
 
     switch(data)
     {
       case "citationStyle":
         // update citation
		 citethis.updateCitationStyle ();
		 // update the citation
		 citethis.updateCitation ();
         break;
     }
   },


  shutdown: function()
  {
    this.prefs.removeObserver("", this);
  },

  
  checkPage: function () {
	if ( citethis.getURL () != citethis.currentURL ) {
	  citethis.currentURL = citethis.getURL ();
	  citethis.updateCitation ();
	}
  },
  
  /**
   * Will generate the citation and set
   * the citation box with the value of that
   * citation.
   */
  generateCitation: function () {
	$('txtCitationText').value = citethis.getCitation ();
  },
  
  setPageVariables: function ( setLastAccessed ) {
  	citethis.doc = window._content.document;
  	citethis._isFirstRun = true;
	setLastAccessed = setLastAccessed === true;
	$('txtAuthor').value = citethis.getAuthor ();
	$('txtYearPublished').value = citethis.getYearPublished ();
	$('txtTitle').value = citethis.getTitle ();
	$('txtURL').value = citethis.getURL ();
	if ( setLastAccessed ) {
		$('txtLastAccessed').value = citethis.getLastAccessed ();
		$('txtLastUpdated').value = citethis.getLastUpdated ();
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
		author: $('txtAuthor').value,
		year: $('txtYearPublished').value,
		title: $('txtTitle').value,
		url: $('txtURL').value,
		lastAccessed: $('txtLastAccessed').value,
		lastUpdated: $('txtLastUpdated').value
	};
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
  
  getAuthor: function () {
  	var author = "Last, First",
		metaByl = citethis.getMetaTag ( "byl" );
	
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
					//replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '').
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
	//window.opener.location.href

	// function getURL() {
  // var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
           // getService(Components.interfaces.nsIWindowMediator);
  // var recentWindow = wm.getMostRecentWindow("navigator:browser");
  // return recentWindow ? recentWindow.content.document.location : null;
// }

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
	

	return m_names[curr_month] + ' ' + curr_date + ', ' + curr_year;
  },
  
  getTitle: function () {
	return document.title;
	// var titles = document.getElementsByTagName ( 'title' );
	// if ( titles.length > 0 ) {
		// return titles[0].innerHTML;
	// }
  },
  
  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    citethis.onMenuItemCommand(e);
  },
  
  showCitationWindow: function ( val ) {
  	 
	$('vboxCitation').parentNode.style.display = val ? '' : 'none';
	if ( val ) {
		citethis.updateCitation();
	}
  },
  
  citethisWindowIsVisible: function () {
	return $('vboxCitation').parentNode.style.display == '';
  },
  
  toggleCitationWindow: function () {
	citethis.showCitationWindow ( ! citethis.citethisWindowIsVisible () );
  },
  
  openCitationDialog : function () {
	//citethis.alert ( "hiding window" );
	//window.setAttribute("hidden", "true");
	try {
		//window.hidden = true;
		//window.style.display = 'none';
		//window.setAttribute ( 'style', 'height: 10px;' );
		citethis.toggleCitationWindow ();
		
	}
	catch ( e ) {
		citethis.alert ( e.message );
	}
	
  }

};
window.addEventListener("load", function(e) { citethis.onLoad(e); }, false);
window.addEventListener("unload", function(e) { citethis.shutdown(e); }, false);

