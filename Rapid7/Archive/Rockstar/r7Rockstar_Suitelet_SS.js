/*
 * @author mburstein
 */
function sendGuitarPick(request, response) {
	
	//https://system.netsuite.com/app/site/hosting/scriptlet.nl?script=500&deploy=1
//GET call	

  if(request.getMethod() == 'GET') {
   
    //Create the form
    var form = nlapiCreateForm("Give a Guitar Pick to a R7 Rockstar!", true);
    
	// Add fields
	var fldTo = form.addField('custpage_r7rockstar', 'select', 'R7 Rockstar: ', 'employee');
    var fldComments =  form.addField('custpage_comments', 'textarea', 'Comments: ');
	
	// Display error if comments are less than 30 char
	if((request.getParameter('custparam_comerror')) !== null && (request.getParameter('custparam_comerror')) !==''){
		var comError = request.getParameter('custparam_comerror');
		var fldError = form.addField('custpage_error','text');
		fldError.setDisplayType('inline');
		fldError.setDefaultValue(comError);
		fldError.setLayoutType('outsideabove');
		//  Get previous comment
		var lastComment = request.getParameter('custparam_comments')
		fldComments.setDefaultValue(lastComment);
	}
	
	// Display error if nominating self
	if((request.getParameter('custparam_toerror')) !== null && (request.getParameter('custparam_toerror')) !==''){
		var toError = request.getParameter('custparam_toerror')
		var fldError = form.addField('custpage_error','text');
		fldError.setDisplayType('inline');
		fldError.setDefaultValue(toError);
		fldError.setLayoutType('outsideabove');
		//  Get previous comment
		var lastComment = request.getParameter('custparam_comments')
		fldComments.setDefaultValue(lastComment);
	}
	
	
	var fldFrom = form.addField('custpage_from', 'select', 'From: ', 'employee');
	var fldDepartment = form.addField('custpage_department', 'select', 'Department: ','department');
	var fldPickColor = form.addField('custpage_pickcolor', 'select', 'Pick Color:','customlistr7pickcolor');
	var fldPickImageId = form.addField('custpage_pickimageid','text');
	var fldPickImage = form.addField('custpage_pickimage', 'inlinehtml');
	var fldFlash = form.addField( 'custpage_flash', 'inlinehtml');
	
	// Set layout and display types
	fldFrom.setDisplayType('hidden');
	fldDepartment.setDisplayType('hidden');
	fldPickColor.setDisplayType('hidden');
	fldPickImageId.setDisplayType('hidden');
	//fldPickImage.setDisplayType('hidden');
	fldFlash.setLayoutType('normal');
	
	fldTo.setDisplaySize(100);
	fldComments.setDisplaySize(100);
	fldFrom.setDisplaySize(100);
		
	fldTo.setMandatory(true);
	fldComments.setMandatory(true);
	
	// Get XML content
	var xmlFile = nlapiLoadFile(223689);
	//nlapiLogExecution('DEBUG', 'xmlfile:',xmlFile);
	var xmlString = xmlFile.getValue();
	//nlapiLogExecution('DEBUG', 'xmlString:',xmlString);
	var xml = nlapiStringToXML(xmlString);
	//nlapiLogExecution('DEBUG', 'xml:',xml);
	var node = nlapiSelectNodes(xml, '/images/photo');

	// Content for embedded gallery
	
	
//content +='<!--[if IE 6]><link rel="stylesheet" href="http://mysite.com/path/to/ie6.css" type="text/css" media="screen, projection"><![endif]-->';
//content +='<!--[if IE 7]><link rel="stylesheet" href="http://mysite.com/path/to/ie7.css" type="text/css" media="screen, projection"><![endif]-->';
	var content = '';
	content += '</body>';
	content += '<head>';
	content += '<!--[if IE]><meta http-equiv="X-UA-Compatible" content="IE=edge" /><![endif]-->';
	content += '<link type="text/css" rel="stylesheet" href="https://system.netsuite.com/c.663271/galleria/themes/classic/galleria.classic.css" />';
	content +=	'<style type="text/css">';
	content +=		'body {background: none !important;}';
	content +=		'html {background:url(https://system.netsuite.com/c.663271/rockstar/bg.jpg) no-repeat center center fixed;';
	content +=		'-webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; background-size: cover;}';
	content +=		'.pt_title, #custpage_error_val, #custpage_pickimage_val {font-weight: bold; color:#b00;}';
	content +=		'.smallgraytextnolink {font-size: 16px; font-weight: bold; color:#b00;}';
	content +=		'#galleria {width: 450px; height: 450px;}';
	content +=		'.galleria-info-text {width: 440px; opacity:0.8; filter:alpha(opacity=80);}';
	content +=		'.galleria-info-description {font-size: .9em; max-width: 420px !important;}';
	content +=	'</style>';
	
	// Content for all browsers besides IE
	content +=	'<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.js"></script>';
	content +=  '<script type="text/javascript" src="https://system.netsuite.com/c.663271/galleria/galleria-1.2.9.min.js"></script>';
	content +=	'<!--[if !IE]> -->';
	content +=	'</head>';
	content +=	'<body>';
	content +=		'<h1 style="text-align: center; font-size: 24px; font-weight: bold; color: #c00; padding-bottom: 5px;">Rapid7 Rockstar Hall of Fame</h1>';
	content += 		'<div id="galleria">';
	
	// Loop through xml to get images and captions
	for (var i = 1; i < node.length+1; i++) {
		var xmlPhoto = nlapiSelectValue(xml, '/images/photo['+i+']/@image');
		var xmlTo = nlapiSelectValue(xml, '/images/photo['+i+']/head');
		var xmlFrom = nlapiSelectValue(xml, '/images/photo['+i+']/additional/a');
		var xmlComments = nlapiSelectValue(xml, '/images/photo['+i+']/body');
		xmlComments = xmlComments.replace(/"/g,"");
		content += '<img src="'+xmlPhoto+'" data-title="'+xmlTo+'" data-description="'+xmlComments+' - '+xmlFrom+'" />';
	}
	content +=		'</div>';
	content +=		'<script type="text/javascript">Galleria.loadTheme("https://system.netsuite.com/c.663271/galleria/themes/classic/galleria.classic.min.js");';
	content +=		'Galleria.run("#galleria",{dataConfig: function(img){return{title: $(img).attr("rel")};}});';
	content +=		'Galleria.configure({transition: "fade", width: 450, height: 450, wait: 10000, autoplay: 4000, imageMargin: 20, showInfo: true, transitionSpeed: 1000, _toggleInfo: false';
	content +=		'});';
	content +=		'</script>';
	content +=		'<!--<![endif]-->';
	
	// Content for IE
	content +=	'<!--[if IE]>';
	content +=	'</head>';
	content +=	'<body>';
	content +=	  '<div id="ie_style">';
	content +=		'<h1 style="text-align: center; font-size: 24px; font-weight: bold; color: #c00; padding-bottom: 5px;">Rapid7 Rockstar Hall of Fame</h1>';
	content +=			'<table  width="320px" cellspacing="10">';
	// Loop through xml to get images and captions
	for (var i = 1; i < node.length+1; i++) {
		var xmlPhoto = nlapiSelectValue(xml, '/images/photo['+i+']/@image');
		var xmlTo = nlapiSelectValue(xml, '/images/photo['+i+']/head');
		var xmlFrom = nlapiSelectValue(xml, '/images/photo['+i+']/additional/a');
		var xmlComments = nlapiSelectValue(xml, '/images/photo['+i+']/body');
		content +=	'<tr>';
		content += 		'<td align="center" style="font-size: 12px; font-weight: bold;">'+xmlTo+'<br><img src="'+xmlPhoto+'" width="100px"></td>';
		content += 		'<td style="font-style: italic; font-size: 16px;">'+xmlComments+'<br>- '+xmlFrom+'</td>';
		content +=	'</tr>';
	}
	content +=			'</table>';
	content +=		 '</div>';
	content +=		'<![endif]-->';
	content +=	'</body>';

	
	// Get name and department of current user
	var context = nlapiGetContext();
	var userName = context.getName();
	var userId = context.getUser();
	var departmentId = context.getDepartment();
	//var departmentName = nlapiLookupField('department', departmentId, 'name');
	
	// Search to associate pick info to department
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecordr7guitarpicksdepartment',null,'anyof',departmentId)
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn( 'custrecordr7guitarpicksdepartment');
	columns[1] = new nlobjSearchColumn( 'custrecordcustrecordr7guitarpickspickcol');
	columns[2] = new nlobjSearchColumn( 'custrecordr7guitarpickspickimage');
	
	if(departmentId !=null && departmentId !=''){
		var arrSearchPicks = nlapiSearchRecord('customrecordr7guitarpicks',null,filters,columns);
	
		for (var i in arrSearchPicks){ 
			var searchResult = arrSearchPicks[i];
			var pickColor = searchResult.getValue(columns[1]);
			var pickImage = searchResult.getValue(columns[2]);
			var imageURL = searchResult.getText(columns[2]);
		}
	}
	
	// Set field defaults	
	fldFrom.setDefaultValue(userId);
	var departmentName = nlapiLookupField('department', departmentId, 'name');
	fldDepartment.setDefaultValue(departmentId);
	fldFlash.setDefaultValue(content);
	// Pick fields
	fldPickColor.setDefaultValue(pickColor);
	var imgSource = '<p style="text-align:center;">Your Guitar Pick<br><img src="'+imageURL+'"></p>'
	fldPickImage.setDefaultValue(imgSource);
	fldPickImage.setLayoutType('endrow');
	fldPickImageId.setDefaultValue(pickImage);
	
	
	// Submit form
    form.addSubmitButton('Give a pick!');
	
	//contextTest();
    response.writePage(form);
	
	}
	
//POST call
  if(request.getMethod() == 'POST')
  {
    
	var toId = request.getParameter('custpage_r7rockstar');
	var fromId = request.getParameter('custpage_from');
	var fromDepartment = request.getParameter('custpage_department');
	var rockstarPickColor = request.getParameter('custpage_pickcolor');
	var comments = request.getParameter('custpage_comments');	
	var rockstarPickImg = request.getParameter('custpage_pickimageid');
	
	// Log variables
	//nlapiLogExecution('DEBUG', 'To:',toId);
	//nlapiLogExecution('DEBUG', 'From: ',fromId);
	//nlapiLogExecution('DEBUG', 'Department:',fromDepartment);
	//nlapiLogExecution('DEBUG', 'Comments:',comments);
	
	// Get length of comments string
	var comLength = comments.length;
	
	if (toId != null && toId != '' && toId != fromId && comments != null && comments != '') {
		if (comLength >= 30) {
		
			var recRockstar = nlapiCreateRecord('customrecordr7rockstar');
			
			// Set record values
			recRockstar.setFieldValue('custrecordr7rockstarfrom', fromId);
			recRockstar.setFieldValue('custrecordr7rockstarto', toId);
			recRockstar.setFieldValue('custrecordr7rockstarfromdepartment', fromDepartment);
			recRockstar.setFieldValue('custrecordr7rockstarpickcolor', rockstarPickColor);
			recRockstar.setFieldValue('custrecordr7rockstarcomments', comments);
			recRockstar.setFieldValue('custrecordcustrecordr7rockstarpickimage', rockstarPickImg);
			
			nlapiSubmitRecord(recRockstar);
		
		// Write thank you splash page
		//contextTest();	
		var thanksPage = '<!DOCTYPE html><html style="background:url(https://system.netsuite.com/c.663271/rockstar/bg.jpg) no-repeat center center fixed;-webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; background-size: cover;"><body><h1 style="text-align: center; color:#b00;">Thank you!  Your nomination has been submitted!</h1></body></html';
    	response.write(thanksPage);
		}
		else {
			var arrParams = new Array();
			arrParams['custparam_comments'] = comments;
			arrParams['custparam_comerror'] = "YOUR COMMENT MUST BE AT LEAST 30 CHARACTERS."
			nlapiSetRedirectURL('SUITELET', 'customscriptr7rockstar', 'customdeployr7rockstar', null, arrParams);
		}
	}
	else {
		var arrParams = new Array();
		arrParams['custparam_comments'] = comments;
		arrParams['custparam_toerror'] = "YOU CANNOT NOMINATE YOURSELF."
		nlapiSetRedirectURL('SUITELET', 'customscriptr7rockstar', 'customdeployr7rockstar', null, arrParams);
	}	

	//response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");
 
  }
}

function contextTest(){
	var context = nlapiGetContext();
	for (key in context){
		nlapiLogExecution('DEBUG',key,context[key]);
	}
}
 
