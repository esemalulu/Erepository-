/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Nov 2016     brians
 *
 */

var VENDOR_LIPPERT = '10832';
var VENDOR_LIPPERTCOMPONENTS = '91';  
var VENDOR_LIPPERTMICHIANAMATTRESS = '3687'; /* can't find */
var VENDOR_LIPPERTINTERIORS = '3686'; 
var VENDOR_KINRO = '84';
var VENDOR_KINROCOMPOSITES = '2324';
var VENDOR_KINRO210 = '4572';
var VENDOR_LIPPERT80 = '3784059';
var VENDOR_LIPPERT83 = '3896866';
var VENDOR_LIPPERT148 = '35';
var VENDOR_LIPPERT155 = '3773699';


var LIPPERTVENDORS = [VENDOR_LIPPERT155,VENDOR_LIPPERT148,VENDOR_LIPPERT83,VENDOR_LIPPERT80,VENDOR_LIPPERT, VENDOR_LIPPERTCOMPONENTS, VENDOR_LIPPERTMICHIANAMATTRESS, VENDOR_LIPPERTINTERIORS, VENDOR_KINRO, VENDOR_KINROCOMPOSITES, VENDOR_KINRO210];

/**
 * This GET Restlet returns a list of VCBs whose vendor is Lippert, but have not been marked as received by Lippert.
 * It returns an array of VCB objects, which include the contents of any files attached to the VCB.
 * @param {Object} dataIn Parameter object
 * @returns {Array} vcbArray
 */
