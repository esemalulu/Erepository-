/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Mar 2020     Jeffrey Bajit
 *
 */

/**
 * Set the name field so it is in sync with the date field.
 */
function GD_PI_CountFieldChanged(type, name, linenum) {
	if (name == 'custrecordgd_physinvtcount_date')
		nlapiSetFieldValue('name', nlapiGetFieldValue(name));
}

/**
 * Set the name field so it is in sync with the date field, set today's date.
 */
function GD_PI_CountPageInit(type) {
	if (type == 'create') {
		var date = new Date();
		nlapiSetFieldValue('name', (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear());
	}

	var nameField = nlapiGetField('name');
	nameField.setDisplayType('disabled');

	if (document.getElementById("tbl_newrec397") != null)
		document.getElementById("tbl_newrec397").style.visibility = 'hidden';
	
	if (type == 'create' || type == 'edit') {
	    nlapiDisableLineItemField('recmachcustrecordgd_physinvtloctag_parent','name',true);
	}
}

/**
 * Name: GD_PI_CountValidateLine
 * Description: Set the name of the line from the start and end tag numbers.
 * @appliedtorecord customrecordgd_physinventloctags
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to save line item, false to abort save
 */
function GD_PI_CountValidateLine(type)
{
	var tagLineCount = nlapiGetLineItemCount('recmachcustrecordgd_physinvtloctag_parent');
	var currentLineStartTagNumber = nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvtloctag_starttag') || '';
	var currentLineEndTagNumber = nlapiGetCurrentLineItemValue(type, 'custrecordgd_physinvtloctag_endtag') || '';
	var currentLineNumber = nlapiGetCurrentLineItemIndex(type);

	for (var i = 1; i <= tagLineCount; i++)
	{
		  if (i != currentLineNumber)
		  {
			var startCheckNumber = nlapiGetLineItemValue('recmachcustrecordgd_physinvtloctag_parent', 'custrecordgd_physinvtloctag_starttag', i);
			var endCheckNumber = nlapiGetLineItemValue('recmachcustrecordgd_physinvtloctag_parent', 'custrecordgd_physinvtloctag_endtag', i);
			
			if ((currentLineStartTagNumber >= startCheckNumber && currentLineStartTagNumber <= endCheckNumber) ||
				(currentLineEndTagNumber >= startCheckNumber && currentLineEndTagNumber <= endCheckNumber))
			{
				alert("You have overlapping tag number on line: " + i + " - please correct before proceeding.");
				return false;
			}
		}
	}

    
    if (currentLineStartTagNumber != '' && currentLineEndTagNumber != '') {
        nlapiSetCurrentLineItemValue(type, 'name', currentLineStartTagNumber + ' - ' + currentLineEndTagNumber, false, false);
    } else {
        return false
    }
    
    return true;
}