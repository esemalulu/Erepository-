/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Feb 2013     nathanah
 *
 */

/**
 * If the group or description changes, set the display name (altname).
 * @appliedtorecord customrecordrvsflatratecodes
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_FlatRateCode_FieldChanged(type, name, linenum)
{
    if (name == 'custrecordflatratecode_group' || name == 'custrecordgdflatratecode_description')
    {
        var groupText = nlapiGetFieldText('custrecordflatratecode_group');
        var description = nlapiGetFieldValue('custrecordgdflatratecode_description');
        
        nlapiSetFieldValue('altname', groupText + ' - ' + description);
    }
}

/**
 * Hide or show the 10,000 line limit message.
 * @appliedtorecord customrecordrvsflatratecodes
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GD_FlatRateCode_BeforeLoad(type, form, request)
{
    var lineLimitMessageField = form.getField('custrecordgd_flatratecode_linelimitmsg', null);
    // If the line reaches 10000 or more, show the message in red warning users that additional lines may not work but importing recall units will still work.
    if (type != 'create' )
    {
        var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
        if (record.getLineItemCount('recmachcustrecordrecallunit_recallcode') < 10000)
            lineLimitMessageField.setDisplayType('hidden');
    }
    else if (type == 'create' && lineLimitMessageField != null)
    {
        lineLimitMessageField.setDisplayType('hidden');
    }
}