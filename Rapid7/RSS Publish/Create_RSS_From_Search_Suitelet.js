/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.0       27 Apr 2013     mburstein
 * 1.1		  5 Jun 2013	 mburstein		   Made feedvalidator.org modifications for J Hennesey.
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function createRSS_FromSearch(request, response){

	if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
	
		// Set contentType to XML
		response.setContentType('XMLDOC');
		
		var responseText = '';
		
		var rssId = request.getParameter('rssid');
		var objValidRSS = getRecRSS(rssId);
		if (objValidRSS.searchId == null || objValidRSS.searchId == '') {
			responseText = '<error>The request is missing a required parameter</error>';
			response.write(responseText);
		}
		else {
		
			var search = nlapiLoadSearch(null, objValidRSS.searchId);
			// Get Search Type and check if public
			var searchType = search.getSearchType();

			var searchResults = nlapiSearchRecord(searchType, objValidRSS.searchId);
			
			// Build the XML from the saved search
			var items_xml = format_items_XML(searchResults);
			if (items_xml != null && items_xml != '') {
				var channel_xml = format_channel_XML(objValidRSS, items_xml);
				if (channel_xml != null && channel_xml != '') {
					var response_xml = format_RSS_XML(channel_xml);
					if (response_xml != null && response_xml != '') {
					
						// Create an RSS file
						/*var fileName = 'Marketing Events RSS.xml';
						var fileType = 'XMLDOC';
						var rssFile = nlapiCreateFile(fileName, fileType, response_xml);
						rssFile.setFolder(655391); //Images (** WARNING PUBLIC FOLDER **) > Administrative Images > RSS Feeds
						var fileId = nlapiSubmitFile(rssFile);
						nlapiLogExecution('DEBUG', 'RSS FileId', fileId);*/
						
						responseText = response_xml;
					}
				}
			}
			
			// if not public than throw error
			else{
				responseText = '<error>That search is not public</error>';
			}
			// Write the response to page
			response.write(responseText);
		}
	}
}


function format_items_XML(searchResults){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	var title = '';
	var link = '';
	var description ='';
	var category = '';
	var image = '';
	var items_xml = '';
	for (var x = 0; searchResults != null && x < searchResults.length; x++) {
		var searchResult = searchResults[x];
		var columns = searchResult.getAllColumns();
		for (var i = 0; columns != null && i < columns.length; i++) {
			var column = columns[i];
			
			// Use getValue/getText based off the label, skip others
			var label = column.getLabel();
			switch (label) {
				case 'rss title':
					title = getValueByType(searchResult, column);
					break;
					
				case 'rss link':
					link = getValueByType(searchResult, column);
					break;
					
				case 'rss description':
					description = getValueByType(searchResult, column);
					break;
					
				case 'rss category':
					category = getValueByType(searchResult, column);
					break;
					
				case 'rss image':
					image = toURL+getValueByType(searchResult, column);
					break;
			}
		}
		
		nlapiLogExecution('DEBUG','item '+x,title +' / '+description+' / '+link+' / '+category);
		// Build XML using column values
		items_xml += '\n\t<item>';
		items_xml += '\n\t\t<title>' + title + '</title>';
		if (link != null && link != '') {
			items_xml += '\n\t\t<link>' + link + '</link>';
		}
		if (link != null && link != '') {
			items_xml += '\n\t\t<guid isPermaLink="true">' + link + '</guid>';
		}
		items_xml += '\n\t\t<description>' + description + '</description>';
		// category is optional
		if (category != null && category != '') {
			items_xml += '\n\t\t<category>' + category + '</category>';
		}
		if (image != null && image != '') {
			items_xml += '\n\t\t<enclosure url="'+image+'" length="100" type="image/png" />';
		}
		items_xml += '\n\t</item>';
	}
	
	return items_xml;
}

/*
 * This function uses the appropriate getValue/getText based off type
 * 		It also encodes html entities using the toolbox function encodeHtmlEntities
 */
function getValueByType(searchResult,column){
	var type = column.getType();
	if(type == 'select' || type == 'image'){
		return encodeHtmlEntities(searchResult.getText(column));
	}
	else{
		return encodeHtmlEntities(searchResult.getValue(column));
	}
}

