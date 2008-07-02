function $ (el) { return document.getElementById ( el ); }

var citethis = {
  currentURL: '',
  onLoad: function() {
    // initialization code

    this.initialized = true;
    this.strings = document.getElementById("citethis-strings");
    document.getElementById("contentAreaContextMenu")
            .addEventListener("popupshowing", function(e) { this.showContextMenu(e); }, false);
	
	citethis.showCitationWindow ( false );
	citethis.setPageVariables (true);
	window.setInterval ( this.checkPage, 1 );
	var e = $('txtCitationText'),
		select = function(e) { $('txtCitationText').select(); };
	$('txtCitationText').addEventListener("focus", select, false);
	$('txtCitationText').addEventListener("click", select, false);
	
	var fields = 'txtAuthor txtYearPublished txtTitle txtURL txtLastAccessed'.split ( ' ' );
	for ( var i = 0; i < fields.length; i ++ ) {
		$(fields[i]).addEventListener('blur', citethis.generateCitation, false);
	}
	
  },
  
  checkPage: function () {
	if ( citethis.getURL () != citethis.currentURL ) {
	  citethis.currentURL = citethis.getURL ();
	  citethis.setPageVariables ();
	}
  },
  
  generateCitation: function () {
	$('txtCitationText').value = citethis.getCitation ();
  },
  
  setPageVariables: function ( setLastAccessed ) {
	setLastAccessed = setLastAccessed === true;
	$('txtAuthor').value = citethis.getAuthor ();
	$('txtYearPublished').value = citethis.getYearPublished ();
	$('txtTitle').value = citethis.getTitle ();
	$('txtURL').value = citethis.getURL ();
	if ( setLastAccessed ) 
		$('txtLastAccessed').value = citethis.getLastAccessed ();
		
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
    citethis.onMenuItemCommand(e);
  },
  
  showCitationWindow: function ( val ) {
	$('vboxCitation').parentNode.style.display = val ? '' : 'none';
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
	//window.removeAttribute("hidden");
	//window.openDialog ( "chrome://citethis/content/testDialog.xul", "_blank", "chrome,centerscreen", {author: citethis.getAuthor() } );
  }

};
window.addEventListener("load", function(e) { citethis.onLoad(e); }, false);


