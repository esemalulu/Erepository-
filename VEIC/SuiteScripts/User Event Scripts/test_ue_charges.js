/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
*/

 define([],() => {
    const beforeLoad = (scriptContext) => {
	    log.debug("beforeLoad: charge id",scriptContext.newRecord.id); 
    }

    const beforeSubmit = (scriptContext) => {
    	let rec = scriptContext.newRecord;
        let d = rec.getValue({fieldId: 'chargedate'});
        let billto = rec.getValue({fieldId: 'billto'});
        let rate = rec.getValue({fieldId: 'rate'});
 	    log.debug("beforeSubmit", JSON.stringify({id:scriptContext.newRecord.id, date: d, project: billto, rate: rate}));
        rate += 0.01; // For testing, increment the rate by 1 cent.
        rec.setValue({fieldId: 'rate', value: rate});
    }

    const afterSubmit = (scriptContext) => {
        let rec = scriptContext.newRecord;
        let d = rec.getValue({fieldId: 'chargedate'});
        let billto = rec.getValue({fieldId: 'billto'});
        let rate = rec.getValue({fieldId: 'rate'});
 	    log.debug("afterSubmit", JSON.stringify({id:scriptContext.newRecord.id, date: d, project: billto, rate: rate}));
    }

      
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});