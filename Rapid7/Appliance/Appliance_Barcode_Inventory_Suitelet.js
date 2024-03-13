/*
 * @author mburstein
 * 
 * MB: 10/28/13 - Remove Stock Location from Netsuite
 * MB: 1/21/14 - The regular expression for Enterprise changed
 * MB: 2/18/2014 - The list option "Damaged - Perm" was marked inactive
 * MB: 2/18/2014 - Added permission restriction - only allow write-off for Finance - General & Admin department
 * MB: 2/19/2014 - If department group is General & Admin then add R7 Internal option
 * MB: 8/5/14 - Updated function updateApplianceStatus, add to comments field instead of overwriting
 * MB: 4/24/15 - Change #181 - Updated regex for Mid-tier and Enterprise appliance serial number checks
 * MB: 7/13/15 - Change #491 - Add New Hardware types - Add serial number validation for the 3 new hardware types: R7-1000, R7-3000, R7-5000
 * 	If adding new Hardware Types in the future, must change in following functions:
 * 		getManufacturer(hardwareType)
 *		getRegexSerial(hardwareType)
 * 
 * 	Ideally, we would switch the hardware type lists to a custom record to control Serial Number Regex and Manufacturer.  This is a project for another day.
 */

function updateApplianceInventory(request, response)
{
   	if ( request.getMethod() == 'GET' ) {
        var form = nlapiCreateForm('Appliance Inventory Management');
		form.setScript('customscriptr7appinvmanagementsuiteletcs');
		var fldHardwareType = form.addField('custpage_hardwaretype','select', 'Hardware Type: ','customlistr7hardwaretype');
		var fldStatus = form.addField('custpage_status','select', 'Status: ', null); // customlistr7appliancestatus
		/*
		 * customlistr7appliancestatus  
		 * 
		 * Evaluation = 6
		 * Sold = 7
		 * Returned = 8
		 * Internal Use = 9
		 * Available for Evaluation = 10
		 * RMA to Mfg = 13
		 * Damaged - Temp = 14
		 * Damaged - Perm = 15
		 * Unknown = 12
		 * New Inventory = 16
		 * Write-off = 17
		 * Pending Return = 19
		 * 
		 */
				
		var fldPONumber = form.addField('custpage_ponumber','text', 'PO: ');
		var fldInstructions = form.addField('custpage_instructions', 'inlinehtml');
        var fldSerialNumbers = form.addField('custpage_serialnumber','textarea','Serial #s :');
		
		var fldUser = form.addField('custpage_user', 'select', 'From: ', 'employee');
		// Get name and ID of current user
		var context = nlapiGetContext();
		var userId = context.getUser();
		var departmentId = context.getDepartment();
		// Get Department Group
		var departmentGroup = nlapiLookupField('department', departmentId, 'custrecordr7departmentgroup');
		fldUser.setDisplayType('hidden');
		fldUser.setDefaultValue(userId);
		
		// Get previously submitted Serial Numbers
		if((request.getParameter('custparam_submittedserialnumbers')) !== null && (request.getParameter('custparam_submittedserialnumbers')) !==''){
			var previouslySubmittedSerialNumbers = decodeURI(request.getParameter('custparam_submittedserialnumbers'));
			previouslySubmittedSerialNumbers = previouslySubmittedSerialNumbers.replace(/\'/g, "");
			fldSerialNumbers.setDefaultValue(previouslySubmittedSerialNumbers);
		}
		
		// Display error if PO not submitted for new inventory
		if((request.getParameter('custparam_poerror')) !== null && (request.getParameter('custparam_poerror')) !==''){
			var poError = request.getParameter('custparam_poerror');
			var fldError = form.addField('custpage_error','text');
			fldError.setDisplayType('inline');
			fldError.setDefaultValue(poError);
			fldError.setLayoutType('outsideabove');
		}
		
		// Display list of invalid serial numbers
		if((request.getParameter('custparam_invalidserialnumbers')) !== null && (request.getParameter('custparam_invalidserialnumbers')) !==''){
			//Add a tab to the Intern form.
			var invalidSerialNumbersTab = form.addTab('custpage_invalidserialnumberstab', 'Invalid Serial Numbers');
			
			// Process serialized parameter into array
			var invalidSerialNumbers = decodeURI(request.getParameter('custparam_invalidserialnumbers'));
			invalidSerialNumbers = invalidSerialNumbers.replace(/[\['\]]/g,"");
			var arrInvalidSerialNumbers = invalidSerialNumbers.split(",");
			//nlapiLogExecution('DEBUG', 'invalidSerialNumbersget:', invalidSerialNumbers);
			//nlapiLogExecution('DEBUG', 'arrInvalidSerialNumbers:', arrInvalidSerialNumbers);
			var fldInvalidSerialNumbers = form.addField('custpage_invalidserialnumbers','inlinehtml',null,null,'custpage_invalidserialnumberstab');
			// Build list of invalid serial numbers
			var invalidList = '<p style="font-weight: bold;">The following previously submitted serial numbers<br>are invalid for specified selections!<br><br></p>';
			invalidList += '<p style="font-size: 1.1em;">';
			for (var y=0; y<arrInvalidSerialNumbers.length; y++){
				invalidList += arrInvalidSerialNumbers[y]+'<br>';
			}
			invalidList += '</p>';
			//fldInvalidSerialNumbers.setDisplayType('inline');
			fldInvalidSerialNumbers.setDefaultValue(invalidList);
			//fldInvalidSerialNumbers.setLayoutType('outsideabove');		
		}
		// Display status report
		if((request.getParameter('custparam_updatedappliances')) !== null && (request.getParameter('custparam_updatedappliances')) !==''){
			var updatedAppliancesTab = form.addTab('custpage_updatedappliancestab', 'Updated Appliances');
			nlapiLogExecution('DEBUG','upapp',request.getParameter('custparam_updatedappliances'));
			// Process serialized parameter into array
			var updatedAppliances = decodeURI(request.getParameter('custparam_updatedappliances'));
			//updatedAppliances = invalidSerialNumbers.replace(/[\['\]]/g,"");
			var arrUpdatedAppliances = eval("(" + updatedAppliances + ")");
			nlapiLogExecution('DEBUG', 'updatedAppliancesget:', updatedAppliances);
			nlapiLogExecution('DEBUG', 'Invalid arrUpdatedAppliances:', arrUpdatedAppliances);
			
			var fldUpdatedAppliances = form.addField('custparam_updatedappliances','inlinehtml',null,null,'custpage_updatedappliancestab');
			
			var updatedAppliancesTable = '<table width="300px">';
			updatedAppliancesTable += '<tr>';
			updatedAppliancesTable += 	'<th style="font-weight:bold;">Serial Number</th>';
			updatedAppliancesTable += 	'<th style="font-weight:bold;">Record ID</th>';
			updatedAppliancesTable += '</tr>';
			var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
			for(id in arrUpdatedAppliances){
				updatedAppliancesTable += '<tr>';
				updatedAppliancesTable += 	'<td><a href="'+toURL+'/app/common/custom/custrecordentry.nl?rectype=179&id='+id+'">'+arrUpdatedAppliances[id]+'</a></td>';
				updatedAppliancesTable += 	'<td>'+id+'</td>';
				updatedAppliancesTable += '</tr>';
			}
			updatedAppliancesTable += '</table>';
			//fldUpdatedAppliances.setDisplayType('inline');
			fldUpdatedAppliances.setDefaultValue(updatedAppliancesTable);
			//fldUpdatedAppliances.setLayoutType('outsideabove');		
		}

		fldSerialNumbers.setMandatory(true);
		fldHardwareType.setMandatory(true);
		
		// set Status options
		fldStatus.setMandatory(true);
		fldStatus.addSelectOption('','');
		fldStatus.addSelectOption('16','New Inventory');
		fldStatus.addSelectOption('7','Sold');
		fldStatus.addSelectOption('8','Returned');
		fldStatus.addSelectOption('6','Evaluation');
		// MB: 2/19/2014 - If department group is General & Admin then add R7 Internal option
		if (departmentGroup == 2 || userId == 23181405) {
			fldStatus.addSelectOption('9', 'Internal Use');
		}
		// MB: 2/18/2014 - If department group is General & Admin then add Write-off option
		if (departmentGroup == 2 || userId == 340932) {
			fldStatus.addSelectOption('17', 'Write-off');
		}
		fldStatus.addSelectOption('13','RMA to Mfg');
		// MB: 2/18/2014 - The list option "Damaged - Perm" was marked inactive
		//fldStatus.addSelectOption('15','Damaged');
		fldStatus.addSelectOption('10','Available for Evaluation');
		fldStatus.addSelectOption('19','Pending Return');
		
		var intructions = '<p style="font-size: 14px; font-weight: bold;">'
		intructions += 'If entering multiple appliances, please enter each serial number on a new line.</p><br>'
		intructions += '<p>New Inventory requires a PO&#35;</p><br>';
      	fldInstructions.setDefaultValue(intructions);
		fldInstructions.setLayoutType('startrow','startcol');
 
        form.addSubmitButton('Submit');
 
        response.writePage( form );
   	}		
	
	if (request.getMethod() == 'POST') {
	
	////// TODO figure out best way to handle status, only new inv needs PO, but PO must be valid as well
	// one function for create new
	// one function to update status: sold, eval, return
	// four cases with PO#
		// new inv and no po
		// new inv and po invalid
		// not new inv and po is not empty
		// not new inv and no PO  = success!
	
		//var manufacturer = request.getParameter('custpage_manufacturer');
		var hardwareType = request.getParameter('custpage_hardwaretype');
		var status = request.getParameter('custpage_status');
		var poNumber = request.getParameter('custpage_ponumber');
		var submittedSerialNumbers = decodeURI(request.getParameter('custpage_serialnumber'));
		var userId = request.getParameter('custpage_user');
		var user = getUserProperties(userId);
		var manufacturer = getManufacturer(hardwareType);
		var arrParams = new Array();	
		// Create array for submitted/updated records
		var updatedAppliances = new Object();
		var invalidSerialNumbers = new Array();
		
		// Log variables
		nlapiLogExecution('DEBUG', 'hardwareType:',hardwareType);
		nlapiLogExecution('DEBUG', 'status: ',status);
		nlapiLogExecution('DEBUG', 'poNumber:',poNumber);
		nlapiLogExecution('DEBUG', 'manufacturer:', manufacturer);
		//nlapiLogExecution('DEBUG', 'submittedSerialNumbers:',submittedSerialNumbers);
		
		if(status == 16 && (poNumber == null || poNumber == '')){ //If New inventory PO is required
			// if any errors hold values for serial
			arrParams['custparam_submittedserialnumbers'] = submittedSerialNumbers;
			arrParams['custparam_poerror'] = "YOU MUST SUBMIT A PO FOR NEW INVENTORY.";
			nlapiSetRedirectURL('SUITELET', 'customscriptr7appinvmanagementsuitelet', 'customdeployr7appinvmanagementsuitelet', null, arrParams);
		}
		else{		
			var regexSerial = getRegexSerial(hardwareType);
			//nlapiLogExecution('DEBUG', 'regexSerial:',regexSerial);	
			
			if (submittedSerialNumbers != null && submittedSerialNumbers != '') {
				var serialNumbers = submittedSerialNumbers.split("\n");
				//nlapiLogExecution('DEBUG', 'SerialNumbers:',serialNumbers);
				for (var i = 0; i < serialNumbers.length; i++) {
					var serialNumber = serialNumbers[i].replace(/\s/g,'');
					try {
						var serialIsValid = validateSerial(serialNumber, regexSerial);
						nlapiLogExecution('DEBUG', 'serialIsValid:', serialIsValid);
					} 
					catch (e) {
						nlapiLogExecution('ERROR', 'Description:', e);
					}
					nlapiLogExecution('DEBUG', 'serialNumber:', serialNumber);		
					
					if(serialIsValid != false){
						if (status == 16) { //new inventory
												
							try {
								var applianceMasterId = createNewApplianceMaster(hardwareType, status, poNumber, serialNumber,manufacturer,user);
								nlapiLogExecution('DEBUG','appmast',applianceMasterId);
								updatedAppliances[applianceMasterId] = serialNumber;
							} 
							catch (e) {
								invalidSerialNumbers.push(serialNumber);
								var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
								nlapiSendEmail(adminUser, adminUser, 'Could not create new Appliance Master for Serial#: ' + serialNumber, e.name + ' : ' + e.message);
							}			
						}
						else{ // status is not new inventory
							try{
								var applianceMasterId = updateApplianceStatus(hardwareType, status, serialNumber,user);
								if (applianceMasterId != null && applianceMasterId != ''){
									updatedAppliances[applianceMasterId] = serialNumber;
									nlapiLogExecution('DEBUG', 'updatedAppliances:', updatedAppliances);
								}
								else{
									invalidSerialNumbers.push(serialNumber);
								}							
							}
							catch (e) {
								var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
								nlapiSendEmail(adminUser, adminUser, 'Could not update Appliance Master status for Serial#: ' + serialNumber, e.name + ' : ' + e.message);
							}
						}
					}
					else{
						invalidSerialNumbers.push(serialNumber);
						nlapiLogExecution('DEBUG', 'invalidSerialNumbers:', invalidSerialNumbers);
					}
					
				
				} // end for loop	
			}
		}
	// after submit return to suitelet but show table of submitted records

	arrParams['custparam_submittedserialnumbers'] = serialize(submittedSerialNumbers);
	if(updatedAppliances != null && updatedAppliances !=''){
		nlapiLogExecution('DEBUG','updatefresh',updatedAppliances);

		updatedAppliances = JSON.stringify(updatedAppliances);
		//updatedAppliances = serialize(updatedAppliances);
		nlapiLogExecution('DEBUG','updatedAppliancesSerialized',updatedAppliances);
		arrParams['custparam_updatedappliances'] = updatedAppliances;	
	}
	if(invalidSerialNumbers != null && invalidSerialNumbers !=''){
		invalidSerialNumbers = serialize(invalidSerialNumbers);
		arrParams['custparam_invalidserialnumbers'] = invalidSerialNumbers;	
	}
	
	for(arp in arrParams){
		nlapiLogExecution('DEBUG', arp, arrParams[arp]);
	}
	
	nlapiSetRedirectURL('SUITELET', 'customscriptr7appinvmanagementsuitelet', 'customdeployr7appinvmanagementsuitelet', null, arrParams);	
	//response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");	
	}
}

// was very easy to do a nlobjSearchFilter() and nlobjSearchRecord() then loop through the results to add them one by one with nlobjField.addSelectOption()

function getManufacturer(hardwareType){
	var arrManufacturers = new Array();
	// hardwareType = vendor (internal IDs)
	arrManufacturers['1'] = '38370'; // These are from MBX now instead of CDW Direct
	arrManufacturers['2'] = '38370';
	arrManufacturers['3'] = '26470'; // Lenovo
	arrManufacturers['4'] = '38370'; //MBX Systems
	arrManufacturers['5'] = '744'; // Silicon Mechanics, Inc.
	arrManufacturers['6'] = '38370'; // Add MBX for V2 appliance
	/*
	 * Change #491 - Add New Hardware types - Add serial number validation for the 3 new hardware types: R7-1000, R7-3000, R7-5000
	 * 	All new types are MBX
	 */
	arrManufacturers['7'] = '38370'; // // Add MBX for V2 appliance
	arrManufacturers['8'] = '38370'; 
	arrManufacturers['9'] = '38370'; 
	
	var manufacturer = arrManufacturers[hardwareType];
	// returns Vendor ID
	return manufacturer;	
}	

function getStatusLabel(status){
	var arrStatus = new Array();
	arrStatus['6'] = 'Evaluation';
	arrStatus['7'] = 'Sold';
	arrStatus['8'] = 'Returned';
	arrStatus['10'] = 'Available for Evaluation';
	arrStatus['13'] = 'RMA to Mfg';
	arrStatus['15'] = 'Damaged';
	arrStatus['9'] = 'Internal Use';
	arrStatus['17'] = 'Write-off';
	arrStatus['16'] = 'New Inventory';
	arrStatus['19'] = 'Pending Return';
	
	var statusLabel = arrStatus[status];
	return statusLabel;
}

function getUserProperties(userId){
	var user = new Object();
	user.first = nlapiLookupField('employee',userId,'firstname');
	user.last = nlapiLookupField('employee',userId,'lastname');
	return user;
}

function createNewApplianceMaster(hardwareType,status,poNumber,serialNumber, manufacturer,user){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('name',null,'is',serialNumber);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	
	var results = nlapiSearchRecord('customrecordr7appliancemaster', null, filters, columns);
	if (results != null) {
		for (var w = 0; w < results.length; w++) {
			var result = results[w];
			var applianceMasterId = result.getValue(columns[0]);
			nlapiLogExecution('DEBUG', 'applianceMasterId:', applianceMasterId);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Appliance Master already exists for Serial#: ' + serialNumber, '<p>Could not create new Appliance Master, record already exists for <a href="'+toURL+'/app/common/custom/custrecordentry.nl?rectype=179&id=' + applianceMasterId + '">' + serialNumber + '</a></p>');
		}
	}
	else 
		if (results == null) {
		nlapiLogExecution('DEBUG', 'resSer:', serialNumber);
			var recApplianceMaster = nlapiCreateRecord('customrecordr7appliancemaster');
			
			// Set record values
			recApplianceMaster.setFieldValue('name', serialNumber);
			recApplianceMaster.setFieldValue('custrecordr7appliancemastermanufacturer', manufacturer);
			recApplianceMaster.setFieldValue('custrecordr7appliancemasterglobalstatus', status);
			//recApplianceMaster.setFieldValue('custrecordr7appliancemasterstocklocation', 1); // New Inventory for Sale
			recApplianceMaster.setFieldValue('custrecordr7appliancemasterhardwaretype', hardwareType);
			
			var statusLabel = getStatusLabel(status);
			var today = new Date();
			var comments = today + ' - ' + user.first + ' ' + user.last + ' - PO# ' + poNumber + ' - Appliance Created with status: ' + statusLabel; // Date - Name - PO Number - Appliance created 

			recApplianceMaster.setFieldValue('custrecordr7appliancemastercomments', comments);
			
			var applianceMasterId = nlapiSubmitRecord(recApplianceMaster);
		}

	return applianceMasterId;
	
			
/* customlist315  Stock Location
 * 
 * New Inventory for Sale = 1
 * Eval Pool = 2
 * At Customer Site = 5
 * Holding for Disposition = 3
 * Permanently Damaged = 4
 * RMA to Mfg = 6
 * 
 */

}
/*
 * Need update APP status
 */

function updateApplianceStatus(hardwareType, status, serialNumber,user){

	var filters = new Array();
	filters[0] = new nlobjSearchFilter('name',null,'is',serialNumber);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('internalid','custrecordr7appliancemfgserialnumber');
	columns[2] = new nlobjSearchColumn('custrecordr7appliancedateoftransaction','custrecordr7appliancemfgserialnumber');
	columns[2].setSort(true);
	
	var results = nlapiSearchRecord('customrecordr7appliancemaster', null, filters, columns);
	if (results != null && results != '') {
		for (var j = 0; j < 1; j++) {
			var result = results[j];
			var recId = result.getValue(columns[0]);
			var appId = result.getValue(columns[1]);
			nlapiLogExecution('DEBUG', 'recId:', recId);
			nlapiLogExecution('DEBUG', 'appId:', appId);
			nlapiLogExecution('DEBUG', 'hardware type:', hardwareType);
		}	
		if (recId != null && recId != '') {	
			var recApplianceMaster = nlapiLoadRecord('customrecordr7appliancemaster', recId);
			
			// Set record values
			recApplianceMaster.setFieldValue('custrecordr7appliancemasterglobalstatus', status);

			var statusLabel = getStatusLabel(status);
			
			var today = new Date();
			// MB: 8/5/14 - Updated function updateApplianceStatus, add to comments field instead of overwriting
			var comments = today + ' - ' + user.first + ' ' + user.last + ' - Appliance updated status: ' + statusLabel; // Date - Name - Appliance created
			var currentMasterComments = recApplianceMaster.getFieldValue('custrecordr7appliancemastercomments');
			var masterComments = comments + (currentMasterComments == null ? "" : '\n\n' + currentMasterComments);
			recApplianceMaster.setFieldValue('custrecordr7appliancemastercomments', masterComments);
			
			
			//MB: 10/28/13 - Remove Stock Location from Netsuite
			
			/*var stockLocation = '';
			switch (status){
				// Eval = customer site
				case '6':
					stockLocation = 5;
					break;
				// Sold = customer site
				case '7':
					stockLocation = 5;
					break;
				// Returned = holding for disposition
				case '8':
					stockLocation = 3;
					break;
				// Available for Evaluation = Eval Pool
				case '10':
					stockLocation = 2;
					break;
				// Write-Off = Write-Off
				case '17':
					stockLocation = 7;
					break;
				// Internal Use = Internal Use
				case '9':
					stockLocation = 8;
					break;
				// Damaged - Perm = Permanently Damaged
				case '15':
					stockLocation = 4;
					break;
				// RMA to Mfg = RMA to Mfg
				case '13':
					stockLocation = 6;
					break;
				// Pending Return = Customer Site
				case '19':
					stockLocation = 5;
					break;
			}
			recApplianceMaster.setFieldValue('custrecordr7appliancemasterstocklocation', stockLocation);*/
			
			var applianceMasterId = nlapiSubmitRecord(recApplianceMaster);
			// Set Most recent Appliance status
			if (appId != null && appId != '' && status != 10) {
				var recAppliance = nlapiLoadRecord('customrecordr7appliance', appId);
				recAppliance.setFieldValue('custrecordr7appliancestatus', status);
				// MB: 8/5/14 - Updated function updateApplianceStatus, add to comments field instead of overwriting
				var currentAppComments = recAppliance.getFieldValue('custrecordr7appliancemastercomments');
				var appComments = comments + (currentAppComments == null ? "" : '\n\n' + currentAppComments);
				recAppliance.setFieldValue('custrecordr7appliancecomments', appComments); 
				var appId = nlapiSubmitRecord(recAppliance,false,true);
			}
		}
	}
	return applianceMasterId;
}

/*
 * Change #491 - Add New Hardware types - Add serial number validation for the 3 new hardware types: R7-1000, R7-3000, R7-5000
 */

function getRegexSerial(hardwareType){
	// Create a regular expression object to test serial numbers based on manufacturer
	
	/*
	 * customlistr7hardwaretype  
	 * 
	 * HP Enterprise Console = 1
	 * HP Mid-Tier Console = 2
	 * IBM Lenovo Laptop = 3
	 * MBX Appliance (64 bit) = 4
	 * Silicon Mechanics (SM box) = 5
	 * MBX Appliance (v2) = 6
	 * R7-1000 = 7
	 * R7-3000 = 8
	 * R7-5000 = 9
	 */
	// Possible serial number types
	/*
	 * MBX
	 * 194473089010
	 * 
	 * MBX - Enterprise
	 * USE242JTDC
	 * MXQ51402J0
	 * 
	 * CDW
	 * 2M2104001CW  outlier
	 * 2M211400DX
	 * 
	 * Laptop
	 * R8D1P64
	 * 
	 * SM
	 * SM22147av  outlier
	 * SM22148
	 * 
	 * V2/ R7-1000:
	 * 2M25240848
	 * 2M25240849
	 * 
	 * MidTiers/R7-3000:
	 * MXQ51402J0
	 * MXQ51402J1
	 * 
	 * Enterprise/ R7-5000:
	 * MXQ51303JX
	 * MXQ51303JY
	 */
	
	switch (hardwareType) {
		case '1':
			// MB: 1/21/14 - The regular expression for Enterprise changed
			regexSerial = /^2\w{9}\b/;
			regexSerial.v2 = /^([A-Z]){3}\w{7}/;
			break;
		case '2':
			// MB: 11/5/14 - The regular expression for Mid-Tier changed
			regexSerial = /^2\w{9}\b/;
			regexSerial.v2 = /^([A-Z]){3}\w{7}/;
			break;
		case '3':
			regexSerial = /^[rR]\w{6}\b/;
			break;
		case '4':
			regexSerial = /\b\d{12}\b/;
			break;
		case '5':
			regexSerial = /^SM\d{5}\b/;
			break;
		//TODO check serial format for MBX v2 appliance	
		case '6':
			regexSerial = /\b\d{12}\b/;
			break;
		case '7':
			regexSerial = /\b2M\d{8}\b/;
			break;
		case '8':
			regexSerial = /\b[A-Z]{3}\w{7}\b/;
			break;
		case '9':
			regexSerial = /\b[A-Z]{3}\w{7}\b/;
			break;
	}
	return regexSerial;
}


function validateSerial(serialNumber, regexSerial){
	var serialIsValid = regexSerial.test(serialNumber);
	if (serialIsValid != true && regexSerial.v2 != null && regexSerial.v2 != ''){
		serialIsValid = regexSerial.v2.test(serialNumber);
	}
	// serialIsValid = false if serial is not correct format
	return serialIsValid;
}

function serialize(obj){
	var returnVal;
	if(obj != undefined){
		switch(obj.constructor){
   			case Array:
    			var vArr="[";
    				for(var i=0;i<obj.length;i++){
     					if(i>0) vArr += ","; {
							vArr += serialize(obj[i]);
						}
    				}
    			vArr += "]"
    			return vArr;
   			case String:
    			returnVal = escape("'" + obj + "'");
    			return returnVal;
  			case Number:
    			returnVal = isFinite(obj) ? obj.toString() : null;
    			return returnVal;    
   			case Date:
    			returnVal = "#" + obj + "#";
    			return returnVal;  
   			default:
   				if(typeof obj == "object"){
     				var vobj=[];
 					for(attr in obj) {
 						if(typeof obj[attr] != "function"){
   							vobj.push('"' + attr + '":' + serialize(obj[attr]));
						}
 					}
 					if (vobj.length > 0) {
						return "{" + vobj.join(",") + "}";
					}
					else {
						return "{}";
					}
    			}  
    			else{
     				return obj.toString();
   				}
  		}
	}
	return null;
}
