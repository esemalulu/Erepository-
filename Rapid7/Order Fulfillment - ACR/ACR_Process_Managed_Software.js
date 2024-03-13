/*
 * @author mburstein
 */
function processManagedSoftware(recOrder, orderUpdates){

	var exitScript = false;
	
	this.arrItemACRIds = grabLineItemACRIds(recOrder);
	nlapiLogExecution('DEBUG', 'Processing Order: Managed Software', recOrder.getRecordType() + ': ' + recOrder.getId());
	
	//clean up associations in-case it was only associated on quote
	recOrder = reAssociateItems(recOrder, null, null); //TODO is this needed on Managed Software
	try {
		var customerId = recOrder.getFieldValue('entity');
		var strToday = nlapiDateToString(new Date());
		
		var orderObject = getOrderObject(recOrder);
		var arrACRItems = orderObject.getAclItemsByAcr('10'); // get Managed Software items
		var arrAddOnItems = orderObject.getAddonItemsByAcr('10'); //  Managed Software Addons

		this.arrParentEndDates = new Array();
		this.arrParentStartDates = new Array();
		this.currentFollowerCount = 1; //used to keep track of newrentech/newrensub dates TODO is this needed for MNG 
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
			var lineNum = acrItem['lineNum']; //TODO
			try {
				recOrder = processLineItemDates(recOrder, acrItem, orderUpdates);
				recOrder = processACR(recOrder, acrItem, orderUpdates);
				nlapiLogExecution('DEBUG', 'Processed MNGSoft', acrItem['activationKey']); //custcolr7managedSoftwareid
			} 
			catch (e) {
				nlapiSendEmail(55011, 340932, 'ERROR PROCESSING AN MNGSoft', 'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message, 'netsuite_admin@rapid7.com');
				recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
				orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
				exitScript = true;
				break;
			}
		}
		nlapiLogExecution('DEBUG', 'Finished MNGSoft ACRs', 'yup');
		processACRAddOns(recOrder, arrAddOnItems, orderUpdates);
		determineOrderStartEndDates(recOrder, orderUpdates, orderObject);

		// We no longer want to save the sales order here.  We will process the `orderUpdates` object later
		// nlapiSubmitRecord(recOrder, true, true);
		// Send email to notify
		/*if (acrItem['activationKey'] != null && acrItem['activationKey'] !=''){
		 var recManServiceId = acrItem['activationKey'];
		 var mngId = licName;
		 sendMNGReportEmail (mngId,recOrder,orderId,recManServiceId);
		 }*/
		//Send Activation emails to customers upon setup
		sendActivationEmails();
	} 
	catch (e) {
		nlapiSendEmail(55011, 340932, 'ERROR PROCESS MNG SCRIPT', 'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message, 'netsuite_admin@rapid7.com');
	}
}

function sendMNGReportEmail (mngId,recOrder, orderId,recManServiceId){
	var strSalesOrder = recOrder.getFieldValue('tranid');
	// My ID
	var emailAuthor = 340932;
	var emailRecipient = 1299822; // kathleen kanders
	var emailCC = nlapiLookupField('employee',340932,'email');					 
	/*if(itemCategory==5){
		var text = ' created ';	
	}
	else if(itemCategory==8){
		var text = ' updated ';	
	}*/
	var emailSubject = mngId+text+strSalesOrder;
	var emailBody = '<p><a href="https://system.netsuite.com/app/common/custom/custrecordentry.nl?rectype=64&id='+recManServiceId+'">';
	emailBody += mngId+'</a>Test per <a href="https://system.netsuite.com/app/accounting/transactions/salesord.nl?id='+orderId+'">'+strSalesOrder+'</a>.</p>';
	nlapiSendEmail(emailAuthor, emailRecipient, emailSubject, emailBody, emailCC);
}

