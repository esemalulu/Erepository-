/**
 * GD implementation for the SRV SWO Printout
 * 
 * @NApiVersion 2.x
 * @NScriptType PluginTypeImpl
 * @NModuleScope SameAccount
 */
var SRV_OPLINE_SUBLIST = 'recmachcustrecordsrv_opline_swo';
var SRV_PARTLINE_SUBLIST = 'recmachcustrecordsrv_partline_swo';
define(['N/record', 'N/search', 'N/runtime', 'N/file', '/.bundle/159149/SRV_Constants', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Preferences', 'SuiteScripts/SSLib/2.x/SSLib_URL'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, runtime, file, SRV_Constants, SSLib_Util, SSLib_Prefs, SSLib_URL) {
	
	/**
	 * Pass in a list of Service Work Order Ids. Get HTML back to print.
	 */
	function getHTMLForServiceWorkOrders(swoIds, paymentType) {
		var finalHTML = '';
		for (var i = 0; i < swoIds.length; i++) {
			finalHTML += getHTMLForWorkOrder(swoIds[i], paymentType);
		}
		return finalHTML;
	}
	
	/**
	 * Returns the HTML for a single Service Work Order.
	 */
	function getHTMLForWorkOrder(swoId, paymentType) {
		var swoRec = record.load({type: 'customrecordsrv_serviceworkorder', id: swoId});

		return '<head>' +
					'<macrolist>' +
						'<macro id="nlheader">'
							+ getSWOHeader(swoRec)
						+ '</macro>' +
					'</macrolist>' +
					'<style>' +
						'.pagehead {font-weight:bold; font-size:20px; align:right; width:45%;} ' +
						'.ophead {font-weight:bold; background-color:#BABABA;} ' +
						'.alignright {align: right} ' +
						'.smalltable {cellpadding:0px} ' +
						'.smallhead {font-weight:bold; font-size:10px;} ' +
						'.optable {table-layout:fixed; width:668px; padding-top:20px; cellborder:1px solid black;} ' +
						'.parttable {font-size:10px; table-layout:fixed; width:620px; margin-left:50px; margin-top:3px; } ' +
						'.parthead {font-weight:bold; background-color:#EBEBEB; font-size:10px;} ' +
						'.infocell {width: 20%; display:none;} ' +
						'.disclaimer {align:center; font-size:9px; font-style:italic; } ' +
						'table {width: 100%;} ' +
					'</style>' +
					'<macrolist>' +
						'<macro id="disclaimerfooter">' +
							'<p class="disclaimer">Pricing subject to change based upon availability and current pricing. Quote is valid for 30 days from date of origination.</p>' +
						'</macro>' +
					'</macrolist>' +
				'</head>' +
				'<body header="nlheader" header-height="9%" footer="disclaimerfooter" footer-height="0.1in" style="font-family:Verdana, Arial, Sans-serif;font-size:11px;margin-left:.1cm;margin-right:.1cm; margin-top:-.5cm">'
//					 + getSWOHeader(swoRec)
					 + getSWOBodyInfo(swoRec)
					 + getSWOLineInfo(swoRec, paymentType)
					 + getSWOTotals(swoRec, paymentType)
				+ '</body>';
	}
	
	/**
	 * Returns the SWO Header information along with the company logo and address.
	 */
	function getSWOHeader(swoRec) {
        var fileId = runtime.getCurrentScript().getParameter({name: 'custscriptgd_companyprintoutlogo'});
        var imageFile = file.load({id: fileId});
        var imageValue = imageFile.getContents();
		//Return the HTML.
		return '<table>' +
		'<tr>' +
        	'<td width="20%"><img style="height:45px;width:150px;" src="data:image/jpg;base64,' + imageValue + '" /></td>' +
			'<td class="pagehead">Service Workorder #' + swoRec.getValue({fieldId: 'name'}) + '</td>' +
			'<td rowspan="2" width="35%" align="right"><p align="right" style="padding-bottom: 0px;">Page <pagenumber/></p><br/>' + SSLib_Prefs.getCompanyMainAddress(false, false) + '</td>' +
		'</tr>' +
		'</table>';
	}
	
	/**
	 * Returns HTML for the SWO that describes the body fields on the SWO.
	 */
	function getSWOBodyInfo(swoRec) {
		//Get the model ID instead of the full name
		var unitModel = search.lookupFields({type:'item', id: swoRec.getValue({fieldId:'custrecordsrv_swo_unitmodel'}), columns:['itemid', 'custitemrvsmodelyear']});
		var unitFields = search.lookupFields({type:'customrecordrvsunit',id:swoRec.getValue({fieldId:'custrecordsrv_swo_unit'}), columns:['custrecordunit_actualofflinedate', 'custrecordunit_retailpurchaseddate']});
		
		//Get the unit retail customer information. This may not be set.
		var urcId = SSLib_Util.convertNSFieldToString(swoRec.getValue({fieldId:'custrecordsrv_swo_unitretailcust'}));
		var urcAddr1 = '';
		var urcAddr2 = '';
		var urcCity = '';
		var urcState = '';
		var urcZip = '';
		if (urcId.length > 0) {
			var urcFields = search.lookupFields({type: 'customrecordrvsunitretailcustomer', id: urcId, columns:['custrecordunitretailcustomer_address1', 'custrecordunitretailcustomer_address2', 'custrecordunitretailcustomer_city', 'custrecordunitretailcustomer_state', 'custrecordunitretailcustomer_zipcode']});
			urcAddr1 = urcFields.custrecordunitretailcustomer_address1;
			urcAddr2 = urcFields.custrecordunitretailcustomer_address2;
			urcCity = urcFields.custrecordunitretailcustomer_city;
			urcState = urcFields.custrecordunitretailcustomer_state[0].text;
			urcZip = urcFields.custrecordunitretailcustomer_zipcode;
		}
		
		//Create 5 columns that are 20% of the total width. Then use colspan to determine the width of the row.
		return '<table cellborder="1px solid black" style="padding-bottom:10px; padding-top:10px">' +
				'<tr><td class="infocell"></td><td class="infocell"></td><td class="infocell"></td><td class="infocell"></td><td class="infocell"></td></tr>' +
				'<tr>' +
					'<td colspan="3"><table class="smalltable"><tr><td class="smallhead">Name</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_unitretailcust'})) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Date Received</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_arriveddate'})) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Date Returned</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_completedate'})) + '</td></tr></table></td>' +
				'</tr>' +
				'<tr>' +
					'<td colspan="3"><table class="smalltable"><tr><td class="smallhead">Address</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(urcAddr1 + urcAddr2) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">DOP</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(unitFields.custrecordunit_retailpurchaseddate) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">DOM</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(unitFields.custrecordunit_actualofflinedate) + '</td></tr></table></td>' +
				'</tr>' +
				'<tr>' +
					'<td><table class="smalltable"><tr><td class="smallhead">City</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(urcCity) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">State</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(urcState) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Zip</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(urcZip) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Customer Order #</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getValue({fieldId: 'custrecordsrv_swo_custordernum'})) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Written By</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_orderwrittenby'})) + '</td></tr></table></td>' +
				'</tr>' +
				'<tr>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Phone</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getValue({fieldId: 'custrecordsrv_swo_retailcustphone'})) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Transportation Method</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_deliverymethod'})) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Transportation Company</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getValue({fieldId: 'custrecordsrv_swo_transpocompany'})) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Outsourced</td></tr><tr><td>' + (swoRec.getValue({fieldId: 'custrecordsrv_swo_isoutsourced'}) ? 'Yes' : 'No') + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Outsourced Company</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_outsourcedcompany'})) + '</td></tr></table></td>' +
				'</tr>' +
				'<tr>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Year</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(unitModel.custitemrvsmodelyear[0].text) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Make</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_unitseries'})) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Model</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(unitModel.itemid) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">VIN</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_unit'})) + '</td></tr></table></td>' +
					'<td><table class="smalltable"><tr><td class="smallhead">Unit Location</td></tr><tr><td>' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_gdunitlocation'})) + '</td></tr></table></td>' +
				'</tr>' +
				'</table>';
	}
	
	/**
	 * Returns HTML for the operation lines and their part lines
	 */
	function getSWOLineInfo(swoRec, paymentType) {
		var returnHTML = '';
		for (var i = 0; i < swoRec.getLineCount({sublistId: SRV_OPLINE_SUBLIST}); i++) {
			//Make sure we want to add this line
			var curPayType = SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_paymenttype', line: i}));
			if (paymentType.length > 0 && curPayType != paymentType) continue;
			
			//Add the operation line information.
			returnHTML += '<table class="optable">' +
							'<tr>' +
								'<td class="ophead" width="80px">Payment Type</td>' +
								'<td class="ophead" width="210px">Flat Rate Code</td>' +
								'<td class="ophead" width="114px">Notes</td>' +
								'<td class="ophead" width="114px">Tech Info</td>' + 
								'<td class="ophead alignright" width="75px">Labor Amt</td>' + 
								'<td class="ophead alignright" width="75px">Sublet Amt</td>' +
							'</tr>' +
							'<tr>' +
								'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_paymenttype', line: i})) + '</td>' +
								'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_code', line: i})) + '</td>' +
								'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_notes', line: i})) + '</td>' +
								'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_techinfo', line: i})) + '</td>' +
								'<td class="alignright">$' + SSLib_Util.convertNSFieldToFloat(swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_amt', line: i})).toFixed(2) + '</td>' +
								'<td class="alignright">$' + SSLib_Util.convertNSFieldToFloat(swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_subletamt', line: i})).toFixed(2) + '</td>' +
							'</tr></table>';
		
			//Build the part box for this operation line. Include any parts that correspond to this line.
			var curOpId = swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'id', line: i});
			var partHTML = '';
			for (var j = 0; j < swoRec.getLineCount({sublistId: SRV_PARTLINE_SUBLIST}); j++) {
				if (swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_opline', line: j}) == curOpId) {
					if (partHTML.length == 0) {
						//Add the initial table HTML. We don't do this outside the loop b/c we only want to show headers if there is data.
						partHTML +=  '<table class="parttable">' +
										'<tr>' +
											'<td class="parthead" width="185px">Item</td>' +
											'<td class="parthead" width="210px">Description</td>' +
											'<td class="parthead" width="75px">Qty</td>' +
											'<td class="parthead" width="75px">Is VCB?</td>' +
											'<td class="parthead alignright" width="75px">Amount</td>' + 
										'</tr>';
					}
					
					partHTML += '<tr>' +
									'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_item', line: j})) + '</td>' +
									'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_desc', line: j})) + '</td>' +
									'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_qty', line: j})) + '</td>' + 
									'<td>' + (swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_isvcb', line: j}) ? 'Yes' : 'No') + '</td>' +
									'<td class="alignright">$' + SSLib_Util.convertNSFieldToFloat(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_amt', line: j})).toFixed(2) + '</td>' + 
								'</tr>';
				}
			}
			if (partHTML.length > 0)
				returnHTML += partHTML + '</table>';
		}
		
		return returnHTML;
	}
	
	/**
	 * Returns HTML for the totals information of the Service Work Order.
	 * We can't use the fields stored on the record b/c we might not want all payment types.
	 */
	function getSWOTotals(swoRec, paymentType) {
		var labor = 0;
		var sublet = 0;
		var parts = 0;
		var warrTotal = 0;
		var custTotal = 0;
		for (var i = 0; i < swoRec.getLineCount({sublistId: SRV_OPLINE_SUBLIST}); i++) {
			//Make sure we want to add this line
			var curPayType = SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_paymenttype', line: i}));
			if (paymentType.length > 0 && curPayType != paymentType) continue;
			
			//Add the sublet and labor totals to the total.
			var curLabor = SSLib_Util.convertNSFieldToFloat(swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_amt', line: i}));
			var curSublet = SSLib_Util.convertNSFieldToFloat(swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_subletamt', line: i}));
			labor += curLabor;
			sublet += curSublet;
			if (curPayType == SRV_Constants.SRV_PAYMENTTYPE_WARRANTY || curPayType == SRV_Constants.SRV_PAYMENTTYPE_GOODWILL) {
				warrTotal += curLabor + curSublet;
			}
			else {
				custTotal += curLabor + curSublet;
			}
			
		
			//Build the part box for this operation line. Include any parts that correspond to this line.
			var curOpId = swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'id', line: i});
			for (var j = 0; j < swoRec.getLineCount({sublistId: SRV_PARTLINE_SUBLIST}); j++) {
				if (swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_opline', line: j}) == curOpId) {
						var curParts = SSLib_Util.convertNSFieldToFloat(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_amt', line: j}));
						parts += curParts;
						//Add the parts to the total.
						if (curPayType == SRV_Constants.SRV_PAYMENTTYPE_WARRANTY || curPayType == SRV_Constants.SRV_PAYMENTTYPE_GOODWILL) {
							warrTotal += curParts;
						}
						else {
							custTotal += curParts;
						}
				}
			}
		}
		
		//Return HTML depending on the payment type.		
		return '<table style="padding-top:10px;">' +
					'<tr><td width="70%"></td><td width="20%"></td><td width="10%"></td></tr>' +
					'<tr>' +
						'<td></td>' +
						'<td style="font-weight:bold" align="center">Totals</td>' +
						'<td></td>' +
					'</tr>' +
					'<tr>' +
						'<td></td>' +
						'<td class="ophead" align="center">Total Labor</td>' +
						'<td align="right">$' + labor.toFixed(2) + '</td>' +
					'</tr>' +
					'<tr>' +
						'<td></td>' +
						'<td class="ophead" align="center">Sublet Repairs</td>' +
						'<td align="right">$' + sublet.toFixed(2) + '</td>' +
					'</tr>' +
					'<tr>' +
						'<td></td>' +
						'<td class="ophead" align="center">Total Parts</td>' +
						'<td align="right">$' + parts.toFixed(2) + '</td>' +
					'</tr>' +
					'<tr>' +
						'<td></td>' +
						'<td class="ophead" align="center">7% Sales Tax</td>' +
						'<td align="right">$' + (parts * .07).toFixed(2) + '</td>' +
					'</tr>' +
					//Only return warranty totals if payment type is warranty
					(paymentType.length == 0 || (paymentType == SRV_Constants.SRV_PAYMENTTYPE_WARRANTY || paymentType == SRV_Constants.SRV_PAYMENTTYPE_GOODWILL) ?
						'<tr>' +
							'<td></td>' +
							'<td class="ophead" align="center">Warranty Pays</td>' +
							'<td align="right">$' + warrTotal.toFixed(2) + '</td>' +
						'</tr>' : '') +
					(paymentType.length == 0 || (paymentType == SRV_Constants.SRV_PAYMENTTYPE_CUSTOMER || paymentType == SRV_Constants.SRV_PAYMENTTYPE_INSURANCE) ?
						'<tr>' +
							'<td></td>' +
							'<td class="ophead" align="center">' + (paymentType == SRV_Constants.SRV_PAYMENTTYPE_INSURANCE ? 'Insurance' : 'Customer') + ' Pays</td>' +
							'<td align="right">$' + (custTotal + parts * .07).toFixed(2) + '</td>' +
						'</tr>' : '') +
					'</table>';
	}
	
    return {
    	getHTMLForServiceWorkOrders: getHTMLForServiceWorkOrders
    };
    
});
