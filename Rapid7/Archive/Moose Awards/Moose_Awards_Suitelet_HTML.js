/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Mar 2013     mburstein
 *
 */
function getMooseHtmlContent(){

	var objMooseNominations = searchNominationsRecords();
	var objWinners = getWinningNominations(objMooseNominations);
	var objLastQNominations = getLastQNominations(objMooseNominations);
	
	// initialize object to hold content for nominations and winners seperately
	var objContent = new Object();
	
	// Internet Explorer sucks and won't display appropriately due to quirks mode.  Can't avoid quirks because can't set suitlet !DOCTYPE
	
	/*
	 *  ---BEGIN HTML CONTENT FOR GALLERIA
	 *  Style for most of the galleria is in Web Site Hosting Files > Live Hosting Files > galleria > themes > classic > galleria.moose.css
	 */
	var nominationContent = '';
	nominationContent += '</body>';
	nominationContent += '<head>';
	nominationContent += '<!--[if IE]><meta http-equiv="X-UA-Compatible" content="IE=10" /><![endif]-->';
	nominationContent += '<link type="text/css" rel="stylesheet" href="https://system.netsuite.com/c.663271/galleria/themes/classic/galleria.moose.css" />';
	nominationContent += '<style type="text/css">';
	nominationContent +=		'body {background: none !important;}';
	nominationContent += 		'#img.background-img {width: 100%; position: absolute;top: 0;left: 0;}';
	nominationContent +=		'html {background:url(https://system.netsuite.com/core/media/media.nl?id=693055&c=663271&h=a99a10ab543f899618e6) no-repeat center center fixed;';
	nominationContent +=		'-webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; background-size: cover;}';
	nominationContent += '.pt_title, #custpage_error_val {font-weight: bold; color:ivory;}'; // Suitelet header text
	nominationContent += '.smallgraytextnolink {font-size: 16px; font-weight: bold; color:ivory;}'; // Suitelet form field text
	nominationContent += '#winner_wheel {position: absolute; top: 520px; left: 0px !important;}'; // Winner slideshow div positioning
	nominationContent += '#h1_evolution,#galleriaevolution {position: relative; left: 0px;}';
	nominationContent += '#h1_captainr7,#galleriacaptainr7 {position: relative; left: 320px;top: -334px;}';
	nominationContent += '#h1_onemoose,#galleriaonemoose {position: relative; left: 640px;top: -667px;}';
	nominationContent += '#h1_rockstar,#galleriarockstar {position: relative; left: 960px;top: -1001px;}';
	nominationContent += '#h1_edison,#galleriaedison {position: relative; left: 1280px;top: -1334px;}';

	nominationContent += '</style>';
	nominationContent += '<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.js"></script>';
	nominationContent += '<script type="text/javascript" src="https://system.netsuite.com/c.663271/galleria/galleria-1.2.9.min.js"></script>';

	nominationContent += '</head>';
	nominationContent += '<body>';
	nominationContent += '<!--[if IE]><h2><span style="font-size: 30px; font-style:italic; font-weight: bold; color: red;">Moose do not like Internet Explorer!  Try using a different browser!</span></h1><![endif]-->';
	nominationContent += '<h1 style="text-align: center; font-size: 24px; font-weight: bold; color: ivory; padding-bottom: 5px;">Last Q Moose Nominations</h1>';
	nominationContent += '<div id="galleria">';
	// Nominations
	nominationContent += getMooseNominations(objLastQNominations);
	nominationContent += '</div>';
	// Get Winners content
	var winnersContent = '';
	winnersContent += '<div id="winner_wheel">';
	for (prop in objWinners) {
		var titleText = getWinnerMooseTitles(prop);
		//winnersContent += '<body>';
		winnersContent += '<h1 id="h1_'+prop+'" style="text-align: center; font-size: 24px; font-weight: bold; color: ivory; padding-bottom: 5px;">'+titleText+' Winners</h1>';
		winnersContent += '<div id="galleria'+prop+'">';
		// Send over 3rd param as true to get winners only
		winnersContent += getMooseNominations(objWinners[prop]);
		winnersContent += '</div>';
	}
	winnersContent += '</div>';
	nominationContent += winnersContent;
	nominationContent += '<script type="text/javascript">Galleria.loadTheme("https://system.netsuite.com/c.663271/galleria/themes/classic/galleria.classic.min.js");';
	// create Nominations galleria 
	nominationContent += 'Galleria.run("#galleria",{dataConfig: function(img){return{title: $(img).attr("rel")};}});';
	for (prop in objWinners) {
		nominationContent += 'Galleria.run("#galleria'+prop+'",{dataConfig: function(img){return{title: $(img).attr("rel")};}});';
		//nominationContent += 'Galleria.configure({transition: "fade", width: 200, height: 200, wait: 10000, autoplay: 4000, imageMargin: 20, showInfo: true, transitionSpeed: 1000, _toggleInfo: false});';
	}
	nominationContent += 'Galleria.configure({transition: "fade", width: 320, height: 300, wait: 10000, autoplay: 4000, imageMargin: 5, showInfo: true, transitionSpeed: 1000, _toggleInfo: false});';
	nominationContent += '</script>';
	nominationContent += '</body>';
	/*
	 * ---END HTML CONTENT FOR GALLERIA
	 */
	
	// Store winner/nomination content separately just in case
	objContent.winners = winnersContent;
	objContent.nominations = nominationContent;
	return objContent;
}

