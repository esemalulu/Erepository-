/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	1.00
 * Date		01 Jul 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 */
function getRockstarContentHTML(){
	// Internet Explorer sucks and won't display appropriately due to quirks mode.  Can't avoid quirks because can't set suitlet !DOCTYPE
	var objRockstars = searchRockstarRecords();
	
	/*
	 *  ---BEGIN HTML CONTENT FOR GALLERIA
	 *  Style for most of the galleria is in Web Site Hosting Files
	 */
	var content = '';
	content += '</body>';
	content += '<head>';
	content += '<!--[if IE]><meta http-equiv="X-UA-Compatible" content="IE=10" /><![endif]-->';
	content += '<link type="text/css" rel="stylesheet" href="https://system.netsuite.com/c.663271/galleria/themes/classic/galleria.classic.css" />';
	content += '<style type="text/css">';
	content += 'body {background: none !important;}';
	content += 'html {background:url(https://system.netsuite.com/c.663271/rockstar/bg.jpg) no-repeat center center fixed;';
	content += '-webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; background-size: cover;}';
	content += '.pt_title, #custpage_error_val, #custpage_pickimage_val {font-weight: bold; color:#b00 }';
	content += '.smallgraytextnolink {font-size: 16px; font-weight: bold !important; color:#b00 !important;}';
	content += '#galleria {width: 450px; height: 450px;}';
	content += '.galleria-info-text {width: 440px; opacity:0.8; filter:alpha(opacity=80);}';
	content += '.galleria-info-description {font-size: .9em; max-width: 420px !important;}';
	content += '</style>';
	content += '<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.js"></script>';
	content += '<script type="text/javascript" src="https://system.netsuite.com/c.663271/galleria/galleria-1.2.9.min.js"></script>';
	content += '</head>';
	content += '<body>';
	content += '<!--[if IE]><h2><span style="font-size: 30px; font-style:italic; font-weight: bold; color: red;">Moose do not like Internet Explorer!  Try using a different browser!</span></h1><![endif]-->';
	content += '<h1 style="text-align: center; font-size: 24px; font-weight: bold; color: #c00; padding-bottom: 5px;">Rapid7 Rockstar Hall of Fame</h1>';
	content += '<div id="galleria">';
	// Get Rockstar Dynamic Content for slideshow
	content += getRockstars(objRockstars);
	content += '</div>';
	content += '<script type="text/javascript">Galleria.loadTheme("https://system.netsuite.com/c.663271/galleria/themes/classic/galleria.classic.min.js");';
	content += 'Galleria.run("#galleria",{dataConfig: function(img){return{title: $(img).attr("rel")};}});';
	content += 'Galleria.configure({transition: "fade", width: 450, height: 450, wait: 10000, autoplay: 4000, imageMargin: 20, showInfo: true, transitionSpeed: 1000, _toggleInfo: false';
	content += '});';
	content += '</script>';
	content += '</body>';
	
	return content;
}

function getRockstars(objRockstars){
	// Loop through each rockstar record and grab property values for slide show
	var rockstarContent = '';
	
	for (prop in objRockstars) {
		var objRockstar = objRockstars[prop];
		
		var toImageUrl = objRockstar.toImage;
		var toName = objRockstar.toFirst + ' ' + objRockstar.toLast;
		var fromName = objRockstar.fromFirst + ' ' + objRockstar.fromLast;
		var comments = objRockstar.comments;
		comments = comments.replace(/"/g, "");

		rockstarContent += '<img src="' + toImageUrl + '" data-title="' + toName + '" data-description="' + comments + ' - ' + fromName + '" />';
	}
	return rockstarContent;
}