/**
 * Export jobs
 *
 * @param {Object} request
 * @param {Object} response
 */
function exportJobs(request, response)
{
  request = request; // Make the request object global
  
  // Validate from date
  fromDate = request.getParameter('from_date');
  nlapiLogExecution('DEBUG', 'Var', 'fromDate=' + fromDate);
  
  // Validate to date
  toDate = request.getParameter('to_date');
  nlapiLogExecution('DEBUG', 'Var', 'toDate=' + toDate);
  
  // Validate subsidiary
  subsidiary = request.getParameter('subsidiary');
  nlapiLogExecution('DEBUG', 'Var', 'subsidiary=' + subsidiary);
  if ((subsidiary == null) || (subsidiary.length < 1)) {
    subsidiary = null;
  }

// Validate country
  country = request.getParameter('country');
 nlapiLogExecution('DEBUG', 'Var', 'country=' + country );
  if ((country == null) || (country.length < 1)) {
    country = null;
  }
  
  /**
   * 4/24/2014
   * Validate Training program
   */
  //trainingprogramme
  trainprog = request.getParameter('trainingprogramme');
  nlapiLogExecution('DEBUG', 'Var', 'trainingprogramme=' + trainprog );
   if ((trainprog == null) || (trainprog.length < 1)) {
	   trainprog = null;
   }
  

try{
var fileName = 'FulfillPack_' + nlapiDateToString(new Date()).replace(/\//g,'_');
var exportType =  request.getParameter('type');
if(exportType.indexOf('CSV') != -1)
{
var content = buildCSVData(fromDate, toDate, subsidiary, country,trainprog);
fileName += '.csv'; 
var file = nlapiCreateFile(fileName, 'CSV', content);
response.setContentType(file.getType(), fileName);
response.write(file.getValue()); 
}

if(exportType.indexOf('PDF') != -1)
{
   var content = generateXMLTable(fromDate, toDate, subsidiary, country,trainprog);
   var xml= '';
   var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
   xml += "<pdf>";
   xml += "<body font-size=\"8\" width=\"970\">";
   xml += content;
   xml += "</body></pdf>";
   var file = nlapiXMLToPDF( xml );

   // set content type, file name
   fileName += '.pdf'; 
   response.setContentType(file.getType(), fileName );
   response.write( file.getValue());   
}

}catch(e)
{
nlapiLogExecution('DEBUG', 'Exception', e.toString());
}
}

function buildCSVData(fromDate, toDate, subsidiary, country,trainprog)
{
  var  SCRIPT_MODE = 'pack';
  var data = '';
  var jobs = new Array();
  var filters = new Array();
  
  // From date
  if (fromDate && fromDate != null) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', fromDate));
  }
  
  // To date
  if (toDate && toDate != null) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorbefore', toDate));
  }

  if (subsidiary != null) {
    filters.push(new nlobjSearchFilter('subsidiary', null, 'is', subsidiary));
  }

 if (country != null) {
    filters.push(new nlobjSearchFilter('custentity_bo_eventcountry', null, 'is', country));
  }
 
 //trainprog
 if (trainprog) {
	   filters.push(new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', trainprog));
 }

  jobs = nlapiSearchRecord('job', 'customsearch_script_job_pending_' + SCRIPT_MODE, filters ? filters : null);
 var i = 0, n = 0;
if(jobs)
n = jobs.length;
var row = new Array();
 row[0] = 'Job #';
 row[1] = 'Date';
 row[2] = 'In Days';
 row[3] = 'Is Published';
 row[4] = 'Is Litho';
 row[5] = 'Coach';
 row[6] = 'Client';
 row[7] = 'Course';
 row[8] = 'Ship To';
 row[9] = 'Ship Address';
 row[10] = 'Course Venue';
 row[11] = 'Owner';
 row[12] = 'Comments';
 row[13] = 'Booking Status';
 data += row + '\n';

  for (;i < n; i++) {
    
    row[0] = jobs[i].getValue('entityid');
    row[1] = jobs[i].getValue('enddate');
    // days remaining
    var endDate = nlapiStringToDate(jobs[i].getValue('enddate'));
    var today = new Date();
    var oneDay = 1000 * 60 * 60 * 24;
    var daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / oneDay);
    daysRemaining = daysRemaining > 0 ? daysRemaining - 1 : 0;
    row[2] = daysRemaining; 
    
    //8/24/2014 - Request to add Two additional columns from saved search:
	//Course Records' Is Published custrecord_course_ispublished (CUSTENTITY_BO_COURSE)
	//subList.addField('custrecord_course_ispublished','text','Is Published');
	var isPubVal ='No';
	if (jobs[i].getValue('custrecord_course_ispublished','CUSTENTITY_BO_COURSE')=='T') {
	   isPubVal = 'Yes';
	}
	row[3] = isPubVal;
	   
	//Course Records' Is Litho custrecord_course_islitho (CUSTENTITY_BO_COURSE)
	//subList.addField('custrecord_course_islitho', 'text', 'Is Litho'); 
	var isLithoVal ='No';
	if (jobs[i].getValue('custrecord_course_islitho','CUSTENTITY_BO_COURSE')=='T') {
		isLithoVal = 'Yes';
	}
	row[4] = isLithoVal;
    
    row[5] = '\"'+jobs[i].getText('custentity_bo_coach')+'\"';
    row[6] = '\"'+jobs[i].getText('customer')+'\"';
    row[7] = '\"'+jobs[i].getText('custentity_bo_course')+'\"';

	/** 4/24/2014 change **/
	var packShipToId = jobs[i].getValue('custentity_bo_pack_shipto');
	var packShipToText = jobs[i].getText('custentity_bo_pack_shipto');
	row[8] = packShipToText;
	
	//row[8] =jobs[i].getText('custentity_bo_pack_shipto');

   if (SCRIPT_MODE == 'pack') {
	   /**
	    * 4/24/2014 - Fulfillment Modification. Get Ship To Shipping Address from Booking Record
	    */
	   
	   var packShipToAddress = jobs[i].getValue('custentity_bo_shippingaddress');
	   //if ship to is Other set address as comments
	   //8/24/2014 - Instead of using Comments, use Pack Comments (custentity_bo_packcomments)
	   if (packShipToId == '4') {
		   //packShipToAddress = jobs[i].getValue('comments');
		   packShipToAddress = jobs[i].getValue('custentity_bo_packcomments');
	   }
		row[9] = '\"'+packShipToAddress+'\"';
	    //Course Venue
	    var courseVenue = '';
	    var eventCity = jobs[i].getValue('custentity_bo_eventcity');
	    if(eventCity || eventCity !=''){
	      courseVenue = courseVenue + eventCity+', ';
	    }
	    courseVenue = courseVenue +  jobs[i].getText('custentity_bo_eventcountry');
	    row[10] = '\"'+courseVenue+'\"';
	    row[11] = '\"'+jobs[i].getText('custentity_bo_owner')+'\"';
	    row[12] = '\"'+jobs[i].getValue('formulatext')+'\"';   
	   }
	   
	var bookingStatus = jobs[i].getText('entitystatus');	   
	row[13] = bookingStatus;	   
	   
	    data += row + '\n';   
		   
	    /**** Old Method ****/
		   /**   
   // Ship To
   var packShipTo = jobs[i].getText('custentity_bo_pack_shipto');
       
   // Shipping Address
    var shipAddress = '';
    var recordId = '';
    var recordType = '';
    var shipAddressFlag = false;
    switch(packShipTo){ 
    case 'Coach address':
       recordId= jobs[i].getValue('custentity_bo_coach');
       recordType = 'vendor';
       break;
     case 'Client address':
       recordId= jobs[i].getValue('custentity_bo_buyer');
       recordType = 'contact';
       break;
     case 'Delivery address':
        var eventAddress1 = jobs[i].getValue('custentity_bo_eventaddress1');
        if(eventAddress1 && eventAddress1 !=''){
            shipAddress = shipAddress +eventAddress1+', ';    
        }
        var eventAddress2 = jobs[i].getValue('custentity_bo_eventaddress2');
        if(eventAddress2 && eventAddress2 !=''){
            shipAddress = shipAddress +eventAddress2+', ';   
        }
       var eventCity = jobs[i].getValue('custentity_bo_eventcity');
        if(eventCity && eventCity !=''){
            shipAddress = shipAddress +eventCity+', ';  
        }
       var eventPostCode = jobs[i].getValue('custentity_bo_eventpostcode');
        if(eventPostCode && eventPostCode !=''){
            shipAddress = shipAddress +eventPostCode+', ';  
        }
       var eventState = jobs[i].getText('custentity_bo_eventstate');
        if(eventState && eventState !=''){
            shipAddress = shipAddress +eventState+', ';  
        }
       var eventCountry = jobs[i].getText('custentity_bo_eventcountry');
        if(eventCountry && eventCountry !=''){
            shipAddress = shipAddress +eventCountry;  
        }
       break;
    }
    if(recordId != '' && recordType != '' && shipAddress  ==''){
        var record = nlapiLoadRecord(recordType,recordId);
        var lineCount = record.getLineItemCount('addressbook');
        for(var j=1;j<=lineCount;j++){
          var defaultShipping = record.getLineItemValue('addressbook','defaultshipping',j);
          if(defaultShipping == 'T'){
          shipAddress  = record.getLineItemValue('addressbook','addrtext',j);
          shipAddressFlag = true;
          break;
          }
        }
        if((!shipAddressFlag) && (lineCount)){
          shipAddress  = record.getLineItemValue('addressbook','addrtext',1);
        }
        shipAddress  = shipAddress.replace(/\n/g,',');
    }
    row[7] = '\"'+shipAddress+'\"';
    //Course Venue
    var courseVenue = '';
    var eventCity = jobs[i].getValue('custentity_bo_eventcity');
    if(eventCity || eventCity !=''){
      courseVenue = courseVenue + eventCity+', ';
    }
    courseVenue = courseVenue +  jobs[i].getText('custentity_bo_eventcountry');
    row[8] = '\"'+courseVenue+'\"';
    row[9] = '\"'+jobs[i].getText('custentity_bo_owner')+'\"';
    row[10] = '\"'+jobs[i].getValue('formulatext')+'\"';
    
    }
    data += row + '\n';
    **/
   }
