function beforeSubmit(type)
{
	nlapiLogExecution('DEBUG,'Email',email);
	nlapiLogExecution('DEBUG,'Inbound Email',inboundemail);
 
var record = nlapiGetNewRecord();
if ( type == 'create' )
	{
	var origin = record.getFieldValue('origin');
	if (( origin == 1)||( origin == -5))
		{
		var tier = record.getFieldValue('custeventr7supporttier');
		if ( tier == null)
		{
		// then set Tier to Tier 12
		record.setFieldValue('custeventr7supporttier',12);
		}
		}

	{
	if ( record.getFieldValue('inboundemail') != null )

		{
		var email = record.getFieldValue('inboundemail').toLowerCase();
		var regex = ".*(helpdesk|r7_it_bos|r7_it_lax|r7_it_tor).*@rapid7\.com$";
		var theMatch = email.match(regex);
		if (theMatch!=null)
			{
			// then set IT Help Desk to True
			record.setFieldValue('helpdesk','T');
			record.setFieldValue('customform', 38);
			record.setFieldValue('templatestored', 'T');
			}
		if ( email == 'netsuite@rapid7.com')
			{
			// then set IT Help Desk & NS Help to True
			record.setFieldValue('helpdesk','T');
			record.setFieldValue('custeventr7netsuitecase','T');
			record.setFieldValue('customform', 38);
			record.setFieldValue('templatestore', 'T');
			}
		if ( email == 'renewals@rapid7.com')
			{
			// then set Support Tier to Customer Care
			record.setFieldValue('custeventr7supporttier',9);
			}
		}

	}
	}
}


function afterSubmit(type){}