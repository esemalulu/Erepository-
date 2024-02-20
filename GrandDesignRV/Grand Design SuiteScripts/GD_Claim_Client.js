/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Jul 2021     MaxF             Used 1.0 becuase this needs to apply to Internal and Portal
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Boolean} True to continue changing field value, false to abort value change
 */
function clientValidateField(type, name, linenum){
    if (name == 'custrecordclaim_unit')
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
