/**
* @NApiVersion 2.x
* @NScriptType workflowactionscript
*/
define([],

function() {

/**
* Definition of the Suitelet script trigger point.
*
* @param {Object} scriptContext
* @param {Record} scriptContext.newRecord - New record
* @param {Record} scriptContext.oldRecord - Old record
* @Since 2016.1
*/
function onAction(scriptContext)
{
        var rec = scriptContext.newRecord;
        var subtotal = rec.getValue({fieldId: 'subtotal'});
        log.debug('Pre Tax Total', subtotal);
        var margin = parseInt(rec.getValue({fieldId: 'estgrossprofitpercent'}));
        log.debug('Mrgin%', margin);
        if(subtotal < 500)
        {
          log.debug('Check condition 1');
            if(margin >= 20) 
            return 1;
            else
                return 0;
        }
        else if(subtotal >= 500 && subtotal <5000)
        {
          log.debug('Check condition 2');
            if(margin >= 10) 
            return 1;
            else
                return 0;
        }
        else if(subtotal > 5000)
        {
          log.debug('Check condition 3');
            if(margin >= 5)
            return 1;
            else
                return 0;
        }

}

return {
onAction : onAction
};

});
