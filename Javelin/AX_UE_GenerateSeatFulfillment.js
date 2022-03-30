/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 May 2016     WORK-rehanlakhani 1664361
 */


function generateSeatFulfillment(type)
{
	if(type == 'approve')
	{
		var item, itemID, class, flex, itemRec, numOfSeats, soID, state, exclude, itemType, context, email, counter, name, emailBody, memo, rep, cc, notes;
			
		soID = nlapiGetRecordId();
		context = nlapiGetContext();
		email = context.getEmail();
		name  = context.getName();
		counter = 0;
		
		
		var record     = nlapiLoadRecord('salesorder', soID);
		var customer   = record.getFieldValue('entity');
		var custName   = record.getFieldText('entity');
		var numOfLines = record.getLineItemCount('item');
		    state      = record.getFieldValue('shipstate');
			memo	   = record.getFieldValue('memo');
			rep		   = record.getFieldText('salesrep');
			notes	   = record.getFieldValue('custbody_shipnotes');
		for(var i = 0; i<numOfLines; i+=1)
		{
			item       = record.getLineItemText('item','item', i+1);
			itemID     = record.getLineItemValue('item','item', i+1); 
			class      = record.getLineItemText('item', 'class', i+1);
			numOfSeats = record.getLineItemValue('item','quantity', i+1);
			itemType   = record.getLineItemValue('item', 'itemtype', i+1);
			try
			{
				if(class == 'Training')
				{
					switch (itemType)
					{
						case "NonInvtPart":
							itemType = "noninventoryitem";
							itemRec = nlapiLoadRecord(itemType, itemID);
							flex    = itemRec.getFieldValue('custitem_flexdays_or_privatetraining');
							exclude = itemRec.getFieldValue('custitem_exclude_sf_generation');
							
							if(flex == 'F' && exclude == 'F')
							{
								for(var x = 0; x < numOfSeats; x+=1)
								{
									var seat = nlapiCreateRecord('customrecord_trgseat')
										seat.setFieldValue('custrecord_seat_customer', customer);
										seat.setFieldValue('custrecord_seat_salesorder', soID);
										seat.setFieldText('custrecord_seat_status', 'Needs Scheduling');
										seat.setFieldText('custrecord_trainingseat_purchase', item);
										seat.setFieldValue('custrecord_trainingseat_state', state);
									var recID = nlapiSubmitRecord(seat, false, true);
									if(recID != null){counter+=1};
								}
							}
							break;
						case "Service":
							itemType = "serviceitem";
							itemRec = nlapiLoadRecord(itemType, itemID);
							flex    = itemRec.getFieldValue('custitem_flexdays_or_privatetraining');
							exclude = itemRec.getFieldValue('custitem_exclude_sf_generation');
						
							if(exclude == 'F')
							{
								for(var x = 0; x < numOfSeats; x+=1)
								{
									var seat = nlapiCreateRecord('customrecord_trgseat')
										seat.setFieldValue('custrecord_seat_customer', customer);
										seat.setFieldValue('custrecord_seat_salesorder', soID);
										seat.setFieldText('custrecord_seat_status', 'Needs Scheduling');
										seat.setFieldText('custrecord_trainingseat_purchase', item);
										seat.setFieldValue('custrecord_trainingseat_state', state);
									var recID = nlapiSubmitRecord(seat, false, true);
									if(recID != null){counter+=1};
								}
							}
							break;
					}
				}
			}
			catch (err)
			{
				nlapiSendEmail('-5','javelin@audaxium.com','Error Generating Seat Fulfillment', getErrText(err) + i + ' ' + nlapiGetRecordId());
			}
		}
		if(counter > 0)
		{
				cc = ["amie.allen@javelin-tech.com","kerri.harris@javelin-tech.com"];
				emailBody  = 'Hello ' + name + ',<br>';
				emailBody += 'Company: ' + custName + '<br>';
				emailBody += 'Sales Order: <a href= "https://system.netsuite.com/app/accounting/transactions/salesord.nl?id=' + soID + '">' + record.getFieldValue('tranid') + '</a><br>';
				emailBody += 'Seat Fulfillments:' + counter + '<br>';
				emailBody += 'Sales Order Memo:' + memo + '<br>';
				emailBody += 'Sales Order Shipping Notes: ' + notes + '<br>';
				emailBody += 'Sales Order Sales Rep:' + rep + '<br>';
				if(email == "kelly.clancy@javelin-tech.com")
				{
					nlapiSendEmail('-5', 'amie.allen@javelin-tech.com', 'Seat Fulfillments Generated', emailBody, cc);
				}
				else
				{
					nlapiSendEmail('-5', email, 'Seat Fulfillments Generated', emailBody, cc);
				}	
				
		}
	}
  
}
