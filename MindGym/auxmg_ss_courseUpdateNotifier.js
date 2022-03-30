/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Aug 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) 
{
	var primaryCourseId = nlapiGetContext().getSetting('SCRIPT', 'custscript_courseid');
	var prevCourseId    = nlapiGetContext().getSetting('SCRIPT', 'custscript_prevcourseid');
	
	var sf = [
				new nlobjSearchFilter('isinactive', null, 'is','F'),
				new nlobjSearchFilter('enddate', null, 'onorafter','today'),
				new nlobjSearchFilter('custentity_bo_iseditionrequested', null, 'is','F'),
				new nlobjSearchFilter('custentity_bo_packshippingdate', null, 'isempty',''),
				new nlobjSearchFilter('custentity_bo_course', null, 'anyof', [primaryCourseId, prevCourseId]),
				new nlobjSearchFilter('custentity_bo_owner', null, 'noneof', '@NONE@')
	         ];

	var sc = [
	          	new nlobjSearchColumn('custentity_bo_owner'),
	          	new nlobjSearchColumn('custentity_bo_course'),
	          	new nlobjSearchColumn('entityid')
	         ];
	
	var bookingResultSet = nlapiSearchRecord('job', null, sf, sc);
	
	if(bookingResultSet != null)
	{
		for(var i = 0; i < bookingResultSet.length; i+=1)
		{
			var bookingOwnerId    = bookingResultSet[i].getValue('custentity_bo_owner');
			var bookingOwnerName  = bookingResultSet[i].getText('custentity_bo_owner');
			var bookingOwnerEmail = nlapiLookupField('employee', bookingOwnerId, 'email');
			var courseName        = nlapiLookupField('customrecord_course', primaryCourseId, 'name');
			var bookingName       = bookingResultSet[i].getValue('entityid');
			var bookingOwner      = bookingOwnerName.split(' ');
			var science           = nlapiLookupField('customrecord_course', primaryCourseId, 'custrecord_course_contentchangescience');
			var narrative         = nlapiLookupField('customrecord_course', primaryCourseId, 'custrecord_course_contentchangenarrative');
			var model             = nlapiLookupField('customrecord_course', primaryCourseId, 'custrecord_course_contentchangemodel');
			var changes           = nlapiLookupField('customrecord_course', primaryCourseId, 'custrecord_course_filechanges');
			var portfolioD        = nlapiLookupField('customrecord_course', primaryCourseId, 'custrecord_course_portfoliodesigner', true);
			var portfolioQ        = nlapiLookupField('customrecord_course', primaryCourseId, 'custrecord_course_portfolioqa', true);
			var reason            = nlapiLookupField('customrecord_course', primaryCourseId, 'custrecord_course_reasonforchange');
			var prevEdition       = nlapiLookupField('customrecord_course', prevCourseId,    'custrecord_course_edition');
			var edition           = nlapiLookupField('customrecord_course', primaryCourseId, 'custrecord_course_edition');
			
			log('DEBUG', 'SCIENCE', science);
			log('DEBUG', 'NARRATIVE', narrative);
			log('DEBUG', 'MODEL', model);
			log('DEBUG', 'PORTFOLIO DESIGNER', portfolioD);
			log('DEBUG', 'PORTFOLIO QA', portfolioQ);
			log('DEBUG', 'REASON', reason);
			log('DEBUG', 'PREVIOUS EDITION', prevEdition);
			


			
			var emailSbj = 'Automatic Update of Bookings and Course Editions';
			var emailMsg  = '<b>Hello ' + bookingOwner[0] + ',</b><br>';
				emailMsg += '<br>';
				emailMsg += 'In 24 hours your booking ' + bookingName + ' for ' + courseName + ' will be moved to a new edition. Please see below for level of changes and required actions.<br>';
				emailMsg += '<br>';
				emailMsg += '<b>Instructions for Action</b><br>';
				emailMsg += '<br>';
				emailMsg += 'If your client requires to keep the old edition, please tick the “Specific edition required” box on the booking, and type in the reason for this in the text field. Doing this will automatically notify the publisher who will add your client to the “Approved to run old edition” list.<br>';  
				emailMsg += '<h2>Change Log for ' + courseName + '</h2>';
				emailMsg += '<br>';
				emailMsg += '<b>The edition has changed from ' + prevEdition + ' to ' + edition + '</b><br>';
				emailMsg += '<br>';
				emailMsg += '<b>In summary, the content changes were</b>';
				emailMsg += '<br>';
				emailMsg += '1.	Narrative; ' + narrative + ' change<br>';
				emailMsg += '2.	Science; ' + science + ' change<br>';
				emailMsg += '3.	Model; ' + model + ' change<br>';
				emailMsg += '<br>';
				emailMsg += '<b>In detail, the files changes from previous editions are: </b><br>';
				emailMsg += changes;
				emailMsg += '<br>';
				emailMsg += '<b>FYI - this is how to interpret edition numbers;</b><br>';
				emailMsg += '1.	1.0.0 – a new product (not a pilot) has been published<br>';
				emailMsg += '2.	1.0.1 – a typo or error was spotted in the previous edition and an Emergency CI (ECI) has been actioned<br>';
				emailMsg += '3.	1.1.0 – Continuous Improvement (CI) has been actioned to make moderate amends to the content<br>';
				emailMsg += '4.	2.0.0 – session has been completely rewritten based on for example feedback or our new point of view on the topic<br>';
				emailMsg += '<br>';
				emailMsg += '<b>Reason for change:</b> ' + reason + '<br>';
				emailMsg += '<br>';
				emailMsg += '<b>Portfolio designer:</b> ' + portfolioD + '<br>';
				emailMsg += '<b>Portfolio QA: </b>' + portfolioQ + '<br>';
				emailMsg += '<br>';
				emailMsg += '<b>Please contact us on portfolio@themindgym.com if you have any questions </b>';
				
			nlapiSendEmail(nlapiGetContext().getUser(), bookingOwnerEmail, emailSbj, emailMsg);

					

		}
	}
	
}
