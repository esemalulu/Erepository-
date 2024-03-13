/*
 * @author mburstein
 */

function afterSubmit(){	
	// Search rockstar records
	
	// Check if approved
	var checkApproved = nlapiGetFieldValue('custrecordr7rockstarapproved');
	if (checkApproved !='F') {
	
		var columns = new Array();
		columns[0] = new nlobjSearchColumn('custrecordr7rockstarfrom');
		columns[1] = new nlobjSearchColumn('custrecordr7rockstarto');
		columns[2] = new nlobjSearchColumn('custrecordr7rockstarcomments');
		columns[3] = new nlobjSearchColumn('custrecordr7rockstartoimage');
		columns[4] = new nlobjSearchColumn('custrecordr7rockstarapproved');
		columns[5] = new nlobjSearchColumn('created');
		// Sort by date created
		columns[5].setSort(true);
		
		//columns[6] = new nlobjSearchColumn( 'custrecordr7rockstarpickcolor');
		//columns[7] = new nlobjSearchColumn( 'custrecordr7rockstarfromdepartment');
		//columns[8] = new nlobjSearchColumn( 'custrecordcustrecordr7rockstarpickimage');
		
		var searchResults = nlapiSearchRecord('customrecordr7rockstar', null, null, columns);
		
		var entries = new Array();
		for (var i = 0; searchResults != null && i < 30; i++) {
			var allColumns = searchResults[i].getAllColumns();
			var entry = new Array();
			for (var j = 0; allColumns != null && j < allColumns.length; j++) {
				entry[entry.length] = new Array(searchResults[i].getText(allColumns[j]), searchResults[i].getValue(allColumns[j]));
			}
			entries[entries.length] = entry;
			//nlapiLogExecution('DEBUG', 'entries', entries);
		}
		//nlapiLogExecution('DEBUG','# Results:',searchResults.length);
		//nlapiLogExecution('DEBUG','# Results:',entries.length);
		var xml = obtainFormattedXML(entries);
		var xmlFile = nlapiCreateFile('images2.xml', 'XMLDOC', xml);
		//xmlFile.setFolder(154398);
		//Images (** WARNING PUBLIC FOLDER **) : Administrative Images : Rockstar - DO NOT TOUCH  
		xmlFile.setFolder(431308);
		var fileId = nlapiSubmitFile(xmlFile);
	}
}

function obtainFormattedXML(entries){
	var xml ='';
	xml += '<images>\n'
	for(var i=0;entries!=null && i<entries.length;i++){
		var from = entries[i][0][0];
		var fromId = entries[i][0][1];
		var fromFirst = nlapiLookupField('employee', fromId, 'firstname');
		var fromLast = nlapiLookupField('employee', fromId, 'lastname');
		
		var to = entries[i][1][0];
		var toId = entries[i][1][1];
		var toFirst = nlapiLookupField('employee', toId, 'firstname');
		var toLast = nlapiLookupField('employee', toId, 'lastname');
		
		// Use placeholder if no picture: smileyface.jpg id = 254288
		//toImgUrl = '/core/media/media.nl?id=254288&c=663271&h=14f4b9e38760d222dd29';
		var imgId = 254288;
		smileyUrl = getImgUrl(imgId);
		
		var comments = entries[i][2][1];
		var toImgId = entries[i][3][1];
		var toImgUrl = '';
		if (toImgId != null && toImgId != '') {
			toImgUrl = entries[i][3][0];
		}
		else{
			toImgUrl = smileyUrl;
		}
		var approved = entries[i][4][1];
		//nlapiLogExecution('DEBUG','i=',i);
		//nlapiLogExecution('DEBUG','approved?',approved);

		// Escape Html Entities in Comments
		var escapedComments = escapeHtmlEntities(comments);

		if(approved !='F'){
			nlapiLogExecution('DEBUG', 'from', from);
			nlapiLogExecution('DEBUG', 'to', to);
			nlapiLogExecution('DEBUG', 'comments', comments);
			nlapiLogExecution('DEBUG', 'Img', toImgId);
			
			xml += '\t<photo image="https://system.netsuite.com' + escape(toImgUrl) + '" url="http://www.rapid7.com" target="_blank">\n';
			//xml +=		'\t\t<![CDATA['
			xml += '\t\t<head>' + toFirst + ' ' + toLast + '</head>\n';
			xml += '\t\t<body>' + escapedComments + '</body>\n';
			xml += '\t\t<additional><a href="http://www.rapid7.com">' + fromFirst + ' ' + fromLast + '</a></additional>\n';
			//xml +=		']]>'
			xml += '\t</photo>\n';	
		}
	}
	xml += '</images>'
	return xml;
}

// Get Image Url from File in cabinet
function getImgUrl(imgId){
	var fileImg = nlapiLoadFile(imgId);
	var imageUrl = fileImg.getURL();
	return imageUrl;	
}

/*function copyImg(toImgId){
	var fileToImg = nlapiLoadFile(toImgId);
	var fileImgName = fileToImg.getName();
	var fileImgValue = fileToImg.getValue();
	//var imageURL = fileToImg.getURL();
	var newImgFile = nlapiCreateFile(fileImgName, 'PJPGIMAGE', fileImgValue);
	var imagesFolderId = 169254;
	newImgFile.setFolder(imagesFolderId);
	var imgFileId = nlapiSubmitFile(newImgFile);
	
	return fileImgName;	
}*/

function escapeHtmlEntities(comments) {
	 comments = comments.replace(/\"/g,"&#34;");
	 comments = comments.replace(/\'/g,"&#39;");
	 comments = comments.replace(/\</g,"&#60;");
	 comments = comments.replace(/\>/g,"&#62;");
     comments = comments.replace(/&/g,"&#38;");
     return comments;
}

