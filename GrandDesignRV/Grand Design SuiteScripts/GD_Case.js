/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       8 Aug 2016     brians
 *
 * Sets fields on the GD Support case form based on user input
 */

function GD_Case_BeforeLoad(type, form, request) {
	//If a new Case record is being created, set the retail customer from the vin, if the vin has been set
	//The vin will only have been set if the creator is using the 'New Case' button on the Unit record
	if(type == 'create')
	{
		var vin = nlapiGetFieldValue('custeventgd_vinnumber');
		if(vin != null & vin != '') {
			SetRetailCustomer(vin);
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Boolean} True to continue changing field value, false to abort value change
 */
function GD_Case_ValidateField(type, name, linenum){
    if (name == 'custeventgd_vinnumber')
    {
        var unitId = nlapiGetFieldValue(name);
        if (unitId != null && unitId != '')
        {
            var lookupField = nlapiLookupField(UNIT_RECORD_TYPE, unitId, ['custrecordgd_legalcasepending']);
            if (lookupField.custrecordgd_legalcasepending == 'T')
            {
                var center = nlapiGetContext().getRoleCenter();
                if (center.toLowerCase() == 'customer')
                {
                    alert('This unit file is locked, please contact Grand Design Warranty Department.');
                    nlapiSetFieldValue(name, null);
                    return false;
                }
                else
                {
                    var userId = nlapiGetUser();
                    var userLookupField = nlapiLookupField('employee', userId, ['custentitygd_haslegalpermission']);
                    if (userLookupField.custentitygd_haslegalpermission != 'T')
                    {
                        alert('This unit file is locked, please consult with the Consumer Affairs department.');
                        nlapiSetFieldValue(name, null);
                        return false;
                    }
                }
            }
        }
    }
    return true;
}

function GD_Case_FieldChanged(type, name, linenum)
{	
	//If the vin is changed, set the retail customer and check to see if there are any other cases for this VIN
	if(name == 'custeventgd_vinnumber')
	{
		var vin = nlapiGetFieldValue('custeventgd_vinnumber');
		if(vin != null & vin != '')
		{
			SetRetailCustomer(vin);
			CheckForOtherCasesWithVIN(vin);	
		}
	}
}

/**
 * SetRetailCustomer - sets the Unit Retail Customer field, if one exists, based on the vin
 * @param vin
 */
function SetRetailCustomer(vin) {
	//Source Retail Customer when vin is changed.
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', vin, null);
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('internalid'));
	cols.push(new nlobjSearchColumn('name'));
	cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_phone'));
	cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_email'));
	cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_currentcust'));
	cols[0].setSort(true); //sort by most recent retail customer records
	
	var unitRetailCusResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, cols);
	var hasCurrentCustomer = false; //stores whether or not the unit has current customer.
	
	//clear current retail customer info if there is any.
	nlapiSetFieldValue('custeventgd_retailcustomer', '', false, true);
	nlapiSetFieldValue('custeventgd_caseretailcustname', '', false, true);
	nlapiSetFieldValue('custeventgd_retailcustomerphone', '', false, true);
	nlapiSetFieldValue('custeventgd_retailcustomeremail', '', false, true);
	if (unitRetailCusResults != null && unitRetailCusResults.length > 0)
	{
		for(var i = 0; i < unitRetailCusResults.length; i++) //loop through and find the retail customer marked as "Current Customer"
		{
			if(unitRetailCusResults[i].getValue('custrecordunitretailcustomer_currentcust') == 'T')
			{
				nlapiSetFieldValue('custeventgd_retailcustomer', unitRetailCusResults[i].id);
				nlapiSetFieldValue('custeventgd_caseretailcustname', unitRetailCusResults[i].getValue('name'), false, true);
				nlapiSetFieldValue('custeventgd_retailcustomerphone', unitRetailCusResults[i].getValue('custrecordunitretailcustomer_phone'), false, true);
				nlapiSetFieldValue('custeventgd_retailcustomeremail', unitRetailCusResults[i].getValue('custrecordunitretailcustomer_email'), false, true);
				hasCurrentCustomer = true;
				break;
			}
		}
		
		//there is no retail customer marked as "Current", so set it to be the most recent retail customer for this unit.
		if(!hasCurrentCustomer)
		{
			nlapiSetFieldValue('custeventgd_retailcustomer', unitRetailCusResults[0].id);
		}
	}
}

/**
 * CheckForOtherCasesWithVIN - Alert users if there are any cases associated with this VIN
 * @param vin
 */
function CheckForOtherCasesWithVIN(vin) {
	//Alert users if there are any cases associated with this VIN. Case #6528
	var currentCaseId = nlapiGetRecordId();
	filters = new Array();
	filters.push(new nlobjSearchFilter('custeventgd_vinnumber', null, 'anyof', vin, null));
	//filters.push(new nlobjSearchFilter('status', null, 'noneof', GD_CASE_STATUS_CLOSED, null)); //Jamie wants to show the message regardless of the status of the cases
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F', null));
	
	if(currentCaseId != null && currentCaseId != '' && currentCaseId > 0) //if we are editing a case, exclude the case we are currently on.
	{
		filters.push(new nlobjSearchFilter('internalid', null, 'noneof', currentCaseId, null));
	}
	
	var caseResults = nlapiSearchRecord('supportcase', null, filters, [new nlobjSearchColumn('casenumber'), new nlobjSearchColumn('title')]);			
	if(caseResults != null && caseResults.length > 0)
	{
		var existingCaseMessage = 'This VIN is already used in the following cases:';
		for(var j = 0; j < caseResults.length; j++)
		{
			existingCaseMessage += '\n- ' + caseResults[j].getValue('title') + ' (#' + caseResults[j].getValue('casenumber') + ')';
		}	
		
		alert(existingCaseMessage);
	}
}