/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Sep 2016     mburstein
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */

function beforeSubmit(type){
    
    if (type != 'delete') {
        try{
            //set subsidiary if it is empty
            setSubsidiary();
        }catch (error)
        {
            var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, adminUser, 'Error durring setting subsidiary in Partner_UE.js', 'User: ' + nlapiGetUser() + '\nError: ' + error + '\nId: ' + nlapiGetRecordId());
        }        
    }
}


function setSubsidiary()
{
    if (nlapiGetRecordType() == 'partner' && (type != 'xedit' && type != 'delete'))
    {
        var context = nlapiGetContext();
        var lineNum = nlapiGetLineItemCount('addressbook');
        var defBillNum = false;
        var curCurrency = nlapiGetFieldValue('currency');
        for (var i = 1; lineNum !== null && i <= lineNum; i++)
        {
            var defBill = nlapiGetLineItemValue('addressbook', 'defaultbilling', i);
            if (defBill !== 'T')
                continue;
            var address = nlapiViewLineItemSubrecord('addressbook', 'addressbookaddress', i);
            if (address.getFieldValue('country') === 'US' || address.getFieldValue('country') == null ||  address.getFieldValue('country') == '')
            {
                nlapiSetFieldValue('subsidiary', 1); //Rapid7 LLC 
                defBillNum = true;
            }
            else
            {
                nlapiSetFieldValue('subsidiary', 10); // Rapid7 International
                defBillNum = true;
            }
        }
        if (!defBillNum)
        {
            nlapiSetFieldValue('subsidiary', 1); //Rapid7 LLC
        }
        if(curCurrency){
                nlapiSetFieldValue('currency',curCurrency);
        }
    }
}