function getVCBsToReceiveRESTlet(dataIn) {
	
	var statusFilters = dataIn.status;
	var startdate = dataIn.startdate;
	var enddate = dataIn.enddate;
	var getAttachments = dataIn.getfiles || false;
	var id = dataIn.id;
	
	//We'll return the vcbArray, but we'll use a hash to track the VCBs we've processed
	var returnArray = [];
	var vcbArray = [];
	var vcbHash = {};
	var claimsArray = [];
	var claimsHash = {};
	
	//Certain items are manufactured by Furrion, and sent to GD via a partner agreement with Lippert.
	//Lippert wants to exclude any VCBs with these parts on them.
	var furrionParts = [];
	var furrionPartResults = nlapiSearchRecord('item', null, new nlobjSearchFilter('custitemgd_isfurrion', null, 'is', 'T'), null);
	if(furrionPartResults != null && furrionPartResults.length > 0)
	{
		for(var p = 0; p < furrionPartResults.length; p++)
		{
			furrionParts.push(furrionPartResults[p].getId());
		}
	}
	
	//Create the filters for our search
	var filters = new Array();

	filters.push(new nlobjSearchFilter('custrecordvcb_vendor', null, 'anyof', LIPPERTVENDORS));
	
	if(id != null){
		filters.push(new nlobjSearchFilter('internalid', null, 'anyof', id));
	}
	if(statusFilters != null)
	{
		statusFilters = statusFilters.split(',');
		if(statusFilters.length > 0)
			filters.push(new nlobjSearchFilter('custrecordvcb_status', null, 'anyof', statusFilters));
	}
	if(enddate != null)
		filters[filters.length] = new nlobjSearchFilter('created', null, 'onorbefore', enddate);
	if(startdate != null)
		filters[filters.length] = new nlobjSearchFilter('created', null, 'onorafter', startdate);
	if(getAttachments == 'T')
		getAttachments = true;
	else
		getAttachments = false;

	//Create the columns for our search
	var columns = new Array();
	columns.push(new nlobjSearchColumn('internalid'));
	columns[columns.length-1].setSort(); 							//Sort by ascending internal id
	columns.push(new nlobjSearchColumn('created'));
	columns.push(new nlobjSearchColumn('custrecordvcb_claim'));
	columns.push(new nlobjSearchColumn('custrecordvcb_reqlabortotal'));
	columns.push(new nlobjSearchColumn('custrecordvcb_reqpartstotal'));
	columns.push(new nlobjSearchColumn('custrecordvcb_reqpartsmarkuptotal'));
	columns.push(new nlobjSearchColumn('custrecordvcb_reqfreighttotal'));
	columns.push(new nlobjSearchColumn('custrecordvcb_reqsublettotal'));
	columns.push(new nlobjSearchColumn('custrecordvcb_reqvcbtotal'));
	columns.push(new nlobjSearchColumn('custrecordclaim_dateworkstarted', 'custrecordvcb_claim'));
	columns.push(new nlobjSearchColumn('custrecordclaim_dateworkcompleted', 'custrecordvcb_claim'));
	columns.push(new nlobjSearchColumn('custrecordclaim_approvedlaborrate', 'custrecordvcb_claim'));
	columns.push(new nlobjSearchColumn('custrecordclaim_retailsolddate', 'custrecordvcb_claim'));
	columns.push(new nlobjSearchColumn('custrecordclaim_shipdate', 'custrecordvcb_claim'));
	columns.push(new nlobjSearchColumn('custrecordclaim_unitmodel', 'custrecordvcb_claim'));
	columns.push(new nlobjSearchColumn('custrecordclaim_customer', 'custrecordvcb_claim'));
	columns.push(new nlobjSearchColumn('owner'));
	columns.push(new nlobjSearchColumn('custrecordvcb_isreceivedbylippert'));
	columns.push(new nlobjSearchColumn('custrecordvcb_unit'));
	columns.push(new nlobjSearchColumn('custrecordvcb_status'));

	var vcbResults =  GetSteppedSearchResults('customrecordrvsvendorchargeback', filters, columns, null);
	
	if(vcbResults != null && vcbResults.length > 0)
	{
		var vcbObj = '';
		var vcbId = '';
		var dealerId = '';
		
		for(var i = 0; i < vcbResults.length; i++)
		{
			try
			{
				vcbId = trim(vcbResults[i].getId());
				//If this search result contains a VCB that is not in our hash, then add a new item to our hash
				if(vcbHash[vcbId] == null)
				{
					vcbObj = new Object();
					vcbObj.id = vcbId;
					vcbArray.push(vcbId);
					vcbObj.date = trim(vcbResults[i].getValue('created'));
					vcbObj.isreceived = trim(vcbResults[i].getValue('custrecordvcb_isreceivedbylippert'));
					vcbObj.claim = trim(vcbResults[i].getText('custrecordvcb_claim'));
					claimsArray.push(vcbObj.claim);
					vcbObj.labor = trim(vcbResults[i].getValue('custrecordvcb_reqlabortotal'));
					vcbObj.parts = trim(vcbResults[i].getValue('custrecordvcb_reqpartstotal'));
					vcbObj.partsmarkup = trim(vcbResults[i].getValue('custrecordvcb_reqpartsmarkuptotal'));
					vcbObj.freight = trim(vcbResults[i].getValue('custrecordvcb_reqfreighttotal'));
					vcbObj.sublet = trim(vcbResults[i].getValue('custrecordvcb_reqsublettotal'));
					vcbObj.total = trim(vcbResults[i].getValue('custrecordvcb_reqvcbtotal'));
					vcbObj.dealer = trim(vcbResults[i].getText('custrecordclaim_customer', 'custrecordvcb_claim'));
					dealerId = vcbResults[i].getValue('custrecordclaim_customer', 'custrecordvcb_claim') || '';
					vcbObj.dealeraddress = '';
					if(dealerId != '')
						vcbObj.dealeraddress = nlapiLookupField('customer', dealerId, 'shipaddress');
					vcbObj.workstarted = trim(vcbResults[i].getValue('custrecordclaim_dateworkstarted', 'custrecordvcb_claim'));
					vcbObj.workcompleted = trim(vcbResults[i].getValue('custrecordclaim_dateworkcompleted', 'custrecordvcb_claim'));
					vcbObj.laborrate = trim(vcbResults[i].getValue('custrecordclaim_approvedlaborrate', 'custrecordvcb_claim'));
					vcbObj.dop = trim(vcbResults[i].getValue('custrecordclaim_retailsolddate', 'custrecordvcb_claim'));
					vcbObj.dom = trim(vcbResults[i].getValue('custrecordclaim_shipdate', 'custrecordvcb_claim'));
					vcbObj.model = trim(vcbResults[i].getText('custrecordclaim_unitmodel', 'custrecordvcb_claim'));
					
					vcbObj.requestor = trim(vcbResults[i].getText('owner'));
					vcbObj.vin = trim(vcbResults[i].getText('custrecordvcb_unit'));
					vcbObj.status = trim(vcbResults[i].getText('custrecordvcb_status'));
					vcbObj.jobList = [];
					vcbObj.vcbpartlist = [];
					vcbObj.operationlist = [];
	
					vcbHash[vcbId] = vcbObj;
				}
			}
			catch(err){
				//for some reason, we couldn't add our vcb to the hash
				nlapiLogExecution('error', err.getCode(), err.getDetails());
			}
		}
		
		try {
			//Get all the items from any vcbs we want to return, and add them to our VCB hash
			var fils = [];
			fils.push(new nlobjSearchFilter('custrecordvcbitem_vendorchargeback', null, 'anyof', vcbArray));
			fils.push(new nlobjSearchFilter('type', 'custrecordvcbitem_item', 'noneof', 'NonInvtPart'));
			var cols = [];
			cols.push(new nlobjSearchColumn('custrecordvcbitem_item'));
			cols.push(new nlobjSearchColumn('custrecordvcbitem_description'));
			cols.push(new nlobjSearchColumn('custrecordvcbitem_quantity'));
			cols.push(new nlobjSearchColumn('custrecordvcbitem_reqamt'));
			cols.push(new nlobjSearchColumn('custrecordvcbitem_job'));
			cols.push(new nlobjSearchColumn('custrecordvcbitem_vendorchargeback'));
			cols.push(new nlobjSearchColumn('type', 'custrecordvcbitem_item'));
			
			var vcbItemResults = nlapiSearchRecord('customrecordrvsvendorchargebackitem', null, fils, cols);
			if(vcbItemResults != null && vcbItemResults.length > 0)
			{
				var itemObj = '';
				for(var j = 0; j < vcbItemResults.length; j++)
				{
					var vcbItemVcbId = vcbItemResults[j].getValue('custrecordvcbitem_vendorchargeback');
					itemObj = {};
					itemObj.part = vcbItemResults[j].getText('custrecordvcbitem_item');
					itemObj.partId = vcbItemResults[j].getValue('custrecordvcbitem_item');
					itemObj.description = vcbItemResults[j].getValue('custrecordvcbitem_description');
					itemObj.quantity = vcbItemResults[j].getValue('custrecordvcbitem_quantity');
					itemObj.amount = vcbItemResults[j].getValue('custrecordvcbitem_reqamt');
					itemObj.job = vcbItemResults[j].getValue('custrecordvcbitem_job') || '';
					
					var vcbObj = vcbHash[vcbItemVcbId];
					//We don't want to return this VCB if it contains a Furrion part
					if(furrionParts.indexOf(itemObj.partId) != -1)
					{
						delete vcbHash[vcbItemVcbId];
					}
					//When we get the Claim Operation Lines for this VCB, we only want to return those that match the job numbers on this VCB
					else if(vcbObj != null)
					{
						//Add this job # to our job list for this vcb, if it's not already there
						if(itemObj.job != '' && vcbObj.jobList.indexOf(itemObj.job) == -1)
							vcbObj.jobList.push(itemObj.job);
						
						//Add this item to our partlist for this vcb
						vcbObj.vcbpartlist.push(itemObj);
						
						//We'll use this job list to only add Lippert-related operation lines, when we're processing claims
						//If there are multiple VCBs tied to the same claim, be sure not to override the existing job numbers - BJS Case #10144 7/9/18
						if(claimsHash[vcbObj.claim] == undefined)
							claimsHash[vcbObj.claim] = vcbObj.jobList;
						else
						{
							var vcbJobList = vcbObj.jobList;
							var existingJobList = claimsHash[vcbObj.claim];
							var newJobList = existingJobList.concat(vcbJobList);
							claimsHash[vcbObj.claim] = newJobList;
						}
						vcbHash[vcbItemVcbId] = vcbObj;
					}
				}
			}
		}
		catch(err) {
			nlapiLogExecution('error', 'vcbItem error on VCB:', vcbItemVcbId);
		}
		
		try {
			
			if(claimsArray.length > 0)
			{
				var claimDict = {};		//Create a dictionary to store our claim data: a JSON object for each operation line, with an array of part lines
				
				//Get the Operation Lines for our claims
				var opfils = [];
				opfils.push(new nlobjSearchFilter('custrecordclaimoperationline_claim', null, 'anyof', claimsArray));
				var opcols = [];
				opcols.push(new nlobjSearchColumn('internalid'));
				opcols[opcols.length-1].setSort();
				opcols.push(new nlobjSearchColumn('custrecordclaimoperationline_claim'));
				opcols.push(new nlobjSearchColumn('custrecordclaimoperationline_problem'));
				opcols.push(new nlobjSearchColumn('custrecordclaimoperationline_cause'));
				opcols.push(new nlobjSearchColumn('custrecordclaimoperationline_remedy'));
				opcols.push(new nlobjSearchColumn('custrecordclaimoperationline_hours'));
				opcols.push(new nlobjSearchColumn('custrecordclaimoperationline_manufnumber'));
				opcols.push(new nlobjSearchColumn('custrecordclaimoperationline_fileids'));
				opcols.push(new nlobjSearchColumn('custrecordclaimoperationline_linenumber'));
				opcols.push(new nlobjSearchColumn('custrecordflatratecode_maincategory', 'custrecordclaimoperationline_flatratecod'));
				opcols.push(new nlobjSearchColumn('custrecordflatratecode_subcategory', 'custrecordclaimoperationline_flatratecod'));
				
				var vcbClaimOpLineResults = nlapiSearchRecord('customrecordrvsclaimoperationline', null, opfils, opcols);
				if(vcbClaimOpLineResults != null && vcbClaimOpLineResults.length > 0)
				{
					var opLineObj = '';
					var opLineId = '';
					var claimId = '';
					var fileIds = '';
					for(var k = 0; k < vcbClaimOpLineResults.length; k++)
					{
						try {
							opLineId = vcbClaimOpLineResults[k].getId();
							opLineObj = {};
							opLineObj.problem = vcbClaimOpLineResults[k].getValue('custrecordclaimoperationline_problem');
							opLineObj.cause = vcbClaimOpLineResults[k].getValue('custrecordclaimoperationline_cause');
							opLineObj.remedy = vcbClaimOpLineResults[k].getValue('custrecordclaimoperationline_remedy');
							opLineObj.hours = vcbClaimOpLineResults[k].getValue('custrecordclaimoperationline_hours');
							opLineObj.mfg = vcbClaimOpLineResults[k].getValue('custrecordclaimoperationline_manufnumber');
							opLineObj.category = vcbClaimOpLineResults[k].getText('custrecordflatratecode_maincategory', 'custrecordclaimoperationline_flatratecod');
							opLineObj.subcategory = vcbClaimOpLineResults[k].getText('custrecordflatratecode_subcategory', 'custrecordclaimoperationline_flatratecod');
							opLineObj.partslist = [];
							opLineObj.files = [];
							fileIds = vcbClaimOpLineResults[k].getValue('custrecordclaimoperationline_fileids') || '';
							if(fileIds != '')
							{
								fileIds = fileIds.split(',');
								for(var f = 0; f < fileIds.length; f++)
								{
									opLineObj.files.push(returnFileFromFileId(fileIds[f], getAttachments));
								}
							}
							var lineNum = vcbClaimOpLineResults[k].getValue('custrecordclaimoperationline_linenumber');
							opLineObj.job = lineNum;
							claimId = vcbClaimOpLineResults[k].getValue('custrecordclaimoperationline_claim');
							//Only return this op line if its line number is in the job list array for this claim.
							//We store the job list array in the Claims hash, which is indexed with the claim id
							if(claimsHash[claimId] != null && claimsHash[claimId].indexOf(lineNum) != -1)
							{
								if(claimDict[claimId] == null)
								{
									var opLineDict = {}; 	//Create a dictionary to store our operation lines.
									opLineDict[opLineId] = opLineObj;	//Add this operation line to our Operation Line dictionary, using the Op Line Id as an index
									
									claimDict[claimId] = opLineDict;
								}
								else 	//We've already processed an op line for this claim, so just add the op line to the existing dictionary
								{
									claimDict[claimId][opLineId] = opLineObj;
								}
							}

						}
						catch(err) {
							nlapiLogExecution('error', err.getCode(), err.getDetails() + ' on Op Line Id: ' + opLineId);
						}
					}
				}
				
				//Get the Part Lines for our claims
				var partfils = [];
				partfils.push(new nlobjSearchFilter('custrecordclaimpartline_claim', null, 'anyof', claimsArray));
				var partcols = [];
				partcols.push(new nlobjSearchColumn('custrecordclaimpartline_claim'));
				partcols.push(new nlobjSearchColumn('custrecordclaimpartline_item'));
				partcols.push(new nlobjSearchColumn('custrecordclaimpartline_description'));
				partcols.push(new nlobjSearchColumn('custrecordclaimpartline_quantity'));
				partcols.push(new nlobjSearchColumn('custrecordclaimpartline_units'));
				partcols.push(new nlobjSearchColumn('custrecordclaimpartline_unitstype'));
				partcols.push(new nlobjSearchColumn('custrecordclaimpartline_appvdamt'));
				partcols.push(new nlobjSearchColumn('custrecordcustrecordclaimpartline_oplink'));
				
				var vcbClaimPartLineResults = nlapiSearchRecord('customrecordrvsclaimpartline', null, partfils, partcols);
				if(vcbClaimPartLineResults != null && vcbClaimPartLineResults.length > 0)
				{
					var partClaimId = '';
					var partLineObj = '';
					var opLineLink = '';
					for(var m = 0; m < vcbClaimPartLineResults.length; m++)
					{
						try {
							partLineObj = {};
							opLineLink = vcbClaimPartLineResults[m].getValue('custrecordcustrecordclaimpartline_oplink');
							partLineObj.part = vcbClaimPartLineResults[m].getText('custrecordclaimpartline_item');
							partLineObj.description = vcbClaimPartLineResults[m].getValue('custrecordclaimpartline_description');
							partLineObj.quantity = vcbClaimPartLineResults[m].getValue('custrecordclaimpartline_quantity');
							partLineObj.units = vcbClaimPartLineResults[m].getText('custrecordclaimpartline_units');
							partLineObj.amount = vcbClaimPartLineResults[m].getValue('custrecordclaimpartline_appvdamt');
							
							partClaimId = vcbClaimPartLineResults[m].getValue('custrecordclaimpartline_claim');
							if(partClaimId != null && claimDict[partClaimId] != null)
							{
								if(claimDict[partClaimId][opLineLink] != null)
									claimDict[partClaimId][opLineLink].partslist.push(partLineObj); 	//Add this part line to the appropriate index in the Op Line dictionary
							}
						}
						catch(err){
							nlapiLogExecution('error', err.getCode(), err.getDetails() + ' on partLine Id: ' + vcbClaimPartLineResults[m].getId());
						}
					}
				}
				
				//Finally, push our operation lines & part lines from our claim dictionary to the correct spot in the vcb array
				var claimObj = '';
				for(v in vcbHash)
				{
					claimObj = claimDict[vcbHash[v].claim];
					if(claimObj != null)
					{
						for(operation in claimObj)
						{
							//Only add this op line to this vcb if its job # belongs to that vcb
							if(vcbHash[v].jobList.indexOf(claimObj[operation].job) != -1)
								vcbHash[v].operationlist.push(claimObj[operation]);
						}
					}
				}
			}
		}
		catch(err){
			nlapiLogExecution('error', err.getCode(), err.getDetails());
		}
	}
	
	//Loop through and add our vcb items to the final array to be returned
	for(item in vcbHash) {
		returnArray.push(vcbHash[item]);
	}
	
	return returnArray;
}

