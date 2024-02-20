/**
 * Suitelet page that shows PO's over 100K and who approved them.
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Oct 2017     Jacob Shetler
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function PO_ApprovalAuditReport_Suitelet(request, response)
{
	var form = nlapiCreateForm("PO's Over 100K with Approval Audit Report");
	
	if(request.getMethod() == 'GET')
	{
		// create a simple form with a date selector and a button to create the report
		form.addSubmitButton('Generate Report');
		form.addFieldGroup('custpage_mainfg', 'Select a date range and click "Generate Report." '+
				'The report will show POs that were approved or rejected within that date range').setSingleColumn(true);
		startField = form.addField('custpage_startdate', 'date', 'Start Date', null, 'custpage_mainfg').setMandatory(true);
		endField = form.addField('custpage_enddate', 'date', 'End Date', null, 'custpage_mainfg').setMandatory(true);
		
		// give an option to download vs. viewing the report in the browser
		download = form.addField('custpage_download', 'checkbox', 'Download', null, 'custpage_mainfg');
		download.setHelpText("If checked, clicking Generate Report will download a copy of the report. " +
				"If unchecked, the report will be displayed in the browser.", true);
		
		// get the first day of the previous month
		var start = new Date();
		start.setDate(1);
		start.setMonth(start.getMonth()-1);
		
		// get the last day of the previous month
		var end = new Date();
		end.setDate(1);
		end.setDate(end.getDate()-1);
		
		// default in the dates
		startField.setDefaultValue(nlapiDateToString(start));
		endField.setDefaultValue(nlapiDateToString(end));
		
		response.writePage(form);
	}
	else // POST
	{
		var startDate = request.getParameter('custpage_startdate');
		var endDate = request.getParameter('custpage_enddate');
		var download = request.getParameter('custpage_download');
		
		// there's no way to search over the date that a PO was approved or rejected, so we'll need to search over the 
		// created date, drawing a wide net, then filter later (within GetPOInfo below). Set the search Start date to 
		// one month before the desired start date. 
		var searchStartDate = new Date(startDate);
		searchStartDate.setMonth(searchStartDate.getMonth()-1);
		searchStartDate = nlapiDateToString(searchStartDate);
		
		// get all PO's over 100K within the dates
		var POs = GetPOs(searchStartDate, endDate);
		if(POs && POs.length > 0)
		{
			// we need to load each PO to get details about it, including the approvals sublist. This is also where we 
			// filter by approved/rejected date.
			var POInfo = GetPOInfo(POs, startDate, endDate);
			
			// if the user chose to download the report, create an XML doc to download
			if(download == 'T') 
			{
				var fileText = 'PO Approval Audit Report - ' + startDate.replace(/\//g, '-') + ' - ' + endDate.replace(/\//g, '-');
				var fileXML = GenerateCSV(POInfo, fileText);
				ExportExcelInSuiteLet(request, response, fileXML, fileText + '.xls');
			}
			// if the user selected download = false, just show the report in the browser instead
			else 
			{	
				var list = form.addSubList('custpage_list', 'list', 'Purchase Orders');
				list.addField('custpage_duedate', 'text', 'Due Date/Receive By').setDisplayType('inline');
				list.addField('custpage_documentnumber', 'text', 'Document Number').setDisplayType('inline');
				list.addField('custpage_name', 'text', 'Name').setDisplayType('inline');
				list.addField('custpage_createdby', 'text', 'Created By').setDisplayType('inline');
				list.addField('custpage_amount', 'text', 'Amount').setDisplayType('inline');
				list.addField('custpage_approver', 'text', 'Approver').setDisplayType('inline');
				list.addField('custpage_approvalaction', 'text', 'Approval Action').setDisplayType('inline');
				list.addField('custpage_approvaltime', 'text', 'Time of Approval/Rejection').setDisplayType('inline');
				
				for (var i = 0; i < POInfo.length; i++) 
				{
					list.setLineItemValue('custpage_documentnumber', i + 1, POInfo[i].documentnumber);
					list.setLineItemValue('custpage_duedate', i + 1, POInfo[i].duedate);
					list.setLineItemValue('custpage_name', i + 1, POInfo[i].name);
					list.setLineItemValue('custpage_createdby', i + 1, POInfo[i].createdby);
					list.setLineItemValue('custpage_amount', i + 1, POInfo[i].amount);
					list.setLineItemValue('custpage_approver', i + 1, POInfo[i].approvedby);
					list.setLineItemValue('custpage_approvalaction', i + 1, POInfo[i].approvalaction);
					list.setLineItemValue('custpage_approvaltime', i + 1, POInfo[i].time);
				}
				
				response.writePage(form);
			}
		}
		else
		{
			form.addField('custpage_noresults', 'label', 'There are no Purchase Orders over 100K for the dates submitted.');
			response.writePage(form);
		}
	}
}

/**
 * Returns an array of search results for Approved PO's within the selected dates over 100K
 * 
 * @param {String} date Date to run the search
 * @param {Array} locationIds Array of internal IDs of locations for the report.
 * @returns {Array}
 */
function GetPOs(searchStartDate, endDate)
{
	var filters = [["type","anyof","PurchOrd"], 
				   "AND", 
				   ["datecreated","within",searchStartDate,endDate], 
				   "AND", 
				   ["mainline","is","T"], 
				   "AND", 
				   ["amount","greaterthanorequalto","100000"],
				   "AND",
				   ["status","noneof","PurchOrd:A"]]; // status is none of Pending Supervisor Approval
	
	var columns = [new nlobjSearchColumn("internalid"),
	               new nlobjSearchColumn("createdby")];
	
	//Do the search, build the results, return them.
	return GetSteppedSearchResults('transaction', filters, columns);
}

