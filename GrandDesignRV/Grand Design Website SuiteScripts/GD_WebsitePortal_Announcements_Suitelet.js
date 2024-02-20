/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.01       16 Oct 2015     Jacob Shetler
 *
 */

/**
 * Gets dealer announcements. Only displays Information announcements.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_Website_DealerAnnouncements_Suitelet(request, response)
{
	var dealerAnnouncements = null;
	
	try
	{
		var filters = [];
		filters[0] = new nlobjSearchFilter('custrecordannouncement_type', null, 'is', '2');
		dealerAnnouncements = nlapiSearchRecord('customrecordrvs_announcements', 'customsearchrvsdealerportalannouncements', filters, null);	
	}
	catch(ex)
	{
		//We only have this try catch to prevent the code from breaking in RVS Old Test where announcement record is not available.
	}
	
	response = GS_Website_DealerAnnouncements_ConvertSearchResultsToWebpage(request, response, dealerAnnouncements, 'There are currently no announcements for this dealer.');
}

/**
 * Gets dealer announcements. Diplays Recall and Service announcements.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_Website_Announcements_RecallsTSB(request, response)
{
	var dealerAnnouncements = null;
	
	try
	{
		var filters = [];
		filters[0] = new nlobjSearchFilter('custrecordannouncement_type', null, 'anyof', ['1', '3']);
		dealerAnnouncements = nlapiSearchRecord('customrecordrvs_announcements', 'customsearchrvsdealerportalannouncements', filters, null);	
	}
	catch(ex)
	{
		//We only have this try catch to prevent the code from breaking in RVS Old Test where announcement record is not available.
	}
	
	response = GS_Website_DealerAnnouncements_ConvertSearchResultsToWebpage(request, response, dealerAnnouncements, 'There are currently no recall or service announcements for this dealer.');
}

/**
 * Converts from search results into a webpage for Grand Design Dealer Announcements.
 * @param request Request parameter from the Suitelet (This gets modified and returned).
 * @param response Response paramter from the Suitelet.
 * @param dealerAnnouncements The search results.
 * @param noResultsMessage If no results are found, the message that will be displayed.
 */
function GS_Website_DealerAnnouncements_ConvertSearchResultsToWebpage(request, response, dealerAnnouncements, noResultsMessage)
{
	var ctx = nlapiGetContext();
	var colors = ctx.getColorPreferences();
	var bgColorStyle = 'background-color:#' +  colors["bodybackground"] + ';color:#' + colors["text"];
	var announcementHeaderColorStyle = 'background-color:#' +  colors["activetab"] + ';color:#' + colors["textontab"];
	
	var table_row = '';
	if(dealerAnnouncements != null && dealerAnnouncements.length > 0)
	{
		var processedAnnouncements = new Array();
		var previousAnnouncementId = -1;
		var count = dealerAnnouncements.length;
		for(var i = 0; i < count; i++)
		{
			var currentAnnouncement = dealerAnnouncements[i];
			var announcementId = currentAnnouncement.getId();
			var startNewAnnouncement = false; //we use this to set breaktype/padding for when processing new announcement.

			//If we have processed at least one announcement, check if the previous announcement is different or not.
			//If it is different, then we know we are processing another announcement, so set brektype accordingly.
			if(i > 0) 
			{
				previousAnnouncementId = dealerAnnouncements[i - 1];
				if(previousAnnouncementId != announcementId)
				{
					startNewAnnouncement = true;
				}
			}
			
			//File Inportletation
			var fileInternalId = currentAnnouncement.getValue('internalid', 'file');
			var fileURL = '';
			var fileName = '';
			if(fileInternalId != null && fileInternalId != '')
			{
				fileURL = currentAnnouncement.getValue('url', 'file');
				fileName = currentAnnouncement.getValue('name', 'file');
			}
				
			//Process unique announcements. 
			//Note: Our saved search joins to the Files attached to announcement, 
			//      so dealerAnnouncements could have the same announcement more than once.
			if(!hasAnnouncementBeenProcessed(processedAnnouncements, announcementId))
			{
				var announcementTitle = currentAnnouncement.getValue('custrecordannouncement_title');
				var announcementMsg = currentAnnouncement.getValue('custrecordannouncement_message');
				var announcementType = currentAnnouncement.getText('custrecordannouncement_type');
				if(announcementType == null)
					announcementType = '';

				var announcemenLineTitle = announcementTitle;
				if(announcementType != '')
					announcemenLineTitle += ' - ' + announcementType;
				
				table_row += '<tr><td style="padding-left:10px;padding-bottom:5px;padding-top:5px; width:100%;' + announcementHeaderColorStyle + ';"><b>' + announcemenLineTitle + '</b></td></tr>';

		        //We have no attachment and we are processing new announcement set paddings and breaktype
		        if(fileName == '' && startNewAnnouncement)
	        	{
		        	table_row += '<tr><td><div style="padding-left:10px;padding-bottom:20px;">' + announcementMsg + '</div></td></tr>';
	        	}
		        else
	        	{
		        	table_row += '<tr><td><div style="padding-left:10px;padding-bottom:3px;">' + announcementMsg + '</div></td></tr>';
	        	}
		        	
		        if(fileName != '') //We have file attached to this announcement, set 'Files' section.
	        	{
		        	table_row += '<tr><td><div style="padding-left:10px;padding-top:10px;"><b>Files:</b></div></td></tr>';		        	
	        	}
		        
		        
		        processedAnnouncements[processedAnnouncements.length] = announcementId;
			}
			
			//Now add files links. We want to add all files for the announcement.
			if(fileName != '')
			{
				var websiteDomain = nlapiGetContext().getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
				
				var fileLink = "<a target='_blank' href='" + websiteDomain + fileURL + "' style='color:'" + colors['link'] + ">" + fileName + "</a>";					
		        
		        if(startNewAnnouncement)
	        	{
		        	table_row += '<tr><td><div style="padding-left:15px;padding-bottom:20px;">' + fileLink + '</div></td></tr>';
	        	}
		        else
	        	{
		        	table_row += '<tr><td><div style="padding-left:15px;padding-bottom:3px;">' + fileLink + '</div></td></tr>';
	        	}
		        	
		        
			}
			
		}

	}
	else
	{
		table_row += '<tr><td>' + noResultsMessage + '</td></tr>';
	}
	
	
	
	var content = '<table cellpadding="0" cellspacing="3" border="0" width="100%" style="font-family:Arial, Verdana, sans-serif; font-size:14px;' + bgColorStyle + ';">' + table_row + '</table>';

	response.write(content); 
	response.setHeader('Custom-Header-Announcement', 'Dealer Announcements');
	return response;
}

/**
 * Check whether or not the specified announcementId is already in processedAnnouncementArray.
 * @param processedAnnouncementArray
 * @param announcementId
 * @returns {Boolean}
 */
function hasAnnouncementBeenProcessed(processedAnnouncementArray, announcementId)
{
	var _hasBeenProcessed = false;
	if(processedAnnouncementArray != null && processedAnnouncementArray.length > 0)
	{
		for(var i = 0; i < processedAnnouncementArray.length; i++)
		{
			if(processedAnnouncementArray[i] == announcementId)
			{
				_hasBeenProcessed = true;
				break;
			}
		}
	}
	
	return _hasBeenProcessed;
}