// Pass winners as true if you only want the winning nominations
function getMooseNominations(objMooseNominations){
	// Loop through each nomination record and grab property values for slide show
	var mooseContent = '';
	
	for (prop in objMooseNominations) {
		//nlapiLogExecution('debug',prop);
		var objMooseNomination = objMooseNominations[prop];
		
		var toImageUrl = objMooseNomination.toImageUrl;
		var toName = objMooseNomination.toFirst + ' ' + objMooseNomination.toLast;
		var fromName = objMooseNomination.fromFirst + ' ' + objMooseNomination.fromLast;
		var reason = objMooseNomination.reason;
		//nlapiLogExecution('DEBUG','reason '+prop,reason);
		reason = reason.replace(/"/g, "");
		var mooseName = objMooseNomination.mooseName;

		mooseContent += '<img src="' + toImageUrl + '" data-title="' + toName + ': '+mooseName+'" data-description="' + reason + ' - ' + fromName + '" />';
	}
	return mooseContent;
}

function getWinningNominations(objMooseNominations){
	//var objMoose = new Object();
	var objWinners = new Object();
	objWinners.evolution = new Object();
	objWinners.captainr7 = new Object();
	objWinners.onemoose = new Object();
	objWinners.rockstar = new Object();
	objWinners.edison = new Object();
	
	for (prop in objMooseNominations) {
		var objMooseNomination = objMooseNominations[prop];
		if(objMooseNomination.status == 3){
			switch(objMooseNomination.mooseId){
				case '1':
					objWinners.evolution[prop]=objMooseNomination;
					break;
				case '2':
					objWinners.captainr7[prop]=objMooseNomination;
					break;
				case '3':
					objWinners.onemoose[prop]=objMooseNomination;
					break;
				case '4':
					objWinners.edison[prop]=objMooseNomination;
					break;
				case '5':
					objWinners.rockstar[prop]=objMooseNomination;
					break;
			}
		}
	}
	return objWinners;
}

function getLastQNominations(objMooseNominations){
	var objLastQNominations = new Object();
	for (prop in objMooseNominations) {
		var objMooseNomination = objMooseNominations[prop];
		if(objMooseNomination.status == 2){  // Nomiantion is last quarter and status is publish  
		
			objLastQNominations[prop] = objMooseNomination;
		}
	}
	return objLastQNominations;
}

function getWinnerMooseTitles(prop){
	var titleText = '';
	switch(prop){
		case 'evolution':
			titleText = 'Evolution';
			break;
		case 'captainr7':
			titleText = 'Captain R7';
			break;
		case 'onemoose':
			titleText = 'One Moose';
			break;
		case 'rockstar':
			titleText = 'Rockstar';
			break;
		case 'edison':
			titleText = 'The Edison Award';
			break;
	}
	return titleText;	
}

