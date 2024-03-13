/*
 * @author efagone
 */
function processSalesOrder(){

	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	this.debug = true;

	this.arrProductTypes = grabAllProductTypes();
	this.arrProductTypesByRecId = grabAllProductTypes(true);

    var searchId = context.getSetting('SCRIPT', 'custscriptr7acrprocessordersearchqueue');
    var bigOrderQueue = context.getSetting('SCRIPT', 'custscript_r7_big_order_queue');
	var timeLimit = 7;
	if (bigOrderQueue === 'T') {
		timeLimit = 59;
	}
	var arrSearchResults = nlapiSearchRecord('transaction', searchId);
	for (var k = 0; arrSearchResults != null && k < arrSearchResults.length && unitsLeft(1500) && timeLeft(timeLimit); k++) {
	
		var startTime = new Date();

		var searchResult = arrSearchResults[k];
		var columns = searchResult.getAllColumns();
		var orderId = searchResult.getValue(columns[0]);
		var recOrder = nlapiLoadRecord('salesorder', orderId);
		var orderUpdates = getOrderUpdatesObject(recOrder)

		try {
			procssACLSalesOrder(recOrder, orderUpdates);
		}
        catch (e) {
            nlapiLogExecution('ERROR', 'Error on procssACLSalesOrder', 'Error: ' + e);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, [adminUser, 87335123, 131416698, 192569849], 'Error on ACR Process Entire Sales Order - ACR', 'Error: ' + e);          
        }

        try {
            processEventSalesOrder(recOrder, orderUpdates);
		}
        catch (e) {
            nlapiLogExecution('ERROR', 'Error on processEventSalesOrder', 'Error: ' + e);
            var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, [adminUser, 87335123, 131416698, 192569849], 'Error on ACR Process Entire Sales Order - ACR', 'Error: ' + e);
        }

        try {
            processManagedService(recOrder, orderUpdates);
		}
        catch (e) {
            nlapiLogExecution('ERROR', 'Error on processManagedService', 'Error: ' + e);
            var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, [adminUser, 87335123, 131416698, 192569849], 'Error on ACR Process Entire Sales Order - ACR', 'Error: ' + e);
        }

        try {
            processManagedSoftware(recOrder, orderUpdates);
		}
        catch (e) {
            nlapiLogExecution('ERROR', 'Error on processManagedSoftware', 'Error: ' + e);
            var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, [adminUser, 87335123, 131416698, 192569849], 'Error on ACR Process Entire Sales Order - ACR', 'Error: ' + e);
        }

        try {
            procssFulfillmentsSalesOrder(orderId);
		}
        catch (e) {
            nlapiLogExecution('ERROR', 'Error on procssFulfillmentsSalesOrder', 'Error: ' + e);
            var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, [adminUser, 87335123, 131416698, 192569849], 'Error on ACR Process Entire Sales Order - ACR', 'Error: ' + e);
        }
		
		//move this to before processing 1Price SO function & child consoles
		//as it requires license info in place on SO lines
		processOrderUpdates(orderUpdates);

        try {
            process1PriceSalesOrder(recOrder);
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'Error on process1PriceSalesOrder', 'Error: ' + e);
            var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, [adminUser, 87335123, 131416698, 192569849], 'Error on ACR Process Entire Sales Order - ACR', 'Error: ' + e);
        }

		var endTime = new Date();
		nlapiLogExecution('AUDIT', 'process_entire_order processing: ', 'Milliseconds: ' + (endTime - startTime));

	}
	
	// Aprove Contracts
	var arrSearchResults = nlapiSearchRecord('transaction', 14009);
	for (var k = 0; arrSearchResults != null && k < arrSearchResults.length && unitsLeft(1500) && timeLeft(timeLimit); k++) {
	
		var searchResult = arrSearchResults[k];
		var columns = searchResult.getAllColumns();
		var orderId = searchResult.getValue(columns[0]);
		var contractId = searchResult.getValue(columns[1]);
		
		try {
			nlapiSubmitField('customrecordr7contractautomation', contractId, 'custrecordr7carprocesscontract', 'T');
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error on ACR Approve Contracts on Sales Order - ACR', 'Error: ' + e);
		}
	}
	
	nlapiScheduleScript(462); //LFM
	nlapiScheduleScript(595); //contracts
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
}

function timeLeft(timeLimitInMinutes){

	if (timeLimitInMinutes == null || timeLimitInMinutes == '') {
		timeLimitInMinutes = 14;
	}
	var timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(number){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= number) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

/**
 * Create an object to hold all of the sales order updates and set each line item to an empty object
 *
 * @param recOrder
 * @returns {{id: *, lines: {}}}
 */
function getOrderUpdatesObject(recOrder) {
	var orderUpdates = {
		id: recOrder.getId(),
		lines: {},
	}

	var lineCount = recOrder.getLineItemCount('item');

	// Create empty object for each line on the order so we don't have to check before every update
	for (var i = 1; i <= lineCount; i++) {
		orderUpdates.lines[i] = {};
	}

	return orderUpdates;
}

function processOrderUpdates(orderUpdates) {
	nlapiLogExecution('debug', 'orderUpdates', JSON.stringify(orderUpdates));

	try {
		if (!orderUpdates || !orderUpdates.id) {
			return;
		}

		var salesOrder = nlapiLoadRecord('salesorder', orderUpdates.id, null);

		// Build an array of header-level fields that need to be updated.
		var headerFields = Object.keys(orderUpdates).filter(function(key) {
			return key !== 'id' && key !== 'lines';
		});

		// Update the header-level fields
		headerFields.forEach(function(field) {
			salesOrder.setFieldValue(field, orderUpdates[field]);
		});

		// Build an array of line Ids that need to be updated
		var lineIds = Object.keys(orderUpdates.lines);

		lineIds.forEach(function(lineId) {
			var line = orderUpdates.lines[lineId];

			// Build an array of fields to be updated for each line
			var lineFields = Object.keys(line);

			// update the line level fields
			lineFields.forEach(function(field) {
				salesOrder.setLineItemValue('item', field, lineId, line[field]);
			});
		});

		nlapiSubmitRecord(salesOrder);
	} catch (ex) {
		nlapiLogExecution('error', 'orderUpdates', JSON.stringify(orderUpdates));
		nlapiLogExecution('error', 'error saving', JSON.stringify(ex));

		var body = JSON.stringify({
			data: orderUpdates,
			error: ex
		}, null, 2);

		var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, [adminUser, 87335123, 131416698, 192569849], 'Error on ACR Process Entire Sales Order - Update Sales Order', body);
	}
}
