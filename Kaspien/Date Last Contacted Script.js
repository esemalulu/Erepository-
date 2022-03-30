/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Jul 2015     clayr
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */

function afterSubmitCustomRecordField(type){

	if (type == 'create' || type == 'edit') {
	
		//var newRecord = nlapiGetNewRecord();
        var dateUpdate = nlapiGetFieldValue('completeddate');
      	var venParent = nlapiGetFieldValue('company');
        var typeComm = nlapiGetFieldValue('custeventetailz_communication_type1');
      
        nlapiSubmitField('vendor',venParent,'custentityetailz_date_last_contacted_c',dateUpdate);
  
	}
 
   }
}
