/*
 * @author mburstein
 */
function processManagedService(recOrder, orderUpdates){

	var exitScript = false;
	
	this.arrItemACRIds = grabLineItemACRIds(recOrder);
	nlapiLogExecution('DEBUG', 'Processing Order: Managed Service', recOrder.getRecordType() + ': ' + recOrder.getId());
	
	//clean up associations in-case it was only associated on quote
	recOrder = reAssociateItems(recOrder, null, null); //TODO is this needed on Managed Service
	try {
		var customerId = recOrder.getFieldValue('entity');
		var strToday = nlapiDateToString(new Date());
		
		var orderObject = getOrderObject(recOrder);
		var arrACRItems = orderObject.getAclItemsByAcr('3'); // get Managed service items
		var arrAddOnItems = orderObject.getAddonItemsByAcr('3'); // Managed Service Addons
		
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
				nlapiLogExecution('DEBUG', 'Processed MNG', acrItem['activationKey']); //custcolr7managedserviceid
			} 
			catch (e) {
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'ERROR PROCESSING AN MNG', 'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message, 'netsuite_admin@rapid7.com');
				recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
				orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
				exitScript = true;
				break;
			}
		}
		nlapiLogExecution('DEBUG', 'Finished MNG ACRs', 'yup');
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
        //luke is not ins SB1, add him later 194952346, TODO: change to the global option
		nlapiLogExecution('ERROR', 'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
        nlapiSendEmail(adminUser, [adminUser, 87335123, 131416698, 192569849], 'ERROR PROCESS MNG SCRIPT', 'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message, 'michael_burstein@rapid7.com');
        if (e.getCode() === 'RCRD_HAS_BEEN_CHANGED ')
        {
            nlapiSubmitField('salesorder', record.getId(), 'custbodyr7_rcrd_change_error_happened', 'T');
        }

	}
}

function sendMNGReportEmail (mngId,recOrder, orderId,recManServiceId){
	var strSalesOrder = recOrder.getFieldValue('tranid');
	// My ID
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');				 
	/*if(itemCategory==5){
		var text = ' created ';	
	}
	else if(itemCategory==8){
		var text = ' updated ';	
	}*/
	var emailSubject = mngId+text+strSalesOrder;
    var emailBody = '<p><a href="https://663271.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=64&id='+recManServiceId+'">';
    emailBody += mngId +'</a>Test per <a href="https://663271.app.netsuite.com/app/accounting/transactions/salesord.nl?id='+orderId+'">'+strSalesOrder+'</a>.</p>';
	nlapiSendEmail(adminUser, adminUser, emailSubject, emailBody);
}

