/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/redirect', 'N/ui/serverWidget', 'SuiteScripts/SSLib/2.x/SSLib_File', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'N/format', 'N/search'],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 */
function(record, redirect, serverWidget, SSLib_File, SSLib_Util, format, search) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	//Load the PCN and generate the HTML
    	var unitRec = record.load({type: 'customrecordrvsunit', id: context.request.parameters.custparam_unitid});
    	var html = getUnitRecordHTML(unitRec);
    	
    	//Print it
    	SSLib_File.printFileInSuitelet(context, 'Unit #' + unitRec.getValue({fieldId: 'name'}) + '.pdf', html, SSLib_File.SSFileTypes.PDF);
    }

    function getUnitRecordHTML(unitRec) {
    	return '<head>' +
					'<style>' +
						'.sectionhead {font-weight:bold; font-size:12px;} ' +
						'.tophead {font-weight:bold; width:1%; white-space:nowrap;} ' +
						'.internalhead {font-weight:bold; margin:1px; background-color:#BABABA; width:1%; white-space:nowrap;} ' +
						'.tablehead {font-weight:bold; background-color:#EBEBEB; width:1%; white-space:nowrap;} ' +
						'.smalltabledata {font-size:10px;} ' +
					'</style>' +
				'</head>' +
				'<body style="font-family:Verdana, Arial, Sans-serif;font-size:12px;margin-left:.1cm;margin-right:.1cm; size:Letter-landscape;">' +
					'<table width="100%">' +
						'<tr>' +
							'<td colspan="100" align="left" style="font-size:20px">' +
								'<b>Unit: ' + SSLib_Util.convertNSFieldToString(unitRec.getValue({fieldId: 'name'})) + '</b>' +
							'</td>' + 
						'</tr>' +
						'<tr>' +
							'<td colspan="50">' + getUnitPrimaryInformation(unitRec) + '</td><td colspan="50">' + getUnitDetailInformation(unitRec) + '</td>' +
						'</tr>' +
					'</table>'
					 + getRetailCustomerInformation(unitRec)
					 + getWarrantyHistory(unitRec)
					 + getCases(unitRec)
				+ '</body>';
    }
    
    /**
	 * Generates the title and the Primary information for the printout.
	 */
	function getUnitPrimaryInformation(unitRec)
	{
		return '<table width="100%">' +
		'<tr style="margin-top: 10px">' + 
			'<td colspan="50" style="font-size:15px"><i>Primary Information</i></td>' +
		'</tr>' +
		'<tr style="margin-top: 3px">' +
			'<td colspan="2" class="tophead">Serial:</td><td colspan="48" align="left">' + SSLib_Util.convertNSFieldToString(unitRec.getText({fieldId: 'custrecordunit_serialnumber'})) + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="2" class="tophead">Dealer:</td><td colspan="48" align="left">' + SSLib_Util.convertNSFieldToString(unitRec.getText({fieldId: 'custrecordunit_dealer'})) + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="2" class="tophead">Series:</td><td colspan="48" align="left">' + SSLib_Util.convertNSFieldToString(unitRec.getText({fieldId: 'custrecordunit_series'})) + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="2" class="tophead">Model:</td><td colspan="48" align="left">' + SSLib_Util.convertNSFieldToString(unitRec.getText({fieldId: 'custrecordunit_model'})) + '</td>' +
		'</tr>' +
		'<tr>' +
		'<td colspan="2" class="tophead">Decor:</td><td colspan="48" align="left">' + SSLib_Util.convertNSFieldToString(unitRec.getText({fieldId: 'custrecordunit_decor'})) + '</td>' +
		'</tr>' +
		'</table>';
	}

	/**
	 * Generates the Detail Information section for the printout.
	 */
	function getUnitDetailInformation(unitRec)
	{
		return '<table width="100%">' +
		'<tr style="margin-top: 10px">' + 
			'<td colspan="50" style="font-size:15px"><i>Detail Information</i></td>' +
		'</tr>' +
		'<tr style="margin-top: 3px">' +
			'<td colspan="8" class="tophead">Order Date:</td><td colspan="42" align="left" width="60%">' + (unitRec.getValue({fieldId: 'custrecordunit_orderdate'}) || '' != '' ? SSLib_Util.convertNSFieldToString(format.format({value: unitRec.getValue({fieldId: 'custrecordunit_orderdate'}), type: format.Type.DATE})) : '') + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="8" class="tophead">Online Date:</td><td colspan="42" align="left" width="60%">' + (unitRec.getValue({fieldId: 'custrecordunit_onlinedate'}) || '' != '' ? SSLib_Util.convertNSFieldToString(format.format({value: unitRec.getValue({fieldId: 'custrecordunit_onlinedate'}), type: format.Type.DATE})) : '') + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="8" class="tophead">Ship Date:</td><td colspan="42" align="left" width="60%">' + (unitRec.getValue({fieldId: 'custrecordunit_shipdate'}) || '' != '' ? SSLib_Util.convertNSFieldToString(format.format({value: unitRec.getValue({fieldId: 'custrecordunit_shipdate'}), type: format.Type.DATE})) : '') + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="8" class="tophead">Retail Sold Date:</td><td colspan="42" align="left" width="60%">' + (unitRec.getValue({fieldId: 'custrecordunit_retailpurchaseddate'}) || '' != '' ? SSLib_Util.convertNSFieldToString(format.format({value: unitRec.getValue({fieldId: 'custrecordunit_retailpurchaseddate'}), type: format.Type.DATE})) : '') + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="8" class="tophead">Warranty Expiration Date:</td><td colspan="42" align="left" width="60%">' + (unitRec.getValue({fieldId: 'custrecordunit_warrantyexpirationdate'}) || '' != '' ? SSLib_Util.convertNSFieldToString(format.format({value: unitRec.getValue({fieldId: 'custrecordunit_warrantyexpirationdate'}), type: format.Type.DATE})) : '') + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="8" class="tophead">Extended Warranty Expiration Date:</td><td colspan="42" align="left" width="60%">' + (unitRec.getValue({fieldId: 'custrecordunit_extendedwarrantyexp'}) || '' != '' ? SSLib_Util.convertNSFieldToString(format.format({value: unitRec.getValue({fieldId: 'custrecordunit_extendedwarrantyexp'}), type: format.Type.DATE})) : '') + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="8" class="tophead">No Warranty Available:</td><td colspan="42" align="left" width="60%">' + (SSLib_Util.convertNSFieldToString(unitRec.getText({fieldId: 'custrecordnowarranty'})) == 'T' ? 'Yes' : 'No') + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td colspan="8" class="tophead">Sales Rep:</td><td colspan="42" align="left" width="60%">' + SSLib_Util.convertNSFieldToString(unitRec.getText({fieldId: 'custrecordunit_salesrep'})) + '</td>' +
		'</tr>' +
		'</table>';
	}

	/**
	 * Generates the Retail Customer Information section for the printout.
	 */
	function getRetailCustomerInformation(unitRec)
	{
		var unitRetailCustomerTable = '<table width="100%">' +
										 '<tr>' +
										 	'<td class="internalhead">Name</td>' +
										 	'<td class="internalhead">Phone #</td>' +
										 	'<td class="internalhead">Cellphone #</td>' +
										 	'<td class="internalhead">Email</td>' +
										'</tr>';
		
		var unitRetailCustomerPagedData = search.create({
			type:		'customrecordrvsunitretailcustomer',
			filters:	[['custrecordunitretailcustomer_unit', 'anyof', unitRec.id]],
			columns:	[search.createColumn({name: 'name'}),
			        	 search.createColumn({name: 'custrecordunitretailcustomer_phone'}),
			        	 search.createColumn({name: 'custrecordunitretailcustomer_cellphone'}),
			        	 search.createColumn({name: 'custrecordunitretailcustomer_email'})]
		}).runPaged();
		unitRetailCustomerPagedData.pageRanges.forEach(function(pageRange) {
			unitRetailCustomerPagedData.fetch({index: pageRange.index}).data.forEach(function(result) {
				unitRetailCustomerTable += '<tr>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'name'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordunitretailcustomer_phone'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordunitretailcustomer_cellphone'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordunitretailcustomer_email'})) + '</td>' +
			'</tr>';
			});
		});
		
		unitRetailCustomerTable  += '</table>';
		
		return '<table style="margin-top: 10px" width="100%">' +
		'<tr><td class="sectionhead">Retail Customer Information</td></tr>' +
		'<tr><td>' + unitRetailCustomerTable + '</td></tr>' +
		'</table>';
	}
	
	/**
	 * Generates the Warranty History for the printout.
	 */
	function getWarrantyHistory(unitRec)
	{	
		var preAuthDataObject = getPreAuths(unitRec);
		var claimDataObject = getClaims(unitRec);
		
		return '<table width="100%">' +
		'<tr style="margin-top: 10px">' + 
			'<td colspan="8" style="font-size:15px"><i>Warranty History</i></td>' +
		'</tr>' +
		'</table>' +
		preAuthDataObject.preAuthTable +
		claimDataObject.claimTable + 
		getPreAuthsFlatRateCodes(preAuthDataObject.preAuthIdArray) + 
		getClaimFlatRateCodes(claimDataObject.claimIdArray);
		
	}
	
	/**
	 * Generates the Pre-Auths information table for the printout.
	 */
	function getPreAuths(unitRec)
	{
		var preAuthIdArray = new Array();
		var preAuthTable = '<table width="100%">' +
								'<tr>' +
									'<td class="sectionhead" style="margin-top: 3px">Pre-Auths</td></tr>' +
								'<tr>' +
									'<td class="internalhead">Pre-Auth #</td>' +
								 	'<td class="internalhead">Dealer</td>' +
								 	'<td class="internalhead">Requestor</td>' +
								 	'<td class="internalhead">Requestor Email Address</td>' +
								 	'<td class="internalhead">Return Fax #</td>' +
								 	'<td class="internalhead">Series</td>' +
								 	'<td class="internalhead">Model</td>' +
								 	'<td class="internalhead">Decor</td>' +
								 	'<td class="internalhead">Retail Purchase Date</td>' +
								 	'<td class="internalhead">Status</td>' +
								 	'<td class="internalhead">Manufacturer Notes</td>' +
								 	'<td class="internalhead">Date Created</td>' +
								'</tr>';

		var preAuthPagedData = search.create({
			type:		'customrecordrvspreauthorization',
			filters:	[['custrecordpreauth_unit', 'anyof', unitRec.id]],
			columns:	[search.createColumn({name: 'internalid'}),
			        	 search.createColumn({name: 'custrecordpreauth_customer'}),
			        	 search.createColumn({name: 'custrecordpreauth_requestor'}),
			        	 search.createColumn({name: 'custrecordpreauth_requestoremail'}),
			        	 search.createColumn({name: 'custrecordpreauth_returnfaxnumber'}),
			        	 search.createColumn({name: 'custrecordpreauth_series'}),
			        	 search.createColumn({name: 'custrecordpreauth_model'}),
			        	 search.createColumn({name: 'custrecordpreauth_decor'}),
			        	 search.createColumn({name: 'custrecordpreauth_retailpurchasedate'}),
			        	 search.createColumn({name: 'custrecordpreauth_status'}),
			        	 search.createColumn({name: 'custrecordpreauth_notes'}),
			        	 search.createColumn({name: 'created'})]
		}).runPaged();
		preAuthPagedData.pageRanges.forEach(function(pageRange) {
			preAuthPagedData.fetch({index: pageRange.index}).data.forEach(function(result) {
				preAuthIdArray.push(result.getValue({name: 'internalid'}));
				preAuthTable += '<tr>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'internalid'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getText({name: 'custrecordpreauth_customer'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getText({name: 'custrecordpreauth_requestor'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauth_requestoremail'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauth_returnfaxnumber'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauth_series'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauth_model'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauth_decor'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauth_retailpurchasedate'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getText({name: 'custrecordpreauth_status'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauth_notes'})) + '</td>' +
								 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'created'})) + '</td>' +
								'</tr>';
			});
		});
		
		preAuthTable  += '</table>';
		
		var object = new Object();
		object.preAuthTable = preAuthTable;
		object.preAuthIdArray = preAuthIdArray;
		return object;
	}
	
	/**
	 * Generates the Claims information table for the printout.
	 */
	function getClaims(unitRec)
	{
		var claimIdArray = new Array();
		var claimTable = '<table width="100%">' +
							'<tr>' +
								'<td class="sectionhead" style="margin-top: 10px">Claims</td></tr>' +
							'<tr>' +
							 	'<td class="internalhead">Claim #</td>' +
							 	'<td class="internalhead">Dealer</td>' +
							 	'<td class="internalhead">Requestor</td>' +
							 	'<td class="internalhead">Retail Customer Name</td>' +
							 	'<td class="internalhead">Pre-Authorization</td>' +
							 	'<td class="internalhead">Unit Serial #</td>' +
							 	'<td class="internalhead">Model #</td>' +
							 	'<td class="internalhead">Claim Total</td>' +
							 	'<td class="internalhead">Status</td>' +
							 	'<td class="internalhead">Date Created</td>' +
							'</tr>';
		
		var unitRetailCustomerPagedData = search.create({
			type:		'customrecordrvsclaim',
			filters:	[['custrecordclaim_unit', 'anyof', unitRec.id]],
			columns:	[search.createColumn({name: 'internalid'}),
			        	 search.createColumn({name: 'custrecordclaim_customer'}),
			        	 search.createColumn({name: 'custrecordclaim_requestor'}),
			        	 search.createColumn({name: 'custrecordclaim_retailcustomername'}),
			        	 search.createColumn({name: 'custrecordclaim_preauthorization'}),
			        	 search.createColumn({name: 'custrecordclaim_unitserialnumber'}),
			        	 search.createColumn({name: 'custrecordclaim_unitmodel'}),
			        	 search.createColumn({name: 'custrecordclaim_claimtotal'}),
			        	 search.createColumn({name: 'custrecordclaim_status'}),
			        	 search.createColumn({name: 'created'})]
		}).runPaged();
		unitRetailCustomerPagedData.pageRanges.forEach(function(pageRange) {
			unitRetailCustomerPagedData.fetch({index: pageRange.index}).data.forEach(function(result) {
				claimIdArray.push(result.getValue({name: 'internalid'}));
				claimTable += '<tr>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'internalid'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getText({name: 'custrecordclaim_customer'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getText({name: 'custrecordclaim_requestor'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordclaim_retailcustomername'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordclaim_preauthorization'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordclaim_unitserialnumber'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getText({name: 'custrecordclaim_unitmodel'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordclaim_claimtotal'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getText({name: 'custrecordclaim_status'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'created'})) + '</td>' +
			'</tr>';
			});
		});
		
		claimTable  += '</table>';
		
		var object = new Object();
		object.claimTable = claimTable;
		object.claimIdArray = claimIdArray;
		return object;
	}
	
	/**
	 * Generates the Pre-Auths Flat Rate Codes information table for the printout.
	 */
	function getPreAuthsFlatRateCodes(preAuthIdArray)
	{
		var preAuthFlatRateCodeTable = '<table width="100%">' +
										'<tr>' +
											'<td class="sectionhead" style="margin-top: 10px">Pre-Auths Flat Rate Codes</td></tr>' +
										'<tr>' +
										 	'<td class="internalhead">Flat Rate Code</td>' +
										 	'<td class="internalhead">Description</td>' +
										 	'<td class="internalhead">Pre-Auth</td>' +
										'</tr>';
		
		if (preAuthIdArray && preAuthIdArray.length > 0) {
			var unitRetailCustomerPagedData = search.create({
				type:		'customrecordrvspreauthoperationline',
				filters:	[['custrecordpreauthopline_preauth', 'anyof', preAuthIdArray]],
				columns:	[search.createColumn({name: 'custrecordpreauthopline_flatratecode'}),
				        	 search.createColumn({name: 'altname', join: 'custrecordpreauthopline_flatratecode'}),
				        	 search.createColumn({name: 'custrecordgdflatratecode_description', join: 'custrecordpreauthopline_flatratecode'}),
				        	 search.createColumn({name: 'custrecordpreauthopline_preauth'})]
			}).runPaged();
			unitRetailCustomerPagedData.pageRanges.forEach(function(pageRange) {
				unitRetailCustomerPagedData.fetch({index: pageRange.index}).data.forEach(function(result) {
						preAuthFlatRateCodeTable += '<tr>' +
													 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauthopline_flatratecode'})) + '</td>' +
													 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'altname', join: 'custrecordpreauthopline_flatratecode'})) + ' ' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordgdflatratecode_description', join: 'custrecordpreauthopline_flatratecode'})) + '</td>' +
													 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordpreauthopline_preauth'})) + '</td>' +
													'</tr>';
				});
			});
		}
		
		preAuthFlatRateCodeTable  += '</table>';
		
		return preAuthFlatRateCodeTable;
	}

	/**
	 * Generates the Claim Flat Rate Codes information table for the printout.
	 */
	function getClaimFlatRateCodes(claimIdArray)
	{
		var claimFlatRateCodeTable = '<table width="100%">' +
										'<tr>' +
											'<td class="sectionhead" style="margin-top: 10px">Claims Flat Rate Codes</td></tr>' +
										'<tr>' +
										 	'<td class="internalhead">Flat Rate Code</td>' +
										 	'<td class="internalhead">Description</td>' +
										 	'<td class="internalhead">Claim</td>' +
										'</tr>';
		
		if (claimIdArray && claimIdArray.length > 0) {
			var unitRetailCustomerPagedData = search.create({
				type:		'customrecordrvsclaimoperationline',
				filters:	[['custrecordclaimoperationline_claim', 'anyof', claimIdArray]],
				columns:	[search.createColumn({name: 'custrecordclaimoperationline_flatratecod'}),
				        	 search.createColumn({name: 'altname', join: 'custrecordclaimoperationline_flatratecod'}),
				        	 search.createColumn({name: 'custrecordgdflatratecode_description', join: 'custrecordclaimoperationline_flatratecod'}),
				        	 search.createColumn({name: 'custrecordclaimoperationline_claim'})]
			}).runPaged();
			unitRetailCustomerPagedData.pageRanges.forEach(function(pageRange) {
				unitRetailCustomerPagedData.fetch({index: pageRange.index}).data.forEach(function(result) {
					claimFlatRateCodeTable += '<tr>' +
				 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordclaimoperationline_flatratecod'})) + '</td>' +
				 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'altname', join: 'custrecordclaimoperationline_flatratecod'})) + ' ' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordgdflatratecode_description', join: 'custrecordclaimoperationline_flatratecod'})) + '</td>' +
				 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custrecordclaimoperationline_claim'})) + '</td>' +
				'</tr>';
				});
			});
		}
		
		claimFlatRateCodeTable  += '</table>';
		
		return claimFlatRateCodeTable;
	}
	
	/*
	 * Generate the cases attached to the unit record as a table for the printout
	 */
	function getCases(unitRec) {
		var casesTable = '<table width="100%">' +
										'<tr>' +
											'<td class="sectionhead" style="margin-top: 10px">Cases</td></tr>' +
										'<tr>' +
										 	'<td class="internalhead">Number</td>' +
										 	'<td class="internalhead">Subject</td>' +
										 	'<td class="internalhead">Status</td>' +
										 	'<td class="internalhead">Created By</td>' +
										 	'<td class="internalhead">Date Created</td>' +
										 	'<td class="internalhead">Last Modified</td>' +
										 	'<td class="internalhead">Last Msg Date</td>' +
										 	'<td class="internalhead">Date Closed</td>' +
										 	'<td class="internalhead">Last Reopened</td>' +
										'</tr>';
		
		var casesPagedData = search.create({
			type:		'supportcase',
			filters:	[['custeventgd_vinnumber', 'anyof', unitRec.id]],
			columns:	[search.createColumn({name: 'casenumber'}),
			        	 search.createColumn({name: 'title'}),
			        	 search.createColumn({name: 'status'}),
			        	 search.createColumn({name: 'custeventgd_createdby'}),
			        	 search.createColumn({name: 'createddate'}),
			        	 search.createColumn({name: 'lastmodifieddate'}),
			        	 search.createColumn({name: 'lastmessagedate'}),
			        	 search.createColumn({name: 'closed'}),
			        	 search.createColumn({name: 'lastreopeneddate'})]
		}).runPaged();
		casesPagedData.pageRanges.forEach(function(pageRange) {
			casesPagedData.fetch({index: pageRange.index}).data.forEach(function(result) {
				casesTable += '<tr>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'casenumber'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'title'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getText({name: 'status'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'custeventgd_createdby'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'createddate'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'lastmodifieddate'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'lastmessagedate'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'closed'})) + '</td>' +
			 	'<td class="smalltabledata">' + SSLib_Util.convertNSFieldToString(result.getValue({name: 'lastreopeneddate'})) + '</td>' +
			'</tr>';
			});
		});
		
		casesTable  += '</table>';
		
		return casesTable;
	}
    
    return {
        onRequest: onRequest
    };
});
