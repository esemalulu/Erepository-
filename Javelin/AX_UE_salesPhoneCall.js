/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Sep 2016     WORK-rehanlakhani
 *
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
function setValue(type)
{
	if(type == 'create' || type == 'edit')
	{
		try 
		{
			var phoneCallRec  = nlapiLoadRecord('phonecall', nlapiGetRecordId());
			var dateCompleted = phoneCallRec.getFieldValue('completeddate');
			var employee      = phoneCallRec.getFieldValue('assigned');
			var status        = phoneCallRec.getFieldValue('status');
			var department    = nlapiLookupField('employee', employee, 'department', true);
			var customer      = phoneCallRec.getFieldValue('company');  
			var isSales = false;
			var isTraining = false;
			
			if(department.search('Sales') > -1) { isSales = true; }
			if(department.search('Cust Care : Training') > -1) { isTraining = true; }
			
			if(status == 'COMPLETE')
			{
				if(dateCompleted != '' && customer != '')
				{
					//if(isSales == true || isTraining == true)
					if(isSales == true)					
					{
						var custRec = nlapiLoadRecord('customer', customer);
							custRec.setFieldValue('custentity_aux_lastcallbysales', dateCompleted);
						var custID = nlapiSubmitRecord(custRec);
						nlapiLogExecution('DEBUG', 'CUSTOMER RECORD WHICH RECEIVED A SALES CALL', custID);
					}	
				}
			}
		}
		catch (err)
		{
			if (err instanceof nlobjError)
			{
				nlapiLogExecution('DEBUG', 'ERROR WITH RECORD', err.getCode() + ': ' + err.getDetails());
			}
		}
	}
}