return data;
}

function generateXMLTable(fromDate, toDate, subsidiary, country,trainprog)
{
var  SCRIPT_MODE = 'pack';
  var jobs = new Array();
  var filters = new Array();
 
  
  // From date
  if (fromDate && fromDate != null) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', fromDate));
  }
  
  // To date
  if (toDate && toDate != null) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorbefore', toDate));
  }
  nlapiLogExecution('DEBUG', 'Subsidiary', 'To form filter: ' +subsidiary);

  if (subsidiary != null) {
    filters.push(new nlobjSearchFilter('subsidiary', null, 'is', subsidiary));
  }
  
//trainprog
  if (trainprog) {
 	   filters.push(new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', trainprog));
  }

if (SCRIPT_MODE == 'pack') {
 if (country != null) {
    filters.push(new nlobjSearchFilter('custentity_bo_eventcountry', null, 'is', country));
  }
}  
  jobs = nlapiSearchRecord('job', 'customsearch_script_job_pending_' + SCRIPT_MODE, filters ? filters : null);
 var i = 0, n = 0;
if(jobs)
 n = jobs.length;
var row = new Array();

//create a table to present the line items
	var strName = "<table width=\"900\">";
	strName += "<tr>";
	strName += "<td width=\"5\%\"><b>Job #</b></td>";
	strName += "<td width=\"5\%\"><b> Date </b></td>";
	strName += "<td width=\"5\%\" style=\"white-space: nowrap\"><b>In Days</b></td>";
	strName += "<td width=\"10\%\" style=\"white-space: nowrap\"><b>Is Published</b></td>";
	strName += "<td width=\"10\%\" style=\"white-space: nowrap\"><b>Is Litho</b></td>";
	strName += "<td width=\"10\%\"><b>Coach </b></td>";
	strName += "<td width=\"10\%\" ><b>Client </b></td>";
	strName += "<td width=\"15\%\"><b> Course </b></td>";
	strName += "<td width=\"10\%\"><b> Ship To</b></td>";
	strName += "<td width=\"20\%\"><b> Ship Address</b></td>";
	strName += "<td width=\"10\%\"><b> Course Venue </b></td>";
	strName += "<td width=\"5\%\"><b> Owner</b></td>";
	strName += "<td width=\"5\%\"><b> Comments </b></td>";
	strName += "</tr>";

  for (;i < n; i++) {
    strName += "<tr><td>";
    strName += nlapiEscapeXML(jobs[i].getValue('entityid'));
    strName += "</td>";
    strName += "<td>";
    strName +=  nlapiEscapeXML(jobs[i].getValue('enddate'));
    strName += "</td>";
    // days remaining
    var endDate = nlapiStringToDate(jobs[i].getValue('enddate'));
    var today = new Date();
    var oneDay = 1000 * 60 * 60 * 24;
    var daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / oneDay);
    daysRemaining = daysRemaining > 0 ? daysRemaining - 1 : 0;
    strName += "<td>";
    strName +=  nlapiEscapeXML(daysRemaining);
    strName += "</td>";
    
    //8/24/2014 - Request to add Two additional columns from saved search:
	//Course Records' Is Published custrecord_course_ispublished (CUSTENTITY_BO_COURSE)
	//subList.addField('custrecord_course_ispublished','text','Is Published');
	var isPubVal ='No';
	if (jobs[i].getValue('custrecord_course_ispublished','CUSTENTITY_BO_COURSE')=='T') {
		isPubVal = 'Yes';
	}
	strName += "<td>"+isPubVal+"</td>";
	   
	//Course Records' Is Litho custrecord_course_islitho (CUSTENTITY_BO_COURSE)
	//subList.addField('custrecord_course_islitho', 'text', 'Is Litho'); 
	var isLithoVal ='No';
	if (jobs[i].getValue('custrecord_course_islitho','CUSTENTITY_BO_COURSE')=='T') {
		isLithoVal = 'Yes';
	}
	strName += "<td>"+isLithoVal+"</td>";
    
	var coachEsc =  jobs[i].getText('custentity_bo_coach').replace(/'/g, ' ');
	if(coachEsc.indexOf('Aoife')!= -1)
	coachEsc = 'Aoife';
    strName += "<td>";
    strName +=  nlapiEscapeXML(jobs[i].getText('custentity_bo_coach'));
    strName += "</td>";
    strName += "<td>";
    strName +=  nlapiEscapeXML(jobs[i].getText('customer'));
    strName += "</td>";
    strName += "<td>";
    strName +=  nlapiEscapeXML(jobs[i].getText('custentity_bo_course'));
    strName += "</td>";
    strName += "<td>";
    
    /** 4/24/2014 change **/
    var packShipToId = jobs[i].getValue('custentity_bo_pack_shipto');
    var packShipToText = jobs[i].getText('custentity_bo_pack_shipto');
    strName +=  nlapiEscapeXML(packShipToText);
    strName += "</td>";
    //strName +=  nlapiEscapeXML(jobs[i].getText('custentity_bo_pack_shipto'));
    //strName += "</td>";

   if (SCRIPT_MODE == 'pack') {
	   /**
	    * 4/24/2014 - Fulfillment Modification. Get Ship To Shipping Address from Booking Record
	    */
	   
	   var packShipToAddress = jobs[i].getValue('custentity_bo_shippingaddress');
	   nlapiLogExecution('debug','addr',packShipToAddress);

		var xmlValidAddress = '';
		if (packShipToAddress) {
			var arad = packShipToAddress.split('\n');
			for (var a=0; arad && a < arad.length; a++) {
				if (arad[a]) {
					xmlValidAddress+=nlapiEscapeXML(arad[a])+'<br/>';
				}
			}
		}
		var packShipToId = jobs[i].getValue('custentity_bo_pack_shipto');
		//if ship to is Other set address as comments
		//8/24/2014 - Instead of using Comments, use Pack Comments (custentity_bo_packcomments)
		if (packShipToId == '4') {
			//packShipToAddress = jobs[i].getValue('comments');
			xmlValidAddress = nlapiEscapeXML(jobs[i].getValue('custentity_bo_packcomments'));
		}
		
		
	    strName += "<td>";
	    strName +=  xmlValidAddress;
	    strName += "</td>";
	    //Course Venue
	    var courseVenue = '';
	    var eventCity = jobs[i].getValue('custentity_bo_eventcity');
	    if(eventCity || eventCity !=''){
	      courseVenue = courseVenue + eventCity+', ';
	    }
	    courseVenue = courseVenue +  jobs[i].getText('custentity_bo_eventcountry');
	    strName += "<td>";
	    strName +=  nlapiEscapeXML(courseVenue);
	    strName += "</td>";
	    strName += "<td>";
	    strName +=  nlapiEscapeXML(jobs[i].getText('custentity_bo_owner'));
	    strName += "</td>";
	    strName += "<td>";
	    strName +=  nlapiEscapeXML(jobs[i].getValue('formulatext'));
	    strName += "</td>";
	    }
	   strName += "</tr>";
	   }
	   strName += "</table>";
	    
/**   
	   // Ship To
   var packShipTo = jobs[i].getText('custentity_bo_pack_shipto');
       
   // Shipping Address
    var shipAddress = '';
    var recordId = '';
    var recordType = '';
    var shipAddressFlag = false;
    switch(packShipTo){ 
    case 'Coach address':
       recordId= jobs[i].getValue('custentity_bo_coach');
       recordType = 'vendor';
       break;
     case 'Client address':
       recordId= jobs[i].getValue('custentity_bo_buyer');
       recordType = 'contact';
       break;
     case 'Delivery address':
        var eventAddress1 = jobs[i].getValue('custentity_bo_eventaddress1');
        if(eventAddress1 && eventAddress1 !=''){
            shipAddress = shipAddress +eventAddress1+', ';    
        }
        var eventAddress2 = jobs[i].getValue('custentity_bo_eventaddress2');
        if(eventAddress2 && eventAddress2 !=''){
            shipAddress = shipAddress +eventAddress2+', ';   
        }
       var eventCity = jobs[i].getValue('custentity_bo_eventcity');
        if(eventCity && eventCity !=''){
            shipAddress = shipAddress +eventCity+', ';  
        }
       var eventPostCode = jobs[i].getValue('custentity_bo_eventpostcode');
        if(eventPostCode && eventPostCode !=''){
            shipAddress = shipAddress +eventPostCode+', ';  
        }
       var eventState = jobs[i].getText('custentity_bo_eventstate');
        if(eventState && eventState !=''){
            shipAddress = shipAddress +eventState+', ';  
        }
       var eventCountry = jobs[i].getText('custentity_bo_eventcountry');
        if(eventCountry && eventCountry !=''){
            shipAddress = shipAddress +eventCountry;  
        }
       break;
    }
    if(recordId != '' && recordType != '' && shipAddress  ==''){
        var record = nlapiLoadRecord(recordType,recordId);
        var lineCount = record.getLineItemCount('addressbook');
        for(var j=1;j<=lineCount;j++){
          var defaultShipping = record.getLineItemValue('addressbook','defaultshipping',j);
          if(defaultShipping == 'T'){
          shipAddress  = record.getLineItemValue('addressbook','addrtext',j);
          shipAddressFlag = true;
          break;
          }
        }
        if((!shipAddressFlag) && (lineCount)){
          shipAddress  = record.getLineItemValue('addressbook','addrtext',1);
        }
        shipAddress  = shipAddress.replace(/\n/g,',');
    }
    strName += "<td>";
    strName +=  nlapiEscapeXML(shipAddress);
    strName += "</td>";
    //Course Venue
    var courseVenue = '';
    var eventCity = jobs[i].getValue('custentity_bo_eventcity');
    if(eventCity || eventCity !=''){
      courseVenue = courseVenue + eventCity+', ';
    }
    courseVenue = courseVenue +  jobs[i].getText('custentity_bo_eventcountry');
    strName += "<td>";
    strName +=  nlapiEscapeXML(courseVenue);
    strName += "</td>";
    strName += "<td>";
    strName +=  nlapiEscapeXML(jobs[i].getText('custentity_bo_owner'));
    strName += "</td>";
    strName += "<td>";
    strName +=  nlapiEscapeXML(jobs[i].getValue('formulatext'));
    strName += "</td>";
    }
   strName += "</tr>";
   }
   strName += "</table>";
   */
  return strName; 
}

/**
 * Helper function to GLOBALLY search and replace char or word with provided char or word
 * @param _fullString - Original String Value
 * @param _searchChar - Char or Word to search for
 * @param _replaceChar - Char or Word to replace with.
 * @returns
 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}

function strTrim(stringToTrim) {
	if (!stringToTrim) {
		return '';
	}
	return stringToTrim.replace(/^\s+|\s+$/g,"");	
}
