/**
 * GD implementation for the SRV SWO Printout
 * 
 * @NApiVersion 2.x
 * @NScriptType PluginTypeImpl
 * @NModuleScope SameAccount
 */
var SRV_OPLINE_SUBLIST = 'recmachcustrecordsrv_opline_swo';
var SRV_PARTLINE_SUBLIST = 'recmachcustrecordsrv_partline_swo';
define(['N/record', 'N/search', 'N/format', 'N/runtime', 'N/file', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Preferences', 'SuiteScripts/SSLib/2.x/SSLib_URL'],
/**
 * @param {record} record
 * @param {search} search
 * @param {format} format
 */
function(record, search, format, runtime, file, SSLib_Util, SSLib_Prefs, SSLib_URL) {
	
	/**
	 * Pass in a list of Service Work Order Ids. Get HTML back to print.
	 */
	function getHTMLForTechWorkOrders(swoIds) {
		var finalHTML = '';
		for (var i = 0; i < swoIds.length; i++) {
			finalHTML += getHTMLForWorkOrder(swoIds[i]);
		}
		return finalHTML;
	}
	
	/**
	 * Returns the HTML for a single Service Work Order.
	 */
	function getHTMLForWorkOrder(swoId) {
		var swoRec = record.load({type: 'customrecordsrv_serviceworkorder', id: swoId});

		return '<head>' +
					'<macrolist>' +
						'<macro id="nlheader">'
							+ getSWOHeader(swoRec)
						+ '</macro>' +
					'</macrolist>' +
					'<style>' +
						'.pagehead {font-weight:bold; font-size:20px; align:right; width:45%;} ' +
						'.parttable {table-layout:fixed; width:925px; margin-left:50px; margin-top:3px; } ' +
						'.parthead {font-weight:bold; background-color:#C7C7C7;} ' +
						'.alignright {align: right} ' +
						'table {width: 100%;} ' +
					'</style>' +
				'</head>' +
				'<body header="nlheader" header-height="10%" style="font-family:Verdana, Arial, Sans-serif;font-size:12px;margin-left:.1cm;margin-right:.1cm;size:A4-landscape;align:left;">'
					 //+ getSWOHeader(swoRec)
					 + getSWOBodyInfo(swoRec)
					 + getSWOLineInfo(swoRec)
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
        	'<td rowspan="2" width="20%"><img style="height:60px;width:200px;" src="data:image/jpg;base64,' + imageValue + '" /></td>' +
			'<td class="pagehead">SERVICE WORK ORDER # ' + swoRec.id + '</td>' +
			'<td class="pagehead" width="35%" align="right">Date: ' + SSLib_Util.convertNSFieldToString(format.format({value: new Date(), type: format.Type.DATE})) + '</td>' +
		'</tr>' +
		'<tr>' +
			'<td class="pagehead"></td>' +
			'<td width="35%" align="right">Page <pagenumber/> of <totalpages/></td>' +
		'</tr>' +
		'</table>';
	}
	
	/**
	 * Returns HTML for the SWO that describes the body fields on the SWO.
	 */
	function getSWOBodyInfo(swoRec) {
		//Returns GD and Unit information.
		return '<table cellborder="1px solid black" style="padding-top:10px">' +
				'<tr>' +
					'<td rowspan="4" width="15%"><p>' + SSLib_Prefs.getCompanyMainAddress(false, false) + '</p></td>' +
					'<td>Unit: ' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_unit'})) + '</td>' +
					'<td>Series: ' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_unitseries'})) + '</td>' +
					'<td>Model: ' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_unitmodel'})) + '</td>' +
					'<td>Work Order #: ' + swoRec.id + '</td>' +
				'</tr>' +
				'<tr>' +
					'<td colspan="2">Dealer: ' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_dealer'})) + '</td>' +
					'<td>DOP: ' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_retailpurchdate'})) + '</td>' +
					'<td>DOM: ' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_dateofmanu'})) + '</td>' +
				'</tr>' +
          		'<tr>' +
					'<td colspan="2">Sub-Parts Order: ' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_warrpartsorder'})).substring(11) + '</td>' +
					'<td colspan="2">Customer Sub-Parts Order: ' + SSLib_Util.convertNSFieldToString(swoRec.getText({fieldId: 'custrecordsrv_swo_custpartsorder'})).substring(11) + '</td>' +
				'</tr>' +
				'<tr>' +
					'<td style="padding-bottom: 25px;" colspan="4">Notes: ' + SSLib_Util.convertNSFieldToString(swoRec.getValue({fieldId: 'custrecordsrv_swo_comments'})) + '</td>' +
				'</tr></table>';
	}
	
	/**
	 * Returns HTML for the operation lines and their part lines
	 */
	function getSWOLineInfo(swoRec) {
		var returnHTML = '';
		// Get the lines from the operation line sublist.
		var lines = [];
		for (var k = 0; k < swoRec.getLineCount({sublistId: SRV_OPLINE_SUBLIST}); k++) {
			lines.push({
				nsLine: k,
				opLine: swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_sortorder', line: k}),
			})
		}
		// Sort the lines by the opLine number.
		lines.sort(function(a, b) {
			return a.opLine - b.opLine;
		});
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i].nsLine;
			//Add the operation line information.
			//We need to get whether or not this operation line requires a part return.
			var partReturnReq = search.lookupFields({type:'customrecordrvsflatratecodes', id: swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_code', line: i}), columns: ['custrecordflatratecode_partreturn']}).custrecordflatratecode_partreturn[0].text;
			//Add the op line information. If it isn't the first op line then add a page break before the table. Else add some padding
			if(i != 0) returnHTML += '<pbr />'; 
			returnHTML += '<table cellborder="1px solid black" style="table-layout:fixed;' + (i == 0 ? 'padding-top:40px' : 'padding-top:5px') + '">' +
							'<tr>' +
								'<td style="width:40%;font-weight:bold;background-color:#BABABA">OPERATION LINE ' + (i) + '</td>' +
								'<td style="width:20%"></td>' +
								'<td style="width:20%"></td>' +
								'<td style="width:20%"></td>' +
							'</tr>' +
							'<tr>' +
								'<td colspan="2">Flat Rate: ' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_code', line: line})) + '</td>' +
								'<td colspan="2">Time: ' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_time', line: line})) + '</td>' +
							'</tr>' +
							'<tr>' +
								'<td style="padding-bottom: 35px;" colspan="4">Complaint: ' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_complaint', line: line})) + '</td>' +
							'</tr>' +
							'<tr>' +
								'<td colspan="4">Cause: ' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_cause', line: line})) + '</td>' +
							'</tr>' +
							'<tr>' +
								'<td style="padding-bottom: 35px;" colspan="4">Correction: ' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_correction', line: line})) + '</td>' +
							'</tr>' +
							'<tr>' +
								'<td style="padding-bottom: 35px;" colspan="4">Notes: ' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_notes', line: line})) + '</td>' +
							'</tr>' +
							'<tr>' +
								'<td>Part Return Req: '+SSLib_Util.convertNSFieldToString(partReturnReq)+'</td>' +
								'<td>Serial: ' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_serialnum', line: line})) + '</td>' +
								'<td>Model: ' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'custrecordsrv_opline_modelnum', line: line})) + '</td>' +
								'<td>Tech:</td>' +
							'</tr></table>';
			//Add the part line information for this op line.
			//Build the part box for this operation line. Include any parts that correspond to this line.
			var curOpId = swoRec.getSublistValue({sublistId: SRV_OPLINE_SUBLIST, fieldId: 'id', line: line});
			returnHTML += '<table cellborder="1px solid black" class="parttable">' +
							'<tr>' +
								'<td class="parthead" width="350px">Item</td>' +
								'<td class="parthead" width="350px">Description</td>' +
//								'<td class="parthead" width="350px">Notes</td>' +
								'<td class="parthead" width="75px">Qty</td>' +
								'<td class="parthead" width="75px">Is VCB?</td>' +
								'<td class="parthead alignright" width="75px">Amount</td>' + 
							'</tr>';
			var partNotes = '';
			for (var j = 0; j < swoRec.getLineCount({sublistId: SRV_PARTLINE_SUBLIST}); j++) {
				if (swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_opline', line: j}) == curOpId) {
					partNotes = SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_notes', line: j})) || '';
					if (partNotes != '')
						partNotes = '<br /><br />&nbsp;&nbsp;&nbsp;&nbsp;<b>Notes</b>: ' + partNotes || '';
					
					returnHTML += '<tr>' +
									'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistText({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_item', line: j})) + '</td>' +
									'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_desc', line: j})) + partNotes + '</td>' +
//									'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_notes', line: j})) + '</td>' +
									'<td>' + SSLib_Util.convertNSFieldToString(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_qty', line: j})) + '</td>' + 
									'<td>' + (swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_isvcb', line: j}) ? 'Yes' : 'No') + '</td>' +
									'<td class="alignright">$' + SSLib_Util.convertNSFieldToFloat(swoRec.getSublistValue({sublistId: SRV_PARTLINE_SUBLIST, fieldId: 'custrecordsrv_partline_amt', line: j})).toFixed(2) + '</td>' + 
								'</tr>';
				}
			}
			returnHTML += '</table>';
		}
		
		return returnHTML;
	}
	
    return {
    	getHTMLForTechWorkOrders: getHTMLForTechWorkOrders
    };
    
});