function getVCBPrintoutById(dataIn) {
	
	var returnObj = {};
	
	var vcbId = dataIn.id || '';
	if(vcbId != '')
	{
		returnObj.pdf = '';
		returnObj.id = vcbId;
		returnObj.error = '';
		returnObj.success = false;
		try {
			var vcbRec = nlapiLoadRecord('customrecordrvsvendorchargeback', vcbId);
			var vendor = vcbRec.getFieldValue('custrecordvcb_vendor');
			if(LIPPERTVENDORS.indexOf(vendor) != -1)
			{
				var pdfFile = GD_GetVCBPrintout(vcbRec);
				returnObj.success = true;
				returnObj.pdf = pdfFile.getValue();
			}
			else
				returnObj.error = 'This VCB does not belong to Lippert or its subsidiaries.';

		}
		catch (err) {
			nlapiLogExecution('error', 'Error fetching VCB# ' + vcbId, err);
			returnObj.error = err;
		}
	}
	
	return returnObj;
}

/**
 * This POST Restlet will be used by Lippert to mark VCBs as received.
 * @param {Object} dataIn Parameter object
 * @returns {Object} Object containing the id of the VCB submitted and a message describing success or failure.
 */
function postReceivedVCBsRESTlet(dataIn) {
	
	var returnObj = {};
	
	if(dataIn != undefined && dataIn != null && dataIn.vcb != null && dataIn.vcb != '')
	{
		returnObj.vcb = dataIn.vcb;

		try {
			nlapiSubmitField('customrecordrvsvendorchargeback', dataIn.vcb, 'custrecordvcb_isreceivedbylippert', 'T');
			returnObj.success = true;
			//returnObj.message = 'Success: Marked VCB ' + dataIn.vcb + ' received.';
		}
		catch (err) {
			nlapiLogExecution('ERROR', err.getCode(), 'Unable to submit VCB ' + dataIn.vcb + ' - ' + err.getDetails());
			returnObj.success = false;
			//returnObj.message = 'Failure: Unable to mark VCB ' + dataIn.vcb + ' received.';
		}
	}
	
	return JSON.stringify(returnObj);
}

