/**
 * Workflow Action to create a custom Program printout.
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Feb 2016     Jacob Shetler
 *
 */

/**
 * Sets the record ID in the context so the suitelet can use it.
 */
function programPrint()
{
	var context = nlapiGetContext();
	context.setSessionObject('gd_printprogramid', nlapiGetRecordId());
}

/**
 * Suitelet that actually does the printing.
 * 
 * @param {nlobjRequest} request
 * @param {nlobjResponse} response
 */
function printSuitlet(request, response)
{
	//load the program record from the session.
	var programID = nlapiGetContext().getSessionObject('gd_printprogramid');
	if (programID == null || programID.length < 1) throw 'You must load this suitelet from a Program.';
	var programRecord = nlapiLoadRecord('customrecordrvsprogram', programID);
	var isGlobalSpiff = nlapiLookupField('customrecordrvsprogramtype', programRecord.getFieldValue('custrecordprogram_type'), 'custrecordprogramtype_isglobal') == 'T';
	
	//Get the different sections of the PDF
	var html = '';
	html += getProgramHeader(programRecord);
	var primaryInfo = getProgramPrimaryInfo(programRecord, isGlobalSpiff);
	html += '<hr />';
	if (isGlobalSpiff)
	{
		var globalInfo = getProgramGlobalSpiffInfo(programRecord);
		html += '<table width="650px"><tr><td width="390px">' + primaryInfo + '</td><td>' + globalInfo + '</td></tr></table>';
	}
	else
	{
		html += primaryInfo;
	}
	html += '<hr />' + getProgramUnitsThatApply(programID);
	
	//Print	
	PrintPDFInSuiteLet(request, response, 'Program '+ programRecord.getFieldValue('name') + ' ' + getTodaysDate() + '.pdf', '<body style="font-family:Calibri,Verdana, Arial,Sans-serif;font-size:11px;" size="letter">'+ html +'</body>');
}

/**
 * Returns the HTML for the Header of the program.
 * 
 * @param {nlobjRecord} programRecord
 * @return {String} HTML
 */
function getProgramHeader(programRecord)
{
	return '<table cellpadding="2">' +
				'<tr style="font-size:10px;">' +
					'<td>'+ getTodaysDate() +'</td>' +
				'</tr>' +
				'<tr style="font-size:18px;">' +
					'<td><b>Program: ' + nlapiEscapeXML(programRecord.getFieldValue('name')) + '</b></td>' +
				'</tr>' +
			'</table>';
}

/**
 * Returns the HTML for the Primary Info of the program.
 * 
 * @param {nlobjRecord} programRecord
 * @param {Boolean} isGlobalSpiff
 * @return {String} HTML
 */
function getProgramPrimaryInfo(programRecord, isGlobalSpiff)
{
	//If the Program is a Global Spiff, then there's no dealer or sales rep. Don't include these fields.
	var salesRep = isGlobalSpiff ? '' : '<tr><td><b>Sales Rep</b></td><td>' + nlapiEscapeXML(programRecord.getFieldText('custrecordprogram_salesrep')) + '</td></tr>';
	var dealer = isGlobalSpiff ? '' : '<tr><td><b>Dealer</b></td><td>' + nlapiEscapeXML(programRecord.getFieldText('custrecordprogram_dealer')) + '</td></tr>';
	
	return '<table cellpadding = "2">' +
				'<tr style="font-size:16px"><td colspan="2"><b>Program Information</b></td></tr>' +
				'<tr>' +
					'<td width="30px"><b>Type</b></td><td>' + nlapiEscapeXML(programRecord.getFieldText('custrecordprogram_type')) + '</td>' +
				'</tr>' +
				'<tr>' +
					'<td><b>Name</b></td><td>' + nlapiEscapeXML(programRecord.getFieldValue('name')) + '</td>' +
				'</tr>' +
				'<tr>' +
					'<td><b>Description</b></td><td>' + nlapiEscapeXML(programRecord.getFieldValue('custrecordprogram_description')) + '</td>' +
				'</tr>' +
				 salesRep +
				 dealer +
				'<tr>' +
					'<td><b>Start Date</b></td><td>' + programRecord.getFieldValue('custrecordprogram_startdate') + '</td>' +
				'</tr>' +
				'<tr>' +
					'<td><b>End Date</b></td><td>' + programRecord.getFieldValue('custrecordprogram_enddate') + '</td>' +
				'</tr>' +
				'<tr>' +
					'<td><b>Comments</b></td><td>' + nlapiEscapeXML(programRecord.getFieldValue('custrecordprogram_comments')) + '</td>' +
				'</tr>' +
			'</table>';
}

/**
 * Returns the HTML for the Global Spiff Info of the program.
 * 
 * @param {nlobjRecord} programRecord
 * @return {String} HTML
 */
function getProgramGlobalSpiffInfo(programRecord)
{
	return '<table cellpadding = "2">' +
				'<tr style="font-size:16px"><td colspan="2"><b>Global Spiff Information</b></td></tr>' +
				'<tr>' +
					'<td width="35px"><b>Min Days on Lot</b></td><td>' + programRecord.getFieldValue('custrecordprogram_mindaysonlot') + '</td>' +
				'</tr>' +
				'<tr>' +
					'<td><b>Max Days on Lot</b></td><td>' + programRecord.getFieldValue('custrecordprogram_maxdaysonlot') + '</td>' +
				'</tr>' +
				'<tr>' +
					'<td><b>Global Spiff Amount</b></td><td>' + programRecord.getFieldValue('custrecordprogram_globalspiffamount') + '</td>' +
				'</tr>' +
			'</table>';
}

/**
 * Returns the HTML for the Units that Apply to the program.
 * 
 * @param {Number} programID
 * @return {String} HTML
 */
function getProgramUnitsThatApply(programID)
{
	var html = '<table width="650px" cellpadding = "1">' + 
					'<tr style="font-size:16px"><td colspan="3"><b>Units That Apply</b></td></tr>' +
					'<tr><td><b>Unit</b></td><td><b>Model</b></td><td><b>Incentive Amount</b></td></tr>';
	
	//do a search to get the line items for the program. We do this b/c the Model field is not stored on the program unit record.
	var columns = [new nlobjSearchColumn('custrecordprogramunit_unit'), new nlobjSearchColumn('custrecordprogramunit_model'), new nlobjSearchColumn('custrecordprogramunit_incentiveamount')];
	var programUnits = nlapiSearchRecord('customrecordrvsprogramunit', null, new nlobjSearchFilter('custrecordprogramunit_program', null, 'is', programID), columns);
	
	if (programUnits != null)
	{
		for (var i = 0; i < programUnits.length; i++)
		{
			html += '<tr>' +
						'<td>' + programUnits[i].getText('custrecordprogramunit_unit') + '</td>' +
						'<td>' + programUnits[i].getText('custrecordprogramunit_model') + '</td>' +
						'<td>' + programUnits[i].getValue('custrecordprogramunit_incentiveamount') + '</td>' +
					'</tr>';
		}
	}
	
	html += '</table>';
	return html;
}
