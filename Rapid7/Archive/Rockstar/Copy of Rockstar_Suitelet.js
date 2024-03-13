/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	2.00
 * Date		01 Jul 2013
 * 
 * Version 	2.10
 * Date		04 Mar 2014
 * 
 * MB: 3/4/2014 - Updates for version 2.10.  The architecture for pick color has changed slightly.  A new field for pick color was added to the department record: custrecordr7departmentguitarpickcolor
 * 		Pick color can now be accessed using nlapiLookupField on the department record
 * 		Also, adding stamp of To: Department Guitar Pick Color (custrecordr7rockstartodepartmentcolor).  This field is used for searching x-department nominations.
 * 
 * This is a duplicate of Rockstar Suitelet used for testing changes in an isolated environment
 * 
 * @record R7 Rockstar (customrecordr7rockstar)
 * @script https://system.netsuite.com/app/common/scripting/script.nl?id=500
 * @scriptlink <a href="https://system.netsuite.com/app/site/hosting/scriptlet.nl?script=500&deploy=1">https://system.netsuite.com/app/site/hosting/scriptlet.nl?script=500&deploy=1</a>      
 * @method sendGuitarPick
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function sendGuitarPick(request, response) {

	if (request.getMethod() == 'GET') {
	
		//Create the form
	        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		var form = nlapiCreateForm("Give a Guitar Pick to a R7 Rockstar!", true);
		form.setScript('customscriptr7_rockstar_suitelet_cs');
		
		// Add fields
		var fldTo = form.addField('custpage_to', 'select', 'R7 Rockstar: ', 'employee');
		var fldComments = form.addField('custpage_comments', 'textarea', 'Comments: ');
		var fldFrom = form.addField('custpage_from', 'select', 'From: ', 'employee');
		var fldDepartment = form.addField('custpage_department', 'select', 'Department: ', 'department');
		var fldPickColor = form.addField('custpage_pickcolor', 'select', 'Pick Color:', 'customlistr7pickcolor');
		var fldPickImageId = form.addField('custpage_pickimageid', 'text');
		var fldPickImage = form.addField('custpage_pickimage', 'inlinehtml');
		var fldContentHTML = form.addField('custpage_contenthtml', 'inlinehtml');
		
		// MB: 11/29/13 - Remove thanksgiving pick
		form.addButton('custpage_thanksgivingpick','Give Thanks!','giveThanksgivingPick()');
		
		// Display error if reason is less than 30 char or User nominated self or dup submission
		var objError = new Object();
		objError.reason = request.getParameter('custparam_commentserror');
		objError.to = request.getParameter('custparam_toerror');
		objError.duplicate = request.getParameter('custparam_isduplicate');
		if ((objError.reason != null && objError.reason != '') || (objError.to != null && objError.to != '') || (objError.duplicate != null && objError.duplicate != '')) {
			// Display error
			var fldError = form.addField('custpage_error', 'text');
			fldError.setDisplayType('inline');
			fldError.setLayoutType('outsideabove');
			
			// Concatenate the errors and set default text
			var errorText = '';
			for (errorType in objError) 
				if (objError[errorType] != null) {
					errorText += '   \n' + objError[errorType];
				}
			fldError.setDefaultValue(errorText);
			
			//  Get previously submitted fields and set default values
			var previousTo = request.getParameter('custpage_to');
			fldTo.setDefaultValue(previousTo);
			var previousFrom = request.getParameter('custpage_from');
			fldFrom.setDefaultValue(previousFrom);
			var previousComments = request.getParameter('custpage_comments');
			fldComments.setDefaultValue(previousComments);
		}
		// Get HTML Content
		var content = getRockstarContentHTML();	
		// Set layout and display types
		fldFrom.setDisplayType('hidden');
		fldDepartment.setDisplayType('hidden');
		fldPickColor.setDisplayType('hidden');
		fldPickImageId.setDisplayType('hidden');
		//fldPickImage.setDisplayType('hidden');
		fldContentHTML.setLayoutType('normal');
				
		fldTo.setDisplaySize(100);
		fldComments.setDisplaySize(100);
		fldFrom.setDisplaySize(100);
		
		fldTo.setMandatory(true);
		fldComments.setMandatory(true);
		// Get User's department pick info
		var objDepartmentPick = getDepartmentPick();
		
		// Set field defaults	
		fldFrom.setDefaultValue(objDepartmentPick.userId);
		fldDepartment.setDefaultValue(objDepartmentPick.departmentId);
		fldContentHTML.setDefaultValue(content);
		// Pick fields
		fldPickColor.setDefaultValue(objDepartmentPick.pickColor);
		var imgSource = '<p style="text-align:center;">Your Guitar Pick<br><img src="' + objDepartmentPick.imageURL + '"></p>';
		fldPickImage.setDefaultValue(imgSource);
		fldPickImage.setLayoutType('endrow');
		fldPickImageId.setDefaultValue(objDepartmentPick.pickImage);

		// Submit form
		form.addSubmitButton('Give a pick!');

		response.writePage(form);
	}

  	if (request.getMethod() == 'POST') {
		var objRockstarSubmission = {
			toId: request.getParameter('custpage_to'),
			fromId: request.getParameter('custpage_from'),
			fromDepartment: request.getParameter('custpage_department'),
			rockstarPickColor: request.getParameter('custpage_pickcolor'),
			comments: request.getParameter('custpage_comments'),
			rockstarPickImg: request.getParameter('custpage_pickimageid'),
		};
		
		// Get length of comments string
		var comLength = objRockstarSubmission.comments.length;
		
		// Initialize Error param array
		var arrParams = new Array();
		var nominatedSelf = false;
		var reasonTooShort = false;
		
		// Check to make sure user doesn't nominated self
		if (objRockstarSubmission.toId == objRockstarSubmission.fromId) {
			arrParams['custparam_toerror'] = "YOU CANNOT NOMINATE YOURSELF.";
			nominatedSelf = true;
		}
		
		// Check to make sure comment is greater than 30 char
		if (comLength < 30) {
			arrParams['custparam_commentserror'] = "YOUR REASON MUST BE AT LEAST 50 CHARACTERS.";
			reasonTooShort = true;
		}
		
		// Check to make sure the user isn't double submitting
		var isDuplicate = isDuplicateSubmission(objRockstarSubmission);
		if (isDuplicate) {
			arrParams['custparam_isduplicate'] = "YOU CANNOT SUBMIT THE SAME NOMINATION TWICE.";
		}
		
		// If no Errors create new Rockstar Nomination
		if (!nominatedSelf && !reasonTooShort && !isDuplicate) {
		
			var recRockstar = nlapiCreateRecord('customrecordr7rockstar');
			
			// Set record values
			recRockstar.setFieldValue('custrecordr7rockstarfrom', objRockstarSubmission.fromId);
			recRockstar.setFieldValue('custrecordr7rockstarto', objRockstarSubmission.toId);
			recRockstar.setFieldValue('custrecordr7rockstarfromdepartment', objRockstarSubmission.fromDepartment);
			recRockstar.setFieldValue('custrecordr7rockstarpickcolor', objRockstarSubmission.rockstarPickColor);
			recRockstar.setFieldValue('custrecordr7rockstarcomments', objRockstarSubmission.comments);
			recRockstar.setFieldValue('custrecordcustrecordr7rockstarpickimage', objRockstarSubmission.rockstarPickImg);
			
			// Get To Department Pick Color
			var toDepartmentId = nlapiLookupField('employee',objRockstarSubmission.toId,'department');
			var toDepartmentPickId = nlapiLookupField('department',toDepartmentId,'custrecordr7departmentguitarpickcolor');
			nlapiLogExecution('DEBUG','todepid',toDepartmentId);
			nlapiLogExecution('DEBUG', 'toDepartmentPickId',toDepartmentPickId);
			if (toDepartmentPickId != null) {
				var departmentPickColor = nlapiLookupField('customrecordr7guitarpicks', toDepartmentPickId, 'custrecordcustrecordr7guitarpickspickcol');
				nlapiLogExecution('DEBUG','departmentPickColor',departmentPickColor);
				recRockstar.setFieldValue('custrecordr7rockstartodepartmentcolor', departmentPickColor);
			}	
			
			nlapiSubmitRecord(recRockstar);
			
			// Write thank you splash page	
			var thanksPage = '<!DOCTYPE html><html style="background:url('+toURL+'/c.663271/rockstar/bg.jpg) no-repeat center center fixed;-webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; background-size: cover;"><body><h1 style="text-align: center; color:#b00;">Thank you!  Your nomination has been submitted!</h1></body></html';
			response.write(thanksPage);
		}
		
		else {
			arrParams['custpage_to'] = objRockstarSubmission.toId;
			arrParams['custpage_from'] = objRockstarSubmission.fromId;
			arrParams['custpage_comments'] = objRockstarSubmission.comments;
			nlapiSetRedirectURL('SUITELET', 'customscriptr7rockstar', 'customdeployr7rockstar', null, arrParams);
		}
	}
}