/**
 * Look up each PO and return an array of objects with detailed information about each. We need to load them individually
 * so we can read from the approvals sublist, which isn't available through a search.
 * 
 * We're only ever getting info off of the first line of the approvals sublist. This is because it's always the the individual 
 * on the first line who will be the ultimate approver. 
 * 
 * For example, if a high dollar PO is entered, and the purchaser's supervisor's supervisor's supervisor is the only one 
 * that has a high enough purchase approval limit, then an approval record will be added to the approvals sublist for each 
 * person in the chain of command up to the person who finally has sufficient approval.People in between can hit "Approve" 
 * on the PO, but it won't move it into an approved status since they don't have a high enough limit. Ultimately, it doesn't 
 * really matter whether they hit Approve or not, so we don't want them to show up on this report.
 * 
 * (If a PO is submitted and the purchaser's approver has the authority to approve it, the other people in the chain of 
 * command won't be added to the approvals sublist. NetSuite will only go as far up that chain as they need to.)
 * 
 * @param  purchaseOrders
 * @returns {Array}
 */
function GetPOInfo(purchaseOrders, rawStart, rawEnd)
{
	var array = [];
	
	var startDate = Date.parse(rawStart);
	var endDate = Date.parse(rawEnd);
	
	for(var i = 0; i < purchaseOrders.length; i++)
	{
		// load the PO
		var rec = nlapiLoadRecord('purchaseorder',purchaseOrders[i].id);

		var approvDate = Date.parse(rec.getLineItemValue('approvals',"approvaltime",1));
		
		// only keep this PO if it was approved within the start and end date.
		if (startDate < approvDate && approvDate < endDate)
		{
			// for each PO, put the relevant info into an object and add it to our array.
			array.push({
				'duedate' : rec.getFieldValue('duedate'),
				'documentnumber' : rec.getFieldValue('tranid'),
				'name' : rec.getFieldText('entity'),
				'createdby' : purchaseOrders[i].getText('createdby'),
				'amount' : '$' + addCommas(rec.getFieldValue('total')),
				
				// here we are reading information off the first line of the approvals sublist.
				'approvedby': rec.getLineItemValue('approvals',"approvalentity",1) || '',
				'approvalaction': rec.getLineItemValue('approvals',"approvalaction",1) || '',
				'time': rec.getLineItemValue('approvals',"approvaltime",1) || '',
			});
		}
	}
	
	return array;
}

/**
 * Generates a CSV with from our PO data
 * 
 * @param {Array} POInfo
 * @param {String} headerText
 * @returns {String} File XML to download.
 */
function GenerateCSV(POInfo, headerText)
{
	var xmlString = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>'
		+ '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" '
		+ 'xmlns:o="urn:schemas-microsoft-com:office:office" '
		+ 'xmlns:x="urn:schemas-microsoft-com:office:excel" '
		+ 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" '
		+ 'xmlns:html="http://www.w3.org/TR/REC-html40">'
		+ '<Styles>'
			+ '<Style ss:ID="SSBOLDSTYLE">'
				+ '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>'
			+ '</Style>'
		+ '</Styles>'
		+ '<Worksheet ss:Name="Sheet1">';
	
	xmlString += '<Table>' +
	'<Row>' +
		'<Cell ss:MergeAcross="8" ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">' + headerText + '</Data></Cell>' +
	'</Row>' +
    '<Row>' +
    	'<Cell ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">DOCUMENT NUMBER</Data></Cell>' +
    	'<Cell ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">DUEDATE</Data></Cell>' +
    	'<Cell ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">NAME</Data></Cell>' +
    	'<Cell ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">CREATEDBY</Data></Cell>' +
    	'<Cell ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">AMOUNT</Data></Cell>' +
    	'<Cell ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">APPROVER</Data></Cell>' +
    	'<Cell ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">APPROVAL ACTION</Data></Cell>' +
    	'<Cell ss:StyleID="SSBOLDSTYLE"><Data ss:Type="String">TIME OF APPROVAL/REJECTION</Data></Cell>' +
   '</Row>';
	
	for(var i = 0; i < POInfo.length; i++)
	{
		xmlString += 
			'<Row>' +
				'<Cell><Data ss:Type="String">' + POInfo[i].documentnumber + '</Data></Cell>' +
				'<Cell><Data ss:Type="String">' + POInfo[i].duedate + '</Data></Cell>' +
				'<Cell><Data ss:Type="String">' + POInfo[i].name + '</Data></Cell>' +
		    	'<Cell><Data ss:Type="String">' + POInfo[i].createdby + '</Data></Cell>' +
		    	'<Cell><Data ss:Type="String">' + POInfo[i].amount + '</Data></Cell>' +
		    	'<Cell><Data ss:Type="String">' + POInfo[i].approvedby + '</Data></Cell>' +
		    	'<Cell><Data ss:Type="String">' + POInfo[i].approvalaction + '</Data></Cell>' +
		    	'<Cell><Data ss:Type="String">' + POInfo[i].time + '</Data></Cell>' +
    	   '</Row>';
	}

	xmlString += '</Table></Worksheet></Workbook>';
	
	//Create the file and save it.
	return xmlString;
}