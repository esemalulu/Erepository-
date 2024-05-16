function checkItemShipOnHold(type,name)
{
	try
	{
          
		if(type=='copy' || type=='create' || type=='edit') 
		{
			var custFormId=nlapiGetFieldValue('customform');
			var itemCount = nlapiGetLineItemCount('item'); 
			var soId=nlapiGetFieldValue('createdfrom');			
			//alert("custFormId:="+custFormId+",soId:"+soId+", soId:"+itemCount) ;
			var  isItemBillOnHold = false;
			var  billOnHoldItemArr=[];
			if(itemCount>=1)
			{
				for(var k=1;k<=itemCount;k++)
				{ 
					
					var itemId= nlapiGetLineItemValue("item", "item", k);  					
					var itemType= nlapiGetLineItemValue("item", "itemtype", k);
					var ffCheck = nlapiGetLineItemValue("item", "itemreceive", k);
					var itemRecType = getItemType(itemType);
					
					if(itemType=='InvtPart')
					{
						var lookUpFieldsArr = ['itemid','custitembill_and_hold_item'];
						var itemObj = nlapiLookupField(itemRecType,itemId,lookUpFieldsArr,false);
						var itemBillOnHold = itemObj.custitembill_and_hold_item;
						var itemName = itemObj.itemid;
						
						//alert("itemId:="+itemId+",itemType:"+itemType+", ffCheck:"+ffCheck+", itemRecType:"+itemRecType+",itemBillOnHold:"+itemBillOnHold) ;
						if(itemBillOnHold=='T')
						{
							billOnHoldItemArr.push(itemName);
							nlapiSetLineItemValue("item", "custcol_ship_onhold", k, 'T');
							isItemBillOnHold = true;							
							//break;
						}
					}
				}//end of loop
				
				
				if(!isEmpty(billOnHoldItemArr))
				{
					alert("It can't be shipped as following items\n"+ JSON.stringify(billOnHoldItemArr)+" are marked as Bill and Hold item AND HOLD ITEM");
					
				}
			}
			
			
		}
	}
	catch(e)
	{
		nlapiLogExecution('error','exception raised on pageInit', e);
	}
}

function checkItemShipOnHoldFldChange(type,name,line)
{
	try
	{
		if(type == 'item' && name == 'itemreceive')
		{
			var custFormId=nlapiGetFieldValue('customform');
			var itemCount = nlapiGetLineItemCount('item'); 
			var soId=nlapiGetFieldValue('createdfrom');			
			//alert("custFormId:="+custFormId+",soId:"+soId+", soId:"+itemCount) ;
			var  isItemBillOnHold = false;
			var  billOnHoldItemArr=[];
			if(itemCount>=1)
			{
				for(var k=1;k<=itemCount;k++)
				{ 
					
					var itemId= nlapiGetLineItemValue("item", "item", k);  					
					var itemType= nlapiGetLineItemValue("item", "itemtype", k);
					var ffCheck = nlapiGetLineItemValue("item", "itemreceive", k);
					//if(ffCheck=='T')
					//{
						var itemRecType = getItemType(itemType);
						
						if(itemType=='InvtPart')
						{
							var lookUpFieldsArr = ['itemid','custitembill_and_hold_item'];
							var itemObj = nlapiLookupField(itemRecType,itemId,lookUpFieldsArr,false);
							var itemBillOnHold = itemObj.custitembill_and_hold_item;
							var itemName = itemObj.itemid;
							
							//alert("itemId:="+itemId+",itemType:"+itemType+", ffCheck:"+ffCheck+", itemRecType:"+itemRecType+",itemBillOnHold:"+itemBillOnHold) ;
							if(itemBillOnHold=='T')
							{
								billOnHoldItemArr.push(itemName);
								nlapiSetLineItemValue("item", "custcol_ship_onhold", k, 'T');
								isItemBillOnHold = true;							
								//break;
							}
						}
					//}
				}//end of loop
				
				
				if(!isEmpty(billOnHoldItemArr))
				{
					alert("It can't be shipped as following items\n"+ JSON.stringify(billOnHoldItemArr)+" are marked as Bill and Hold item AND HOLD ITEM");
					return false;
				}
			}
		}
	}
	
	catch(e)
	{
		nlapiLogExecution('error','Exception raised on field Change', e);
	}
}

function isEmpty(stValue) 
 {
	if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
		return true;
	}
	else {
		if (stValue instanceof String) {
			if ((stValue == '')) {
				return true;
			}
		}
		else if (stValue instanceof Array) {
			if (stValue.length == 0) {
				return true;
			}
		}
		return false;
	}
 }
 
function getItemType(itype)
{
	var recordtype = '';        
	switch (itype) {   // Compare item type to its record type counterpart
		case 'InvtPart':
			recordtype = 'inventoryitem';
			break;
		case 'NonInvtPart':
			recordtype = 'noninventoryitem';
			break;
		case 'Service':
			recordtype = 'serviceitem';
			break;
		case 'Assembly':
			recordtype = 'assemblyitem';
			break;			
		case 'GiftCert':
			recordtype = 'giftcertificateitem';
			break;
        case 'Kit':
			recordtype = 'kititem';
			break;
		case 'Markup':
			recordtype = 'markupitem';
			break;
		case 'Payment':
			recordtype = 'paymentitem';
			break;
		case 'Description':
			recordtype = 'descriptionitem';
			break;
		case 'Discount':
			recordtype = 'discountitem';
			break;
		case 'Group':
			recordtype = 'itemgroup';
			break;
		case 'Subtotal':
			recordtype = 'subtotalitem';
			break;
		case 'OthCharge':
			recordtype = 'otherchargeitem';
			break;	
		default:
	}
	return recordtype;
}