function getDepartmentPick(){
	var objDepartmentPick = new Object();
	// Get name and department of current user
	var context = nlapiGetContext();
	objDepartmentPick.userId = context.getUser();
	objDepartmentPick.departmentId = context.getDepartment();
	
	// MB: 3/4/2014 - Update to department record lookup for pick color - new field on department record: custrecordr7departmentguitarpickcolor
	var departmentPickId = nlapiLookupField('department',objDepartmentPick.departmentId,'custrecordr7departmentguitarpickcolor');
	if (departmentPickId != null) {
		var recPick = nlapiLoadRecord('customrecordr7guitarpicks', departmentPickId);
		var pickImageId = recPick.getFieldValue('custrecordr7guitarpickspickimage');
		objDepartmentPick.pickColor = recPick.getFieldValue('custrecordcustrecordr7guitarpickspickcol');
		objDepartmentPick.pickImage = pickImageId;
		if (pickImageId != null) {		
			var filePickImage = nlapiLoadFile(pickImageId);
			objDepartmentPick.imageURL = filePickImage.getURL();
		}
		else{
			objDepartmentPick.imageURL = '';
		}	
	}
	// If the department doesn't have a pick record then blank values;
	else {
		objDepartmentPick.pickColor = '';
		objDepartmentPick.pickImage = '';
		objDepartmentPick.imageURL = '';
	}
	
	return objDepartmentPick;
}

