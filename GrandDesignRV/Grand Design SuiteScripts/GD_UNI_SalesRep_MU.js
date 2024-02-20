/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 Dec 2017     brians
 *
 */

var GDRVU_ROLE_STANDARD = '1';

var GD_ENROLLMENT_ACHIEVEMENT = '19';


/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UNI_SalesRepMassUpdate(recType, recId) {

	try {
		
		filters = [];
		filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_dealsalesrp', null, 'anyof', recId));
		filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_retailsold', null, 'onorafter', '1/1/2017'));
		
		columns = [];
		columns.push(new nlobjSearchColumn('custrecordunit_series', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_retailsold').setSort());
		
		unitResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, columns);
		if(unitResults != null && unitResults.length > 0)
		{
			//Only enroll this user if they have some sales this year
			var contactRec = nlapiLoadRecord(recType, recId);
			
			contactRec.setFieldValue('custentitygd_uni_role', GDRVU_ROLE_STANDARD);
			contactRec.setFieldValue('custentitygd_uni_isactive', 'T');
			
			var achRec = nlapiCreateRecord('customrecordgd_contactachievement');
			achRec.setFieldValue('custrecordgd_contactachievement_contact', recId);
			achRec.setFieldValue('custrecordgd_contactach_achievement', GD_ENROLLMENT_ACHIEVEMENT);
			var today = new Date();
			achRec.setFieldValue('custrecordgd_contactach_date', (today.getMonth()+1)+'/'+today.getDate()+'/'+today.getFullYear());
			nlapiSubmitRecord(achRec, null, true);
			
			nlapiSubmitRecord(contactRec, null, true);
			nlapiLogExecution('debug', 'activated: ' + recId, recId);
		}
//		else
//			nlapiLogExecution('debug', 'No sales for: ' + recId, recId);


	}
	catch(err)
	{
		nlapiLogExecution('error', 'error updating contact: ' + recId, err);
	}
}

function GD_UNI_DeleteMassUpdate(recType, recId) {
	try {
		nlapiDeleteRecord(recType, recId);
	}
	catch(err) {
		nlapiLogExecution('error', 'Failed on id: ' + recId, err.getDetails());
	}
}
