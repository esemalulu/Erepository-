/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 May 2016     WORK-rehanlakhani
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
function generatePhoneCall(type)
{
	var testCompanies = ["Test Company for Testing", "Test Company for Testing 2", "ABC Test Company", "Test ABC Inc", "Subscription Test Company 1","Subscription Test Company 2","Subscription Test Company 3","Subscription Test Company 4","Subscription Test Company 5", "Test Company"];
	if(type == 'approve')
	{
		try 
		{
			var d = new Date();
			d.setMonth(d.getMonth() +2);
			const emp    = '3123281';
			var reps     = ["14", "40847", "1404570", "3123280"];
			var record   = nlapiLoadRecord('salesorder', nlapiGetRecordId());
			var recID    = nlapiGetRecordId();
			var customer = record.getFieldValue('entity');
			var salesRep = record.getFieldValue('salesrep');
			var date     = record.getFieldValue('trandate');
			var contact  = record.getFieldValue('custbody_ordercontact');
			var subject  = 'New Order follow up call';
			var status   = 'SCHEDULED';
			var priority = 'MEDIUM';
			var outcome  = '9';
			var callType = '4'; 
			var message  = 'A follow up phone call has been created for Sales Order: ' + record.getFieldValue('tranid');
			
			if(customer.indexOf(testCompanies) == -1)
			{
				if(reps.indexOf(salesRep) == -1)
				{
					var phone = nlapiCreateRecord('phonecall');
						phone.setFieldValue('title', subject);
						phone.setFieldValue('assigned', emp);
						phone.setFieldValue('status', status);
						phone.setFieldValue('startdate', nlapiDateToString(d, 'date'));
						phone.setFieldValue('enddate', nlapiDateToString(d, 'date'));
						phone.setFieldValue('transaction', recID);
						phone.setFieldValue('priority', priority);
						phone.setFieldValue('custeventcalloutcome', outcome);
						phone.setFieldValue('custeventcalltype', callType);
						phone.setFieldValue('company', customer);
						phone.setFieldValue('contact', contact);
						phone.setFieldValue('message', message);
					nlapiSubmitRecord(phone);
				}
			}
		}
		catch (err)
		{
			nlapiLogExecution('DEBUG', 'Error Saving Phone Call Record', getErrText(err));
		}
			
	}
}
