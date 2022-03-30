/**
 * Module Description
 * 
 * Version    Date                     Author             Remarks
 * 1.00       25 Oct 2012     rohitjalisatgi
 * 1.10       07 Jan 2014     mohanboopalan      include only vendor logic 
 * 1.20       22 Jan 2014     mohanboopalan      exclude only for not to process into coupa
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function userEventAfterSubmit(type){
    var context = nlapiGetContext();
    var includeonly = context.getSetting('SCRIPT' , 'custscript_vendor_includeonly');
    var excludeonly = context.getSetting('SCRIPT' , 'custscript_vendor_excludeonly');
    var custfieldexclinclonly = context.getSetting('SCRIPT' , 'custscript_vendor_customfieldexcinclonly');
    var IsCallScheduledScript = true;  
    var Isinactive = false;
    var currentid = nlapiGetRecordId();

    if (type == 'create' )
    {
       var newrecord = nlapiGetNewRecord();
       if ( includeonly  != null && includeonly == 'T')
       {
             if ( newrecord.getFieldValue(custfieldexclinclonly) == 'F' || newrecord.getFieldValue(custfieldexclinclonly) != 'T' )
               {
                   IsCallScheduledScript = false;
               }
        }
       if ( excludeonly != null && excludeonly == 'T')
       {
             if ( newrecord.getFieldValue(custfieldexclinclonly) == 'T' || newrecord.getFieldValue(custfieldexclinclonly) != 'F' )
               {
                   IsCallScheduledScript = false;
               }
        }

  }
  if (type == 'edit' )
  {
      var currentid = nlapiGetRecordId();
      var newrecord = nlapiGetNewRecord();
      var oldrecord = nlapiGetOldRecord();

       if ( includeonly  != null && includeonly == 'T')
       {
             if ( newrecord.getFieldValue(custfieldexclinclonly) == 'F' && oldrecord.getFieldValue(custfieldexclinclonly) != 'F' )
               {
                   Isinactive = true;
               }
             if ( newrecord.getFieldValue(custfieldexclinclonly) == 'F' && oldrecord.getFieldValue(custfieldexclinclonly) == 'F' )
               {
                   IsCallScheduledScript = false;
               }
        }
        if ( excludeonly != null && excludeonly == 'T')
       {
             if ( newrecord.getFieldValue(custfieldexclinclonly) == 'T' && oldrecord.getFieldValue(custfieldexclinclonly) != 'T' )
               {
                   Isinactive = true;
               }
             if ( newrecord.getFieldValue(custfieldexclinclonly) == 'T' && oldrecord.getFieldValue(custfieldexclinclonly) == 'T' )
               {
                   IsCallScheduledScript = false;
               }
        }

   }
    if (IsCallScheduledScript)
    {
         var params = new Array();
         params['custscript_recordid'] = currentid;
         params['custscript_vendor_isinactive'] = Isinactive;
         nlapiScheduleScript('customscript_vendorscheduled', 'customdeploy_vendordeployment', params);
     }
}
