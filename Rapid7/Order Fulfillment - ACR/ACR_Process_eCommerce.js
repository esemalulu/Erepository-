/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Oct 2012     mburstein
 *
 */
//This script will be tripped for 
//every approvedOrderTypes ie 'Billed','Partially Fulfilled','Pending Approval','Pending Fulfillment'
//which has ACL set to T

//TODO Modify search 4579 to say don't include salesorders where lineitem contact is null && source!=ecommerce
//This script will be tripped for 
//every approvedOrderTypes ie 'Billed','Partially Fulfilled','Pending Approval','Pending Fulfillment'
//which has ACL set to T

//THIS SCRIPT WORKS FOR ALL ACL PRODUCT LINES

var SEND_ACL_EMAILS_FROM =  340932;
var exitScript = false;

function processECommerceOrder(orderId){
	
	/*this.arrProductTypes = grabAllProductTypes();
	this.arrProductTypesByRecId = grabAllProductTypes(true);*/
	
	var recOrder = nlapiLoadRecord('salesorder', orderId);
	this.arrItemACRIds = grabLineItemACRIds(recOrder);
	nlapiLogExecution('DEBUG', 'Processing eCommerce SalesOrder ',orderId);
	
	// If line location is blank, set to header location
	recOrder = setAllLocation(recOrder);
	
	try {
		var customerId = recOrder.getFieldValue('entity');
		var strToday = nlapiDateToString(new Date());
		
		var arrItems = getItemsFromOrder(recOrder); //TODO
		var orderObject = getOrderObject(recOrder);
		var arrACRItems = getACRItems(arrItems, '1,2,6,7,8');
		var arrAllAddOnItems = getAddOnItems(arrItems);
		var arrAddOnItems = arrAllAddOnItems[0];
		
		this.arrParentEndDates = new Array();
		this.arrParentStartDates = new Array();
		this.currentFollowerCount = 1; //used to keep track of newrentech/newrensub dates
		this.licenseEmailsToSend = new Array();
		
		//map items by lineID
		var orderLineCount = recOrder.getLineItemCount('item');
		this.itemLineNums = new Array();
		
		for (var i = 1; i <= orderLineCount; i++) {
			var lineId = recOrder.getLineItemValue('item', 'id', i);
			itemLineNums[lineId] = i;
		}
		
		for (var i = 0; arrACRItems != null && i < arrACRItems.length && unitsLeft(1500) && timeLeft(); i++) {
			var acrItem = arrACRItems[i];
			var lineNum = acrItem['lineNum'];
			
			try {
				recOrder = processLineItemDates(recOrder, acrItem);
				recOrder = processACR(recOrder, acrItem);
				nlapiLogExecution('DEBUG', 'Processed  eCommerce ACL', acrItem['activationKey']);
			} 
			catch (e) {
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'ERROR PROCESSING AN ECOMMERCE ACL', e.name + ' : ' + e.message);
				recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
				exitScript = true;
				break;
			}
			
		}
		nlapiLogExecution('DEBUG', 'Finished eCommerce ACLs', 'yup');
		
		//process add-ons now
		processACRAddOns(recOrder, arrAddOnItems);
		//done processing add-ons now
		
		determineOrderStartEndDates(recOrder, null, orderObject);
		
		nlapiSubmitRecord(recOrder, true, true);
		sendActivationEmails();
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser,adminUser, 'ERROR PROCESS ECOMMERCE ACL SCRIPT', e.name + ' : ' + e.message, 'michael_burstein@rapid7.com');
	}
}

function setAllLocation(recOrder){
	for(var i=1;i<=recOrder.getLineItemCount('item');i++){
		var location = recOrder.getLineItemValue('item','location',i); 	
			if(location==null || location==''){
				recOrder.setLineItemValue('item','location',i,recOrder.getFieldValue('location'));
			}
	}
	return recOrder;
}

function boom(){ //TODO This function is not being used? 
	var itemFulfillmentRecord = nlapiTransformRecord(nlapiGetRecordType(),
	nlapiGetRecordId(),
	'itemfulfillment'
	);
	
	var invoice = nlapiTransformRecord(nlapiGetRecordType(),
	nlapiGetRecordId(),
	'invoice'
	);
	
	nlapiSubmitRecord(invoiceRecord);
	nlapiSubmitRecord(itemFulfillmentRecord);
		
	nlapiScheduleScript(171);		
}
