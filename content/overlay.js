function $ (el) { return document.getElementById ( el ); }

var citation = {
  currentURL: '',
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("citation-strings");
    document.getElementById("contentAreaContextMenu")
            .addEventListener("popupshowing", function(e) { this.showContextMenu(e); }, false);
	
	citation.showCitationWindow ( false );
	citation.setPageVariables (true);
	window.setInterval ( this.checkPage, 1 );
	var e = $('txtCitationText'),
		select = function(e) { $('txtCitationText').select(); };
	$('txtCitationText').addEventListener("focus", select, false);
	$('txtCitationText').addEventListener("click", select, false);
	
	var fields = 'txtAuthor txtYearPublished txtTitle txtURL txtLastAccessed'.split ( ' ' );
	for ( var i = 0; i < fields.length; i ++ ) {
		$(fields[i]).addEventListener('blur', citation.generateCitation, false);
	}
	
  },
  
  checkPage: function () {
	if ( citation.getURL () != citation.currentURL ) {
	  citation.currentURL = citation.getURL ();
	  citation.setPageVariables ();
	}
  },
  
  generateCitation: function () {
	$('txtCitationText').value = citation.getCitation ();
  },
  
  setPageVariables: function ( setLastAccessed ) {
	setLastAccessed = setLastAccessed === true;
	$('txtAuthor').value = citation.getAuthor ();
	$('txtYearPublished').value = citation.getYearPublished ();
	$('txtTitle').value = citation.getTitle ();
	$('txtURL').value = citation.getURL ();
	if ( setLastAccessed ) 
		$('txtLastAccessed').value = citation.getLastAccessed ();
		
	citation.generateCitation ();
	
  },

  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-citation").hidden = gContextMenu.onImage;
  },
  onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    // promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                // this.strings.getString("helloMessage"));
	//promptService.alert ( window, 'Citation', citation.getCitation () );
	citation.openCitationDialog ();
  },
  
  alert: function (msg) {
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, 'Message', msg);
  },
  
  getCitation: function () {
	
	return $('txtAuthor').value + '. (' + 
		$('txtYearPublished').value + '). ' + 
		$('txtTitle').value + '. Available: ' + 
		$('txtURL').value + '. Last accessed ' + 
		$('txtLastAccessed').value + '.';
  },
  
  getAuthor: function () {
	return 'LastNameFirstName';
  },
  
  getYearPublished: function () {
	return '2008';
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
    citation.onMenuItemCommand(e);
  },
  
  showCitationWindow: function ( val ) {
	$('vboxCitation').parentNode.style.display = val ? '' : 'none';
  },
  
  citationWindowIsVisible: function () {
	return $('vboxCitation').parentNode.style.display == '';
  },
  
  toggleCitationWindow: function () {
	citation.showCitationWindow ( ! citation.citationWindowIsVisible () );
  },
  
  openCitationDialog : function () {
	//citation.alert ( "hiding window" );
	//window.setAttribute("hidden", "true");
	try {
		//window.hidden = true;
		//window.style.display = 'none';
		//window.setAttribute ( 'style', 'height: 10px;' );
		citation.toggleCitationWindow ();
		
	}
	catch ( e ) {
		citation.alert ( e.message );
	}
	//window.removeAttribute("hidden");
	//window.openDialog ( "chrome://citation/content/testDialog.xul", "_blank", "chrome,centerscreen", {author: citation.getAuthor() } );
  }

};
window.addEventListener("load", function(e) { citation.onLoad(e); }, false);


