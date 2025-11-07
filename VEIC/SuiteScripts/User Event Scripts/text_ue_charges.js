/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript

 define([],() => {
    const beforeLoad = (scriptContext) => {
	log.debug("beforeLoad: charge id",scriptContext.newRecord.id); 
    }

    const beforeSubmit = (scriptContext) => {
    	let rec = scriptContext.newRecord;
        let d = rec.getValue({fieldId: 'chargedate'});
        let billto = rec.getValue({fieldId: 'billto'});
 	log.debug("beforeSubmit", JSON.stringify({id:scriptContext.newRecord.id, date: d, project: billto});
    }

    const afterSubmit = (scriptContext) => {
        let rec = scriptContext.newRecord;
        let d = rec.getValue({fieldId: 'chargedate'});
        let billto = rec.getValue({fieldId: 'billto'});
 	log.debug("beforeSubmit", JSON.stringify({id:scriptContext.newRecord.id, date: d, project: billto});
    }

      
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});