/*
 *	Build XML for channel, if empty params, then use defaults
 */
function format_channel_XML(objValidRSS,items_xml){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();

	var channelTitle = encodeHtmlEntities(objValidRSS.channelTitle);
	if(channelTitle == null || channelTitle ==''){
		channelTitle = 'Rapid7 RSS';
	}
	
	var channelLink = encodeHtmlEntities(objValidRSS.channelLink);
	if(channelLink == null || channelLink ==''){
		channelLink = 'http://www.rapid7.com';
	}
	
	var channelDescription = encodeHtmlEntities(objValidRSS.channelDescription);
	if(channelDescription == null || channelDescription ==''){
		channelDescription = 'Rapid7 RSS';
	}
	
	var channelImageId = objValidRSS.channelImage;
	if(channelImageId == null || channelImageId ==''){
		channelImageId = 18768; // Images (** WARNING PUBLIC FOLDER **) : Rapid7 and Product Logos : R7_Logo_NS_Small x200
	}
	var fileChannelImage = nlapiLoadFile(channelImageId);
	var channelImageUrl = encodeHtmlEntities(toURL+fileChannelImage.getURL());
	var channelImageTitle = channelTitle; //encodeHtmlEntities('rapid7.com');
	var channelImageLink = channelLink; //encodeHtmlEntities('http://www.rapid7.com');

	var channel_xml = '\n<channel>';
	channel_xml += '\n\t<title>'+channelTitle+'</title>';
	channel_xml += '\n\t<link>'+channelLink+'</link>';
	channel_xml += '<atom:link href="'+channelLink+'" rel="self" type="application/rss+xml" />';
	channel_xml += '\n\t<description>'+channelDescription+'</description>';
	channel_xml += '\n\t<image>';
    channel_xml += '\n\t\t<url>'+channelImageUrl+'</url>';
    channel_xml += '\n\t\t<title>'+channelImageTitle+'</title>';
    channel_xml += '\n\t\t<link>'+channelImageLink+'</link>';
	channel_xml += '\n\t</image>';
	channel_xml += items_xml;
	channel_xml += '\n</channel>';
	return channel_xml;
}

/*
 * @param
 * @returns {String} response_xml The full XML doc that will be written to the page through response object
 */
function format_RSS_XML(channel_xml){
	var response_xml = '<?xml version="1.0" encoding="UTF-8" ?>';
	response_xml += '\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">';
	response_xml += channel_xml;
	response_xml += '\n</rss>';
	return response_xml;
}

/**
 * 	Serach for RSS Valid Searches record with matching rssId and return object with following:
 * 		searchId
 * 		channelTitle
 * 		channelLink
 * 		channelDescription
 */
function getRecRSS(rssId){
	
	var objValidRSS = new Object();
	if (rssId != null && rssId != '') {
	
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('custrecordr7rssvalidsearchesrssid', null, 'is', rssId);
		filters[filters.length] = new nlobjSearchFilter('custrecordr7rssvalidsearchesexpiration', null, 'onorafter', new Date());
		filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		
		var columns = new Array();
		columns[columns.length] = new nlobjSearchColumn('custrecordr7rssvalidsearchesid');
		columns[columns.length] = new nlobjSearchColumn('custrecordr7rssvalidsearcheschanneltitle');
		columns[columns.length] = new nlobjSearchColumn('custrecordr7rssvalidsearcheschannellink');
		columns[columns.length] = new nlobjSearchColumn('custrecordr7rssvalidsearcheschanneldesc');
		columns[columns.length] = new nlobjSearchColumn('custrecordr7rssvalidsearcheschannelimage');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7rssvalidsearches', null, filters, columns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			objValidRSS.searchId = searchResult.getValue(columns[0]);
			objValidRSS.channelTitle = searchResult.getValue(columns[1]);
			objValidRSS.channelLink = searchResult.getValue(columns[2]);
			objValidRSS.channelDescription = searchResult.getValue(columns[3]);
			objValidRSS.channelImage = searchResult.getValue(columns[4]);
		}
	}
	return objValidRSS;
}
