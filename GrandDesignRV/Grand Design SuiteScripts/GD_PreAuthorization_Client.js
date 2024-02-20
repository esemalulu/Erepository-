/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Jun 2017     brians
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function GD_PreAuth_ClientPageInit(type){
	if(type == 'edit' && IsDealerLoggedIn() == false)
	{
		var unitId = nlapiGetFieldValue('custrecordpreauth_unit') || '';
		
		if(unitId != '')
		{
			var filters = [];
			filters.push(new nlobjSearchFilter('custrecordrecallunit_unit', null, 'anyof', unitId));
			filters.push(new nlobjSearchFilter('custrecordrecallunit_status', null, 'is', 'Open'));
			
			var columns = new Array();
			columns.push(new nlobjSearchColumn('name'));
			columns.push(new nlobjSearchColumn('custrecordrecallunit_unit'));
			columns.push(new nlobjSearchColumn('custrecordrecallunit_recallcode'));
			
			var results = nlapiSearchRecord('customrecordrvs_recallunit', null, filters, columns);
			
			if(results != null && results.length > 0)
			{
				var alertText = 'The Unit on this Pre-Authorization has ' + results.length + ' open recall(s), with Recall Code(s):\n';
				for(var i = 0; i < results.length; i++)
				{
					alertText += results[i].getText('custrecordrecallunit_recallcode') + '\n';
				}
				alert(alertText);
			}
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
function GD_PreAuth_ClientValidateField(type, name, linenum){
    if (name == 'custrecordpreauth_unit')
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