function returnFileFromFileId(fileId, getAttachments) {
	
	var returnObj = {};
	try
	{
		var fileObj = nlapiLoadFile(fileId);
		if(fileObj != null)
		{
			returnObj.id = fileId;
			returnObj.name = fileObj.getName();
			returnObj.type = fileObj.getType();
			returnObj.size = fileObj.getSize();
			returnObj.contents = '';
			if(getAttachments)
				returnObj.contents = fileObj.getValue();
		}
	}
	catch (err)
	{
		nlapiLogExecution('ERROR', err.getCode(), 'Unable to Load File with Id ' + fileId + ' - ' + err.getDetails());
	}
	
	return returnObj;
}

var VCB_PART_SUBLIST = 'recmachcustrecordvcbitem_vendorchargeback';
var FILE_TOTAL_SIZE_LIMIT = 7200;

function GD_GetVCBPrintout(vcbRec) {
	
	var vcbHTML = GetVendorChargebackPrintHTML(vcbRec.getId(), true); 	//This method located in GD_PrintVendorChargeback_PluginImplementation.js
	//Had to copy it, since we can't call this RVS plugin from a non-RVS file.  Also can't just call the workflow action used by the button on the VCB record, since that relies on nlapiGetRecordId()
	
	//Create the PDF that will have the rest of the attachments, if any.
	var fullHTML = '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\"><pdfset><pdf>' + vcbHTML + '</pdf>';
	
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('internalid', null,'is',vcbRec.getId());
	//filters[filters.length] = new nlobjSearchFilter('documentsize', 'file', 'lessthanorequalto', 5000);
	
	//Attach all accceptable image types 
	var fileResults = nlapiSearchRecord(vcbRec.getRecordType(), null, filters, [new nlobjSearchColumn('name', 'file'), 
	                                                                            new nlobjSearchColumn('internalid', 'file'), 
	                                                                            new nlobjSearchColumn('url', 'file'),
	                                                                            new nlobjSearchColumn('documentsize', 'file').setSort()]);
	var pdfFilesToSetBack = [];
	var fileTotalSize = 0;
	if (fileResults != null)
	{
		//File type constants for acceptable file extensions.
		var imageFileTypes = ['PNG', 'JPEG', 'JPG', 'GIF', 'PBM', 'PGM', 'TIFF'];
		var otherFileTypes = ['PDF'];
		
		for (var i = 0; i < fileResults.length; i++)
		{
			//See if the file extension is one we can deal with.
			var fileName = fileResults[i].getValue('name', 'file') || '';
			var fileExt = fileName != '' ? fileName.substr(fileName.lastIndexOf('.')+1).toUpperCase() : '';
			var fileId = fileResults[i].getValue('internalid', 'file') || '';
			if (fileExt != '')
			{
				if (imageFileTypes.indexOf(fileExt) > -1) {
					if (fileTotalSize + parseFloat(fileResults[i].getValue('documentsize', 'file')) <= FILE_TOTAL_SIZE_LIMIT) {
						//Then add the file as an image using the base64 data
						fullHTML += '<pdf><body style="margin-top:.1cm"><img style="width:500px;height:300px;" src="data:image/' + fileExt.toLowerCase() + ';base64, ' + nlapiLoadFile(fileId).getValue() + '" /></body></pdf>';
						fileTotalSize += parseFloat(fileResults[i].getValue('documentsize', 'file'));
					}
					else
						break;
				} else if (otherFileTypes.indexOf(fileExt) > -1) {
					if (fileTotalSize + parseFloat(fileResults[i].getValue('documentsize', 'file')) <= FILE_TOTAL_SIZE_LIMIT) {
						//Then add the file as a PDF. It must be set to be available without login, so set that if it isn't already
						var curFile = nlapiLoadFile(fileId);
						curFile.setIsOnline(true);
						nlapiSubmitFile(curFile);
						pdfFilesToSetBack.push(fileId);
						
						fullHTML += '<pdf src="' + ConvertNSFieldToString(fileResults[i].getValue('url', 'file')) + '" />';
						fileTotalSize += parseFloat(fileResults[i].getValue('documentsize', 'file'));
					}
					else
						break;
				}
			}
		}
	}
	//Convert the file to an nlobjFile
	var finalFile = nlapiXMLToPDF(fullHTML + '</pdfset>');
	finalFile.setName('VCB #' + vcbRec.getId() + '.pdf');
	//Reset all of the files to not be available without login.
	for (var i = 0; i < pdfFilesToSetBack.length; i++)
	{
		var curFile = nlapiLoadFile(pdfFilesToSetBack[i]);
		curFile.setIsOnline(false);
		nlapiSubmitFile(curFile);
	}
	
	//Return the file
	return finalFile;
}
