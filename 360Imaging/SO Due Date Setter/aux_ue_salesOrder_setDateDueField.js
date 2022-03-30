/**
 * User Event applied to Sales order.
 * Fired before Submit trigger to set Date Due (custbody85) based following two fields:
 * - Date Received (custbody_model_received)
 * - Approval Date (custbody16)
 * 
 * BOTH fields MUST be set to trigger the event.
 * 
 * When both are sent, which ever is Max, add 5 BUSINESS days and set as Date Due.
 * - Business days are assumed as: Monday to Friday
 * 
 * Version    Date            Author           Remarks
 * 1.00       2/7/2014	      joe.son@audaxium.com
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
function dateDueSetterBeforeLoad(type, form, request){

	//when sales order, set Due Date as inline
	if (nlapiGetRecordType() == 'salesorder') {
		form.getField('custbody85').setDisplayType('inline');
	}
	
}

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
function dateDueSetterAfterSubmit(type){

	if (type != 'delete' && nlapiGetRecordType() == 'salesorder') {
		
		try {
			
			var soRec = nlapiGetNewRecord();
			
			var recdate = soRec.getFieldValue('custbody_model_received');
			var aprdate = soRec.getFieldValue('custbody16');
			
			//IF either of fields are EMPTY and Due Date is SET, 
			//Clear OUT Due Date Value
			if ((!recdate || !aprdate) && soRec.getFieldValue('custbody85')) {
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody85', '', false);
				return;
			}
			
			if (recdate && aprdate) {
				
				var rdo = nlapiStringToDate(recdate);
				var ado = nlapiStringToDate(aprdate);
				var maxdate = rdo;
				//find max date
				if (ado.getTime() > rdo.getTime()) {
					maxdate = ado;
				}
				
				//add 5 BUSINESS days to maxdate
				var fiveBizDate = maxdate;
				var numDays = 0;
				//loop until you get to 5 days from maxdate
				while (numDays != 5) {
					fiveBizDate = nlapiAddDays(fiveBizDate, 1);
					//0 = Sunday
					//6 = Sat
					if (fiveBizDate.getDay() != 0 && fiveBizDate.getDay()!=6) {
						numDays++;

					}
				}
				
				//set as due date
				//nlapiSetFieldValue('custbody85', nlapiDateToString(fiveBizDate), false, false);
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody85', nlapiDateToString(fiveBizDate), false);
				
			}
			
		} catch (duedateseterr) {
			log('error','Error setting Date due on SalesOrder '+type, getErrText(duedateseterr));
			nlapiCreateError('AUX_DUEDATEERR', 'Error while setting Date Due on Sales Order: '+getErrText(duedateseterr), false);
		}
		
	}
	
}
