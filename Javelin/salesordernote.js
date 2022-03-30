function BeforeSubmit(type) {
	//  This is a function to exclude the sales order from commissions if less than $1000 for an OSR

	var currentRecord = nlapiGetNewRecord();
	var itemQty = currentRecord.getLineItemCount('item');
	var salesTeamCount = nlapiGetLineItemCount('salesteam');
	var salesRep;
	var lineItemAmount = 0.0;

	nlapiLogExecution('debug','item count // sales team count', itemQty+' // '+salesTeamCount);
	
	// If there are sales team members, make sure one is checked as primary rep otherwise create an error
	if (salesTeamCount > 0) {
		// Get the sales rep on the sales order
		salesRep = currentRecord.getFieldValue('salesrep');
		
		nlapiLogExecution('debug','salesRep', salesRep);
		
		// If there is not a primary rep on the sales order throw an error so they can correct it
		if (!salesRep ) {
			throw nlapiCreateError('No Primary Rep Defined', 'Please select a primary sales team member on the sales team', true);
		}

		// Check to see if the salesrep is an OSR
		salesRepIsOSR = nlapiLookupField('employee', salesRep, 'custentity_isosrrep') === 'T';

		nlapiLogExecution('debug','salesRepIsOSR',salesRepIsOSR);
		
		// Loop through the items on the sales order
		for (var i = 1 ; i <= itemQty ; i++) {
			// total up the amount of the items on the sales order
			lineItemAmount = lineItemAmount + parseFloat(currentRecord.getLineItemValue('item', 'amount', i));
		}
		// If the total amount of the sales order is less than $1000 and it's an OSR exclude from commission
		if (lineItemAmount < 1000.0 && salesRepIsOSR === true ) {
			nlapiLogExecution('DEBUG', 'BeforeSubmit','Sales order amount of $' + lineItemAmount + ' is less than $1000 and sales rep is an OSR, excluding commissions.');
			// set the exclude commission checkbox
			currentRecord.setFieldValue('excludecommission', 'T');
		}
		else {
			nlapiLogExecution('DEBUG', 'BeforeSubmit','Sales order amount of $' + lineItemAmount );
		}
	}
}


function AfterSubmit(type) {
	/* Item Number 1307 = JS500125 New Customer FREE SolidWorks Installation Service
	 * Item Number 1117 = TC205200 Javelin Professional Training Day (formerly one-on-one)
	 * Item Number 1234 = TA205600 Javelin Professional Simulation Training Day
	 */

	/*
	 * customlist_salesOrderNoteTypes with InternalIDs
	 * DA Quickstart = 7
	 * 3DVIA Professional Day = 6
	 * CAE Professional Day = 5
	 * CAD Professional Day = 4
	 * Free SW Installation = 1
	 * Other CAD Services = 2
	 */


	/*
	Departments:
	InternalID 	Name 
	------------------------------
	8			Admin
	11			Subscription
	9			Tech Services
	12			Training
	10			Sales
	18			ELE
	7			Marketing
	17			Rapid Prototyping
	19			Reality
	5			DA
	3			PDM
	1			CAD
	2			CAE
	16			Services

	Classes:
	InternalID 	Name
	-------------------------------
	6			Hardware
	7			Internal Item
	4 			Services
	1 			Software
	2 			Subscription Initial
	3 			Subscription Renewal
	5 			Traning

	*/

	var currentContext = nlapiGetContext();
	var recID = nlapiGetRecordId();
	var recType = nlapiGetRecordType();
	var curSalesOrder = nlapiLoadRecord(recType, recID);

	var itemQty = curSalesOrder.getLineItemCount('item');
	var itemInternalID;
	var columns;
	var itemDisplayname;
	var itemDepartment;
	var itemClass;
	var itemType;
	var itemJobType;
	var salesOrderNoteType;
	var salesOrderNoteID;
	var addNote;
	var fields = ['displayname', 'department', 'class', 'itemid', 'custitem_jobtype'];


	var DEPARTMENT_CAD = 1;
	var DEPARTMENT_PDM = 3;

	var CLASS_SERVICES = 4;

	var NOTETYPE_SW_FREE_INSTALL = '1';
	var NOTETYPE_OTHER_CAD_SERVICE = '2';
	var NOTETYPE_CAD_PROFESSIONAL_DAY = '4';
	var NOTETYPE_CAE_PROFESSIONAL_DAY = '5';
	var NOTETYPE_3DVIA_PROFESSIONAL_DAY = '6';
	var NOTETYPE_DA_QUICKSTART = '7';


	// var orderContact;

	nlapiLogExecution('DEBUG','Sales Order Note Script','Type:' + type + ', RecordType: ' + recType + ', Id:' + recID + ', Context: ' + currentContext.getExecutionContext() + ', item count: ' + itemQty);
	
	for (var i = 1 ; i <= itemQty ; i++) {
		addNote = true; 
		itemInternalID = curSalesOrder.getLineItemValue('item', 'item', i);
		//if (itemInternalID == 1307 || itemInternalID == 1117  || itemInternalID == 1234)
		itemType = curSalesOrder.getLineItemValue('item', 'itemtype', i);


		if (itemType == 'Service') {
			columns = nlapiLookupField('serviceitem', itemInternalID, fields);
			itemDisplayname = columns.displayname;
			itemDepartment = columns.department;
			itemClass = columns.class;
			itemid = columns.itemid;
			itemJobType = columns.custitem_jobtype;


			// If the item has a jobType call the function to create a new job record
			if (itemJobType != null && itemJobType != '') {
				CreateJob(itemDisplayname, itemJobType, curSalesOrder, i);
			}
			

			if (itemInternalID == 1307) {
				salesOrderNoteType = NOTETYPE_SW_FREE_INSTALL;
			}
			else if (itemDepartment == DEPARTMENT_CAD ) {
				salesOrderNoteType = NOTETYPE_OTHER_CAD_SERVICE;
			}
			else if (itemInternalID == 498 || itemInternalID == 499 ) {
				salesOrderNoteType = NOTETYPE_DA_QUICKSTART;
			}
			else {
				addNote = false;
			}
			
			if (addNote == true) {
				nlapiLogExecution('DEBUG','Sales Order Note Script', 'salesOrderNoteType: ' + salesOrderNoteType);
				var salesOrderNote = nlapiCreateRecord('customrecord_salesordernote');
				salesOrderNote.setFieldValue('custrecord_salesordernotetype', salesOrderNoteType);
				salesOrderNote.setFieldValue('custrecord_salesorderservicestatus', '2');
				salesOrderNote.setFieldValue('custrecord_salesorder', recID);
				//salesOrderNote.setFieldValue('custrecord_salesordercontact', orderContact);
				salesOrderNoteID = nlapiSubmitRecord(salesOrderNote, true);
				nlapiLogExecution('DEBUG','Sales Order Note Script','salesOrderNoteID: ' + salesOrderNoteID);
				nlapiLogExecution('DEBUG','Sales Order Note Script','itemDisplayname = ' + itemDisplayname + ', itemDepartment = ' + itemDepartment + ', itemClass = ' + itemClass);
				nlapiLogExecution('DEBUG','Sales Order Note Script','Item: ' + itemInternalID + ', itemType: ' + itemType + ', itemid: ' + itemid);
			} 
		} 
		else if ( itemType == 'NonInvtPart') {
			columns = nlapiLookupField('noninventoryitem', itemInternalID, fields);
			itemDisplayname = columns.displayname;
			itemDepartment = columns.department;
			itemid = columns.itemid;
			itemClass = columns.class;
			itemJobType = columns.custitem_jobtype;


			// If the item has a jobType call the function to create a new job record
			if (itemJobType != null && itemJobType != '') {
				CreateJob(itemDisplayname, itemJobType, curSalesOrder, i);
			}


			if (itemInternalID == 1234 ) {
				salesOrderNoteType = NOTETYPE_CAE_PROFESSIONAL_DAY;
			}	
			else if (itemInternalID == 1117) {
				salesOrderNoteType = NOTETYPE_CAD_PROFESSIONAL_DAY;
			}
			else {
				addNote = false;
			}
			
			if (addNote == true) {
				nlapiLogExecution('DEBUG','Sales Order Note Script', 'salesOrderNoteType: ' + salesOrderNoteType);
				var salesOrderNote2 = nlapiCreateRecord('customrecord_salesordernote');
				salesOrderNote2.setFieldValue('custrecord_salesordernotetype', salesOrderNoteType);
				salesOrderNote2.setFieldValue('custrecord_salesorderservicestatus', '2');
				salesOrderNote2.setFieldValue('custrecord_salesorder', recID);

				salesOrderNoteID = nlapiSubmitRecord(salesOrderNote2, true);
				
				nlapiLogExecution('DEBUG','Sales Order Note Script','salesOrderNoteID: ' + salesOrderNoteID);
				nlapiLogExecution('DEBUG','Sales Order Note Script','itemDisplayname = ' + itemDisplayname + ', itemDepartment = ' + itemDepartment + ', itemClass = ' + itemClass);
				nlapiLogExecution('DEBUG','Sales Order Note Script','Item: ' + itemInternalID + ', itemType: ' + itemType + ', itemid: ' + itemid);
			}
		}
	}
}

function CreateJob(itemDisplayname, jobType, curSalesOrder, lineID) {

	// Custom field ID:  customlist_projecttype, ARAS PLM - 2, EPDM - 3, WPDM - 1
	var JOBTYPE_PLM = '2';
	var JOBTYPE_EPDM = '3';
	var JOBTYPE_WPDM = '1';

	// Job Status List: 1 - Closed, 2 - In Progress, 3 - Pending, 37 - On Hold
	var JOBSTATUS_CLOSED = 1;
	var JOBSTATUS_INPROGRESS = 2;
	var JOBSTATUS_PENDING = 4;  // Default to this one
	var JOBSTATUS_ONHOLD = 37;

	// Employee IDs: Wayne Hewison - 46, Susan Rockafellow - 330702, Adam Harte-Maxwell - 6
	var JOBMANAGER_EASTPDM = 46;
	var JOBMANAGER_WESTPDM = 330702;
	var JOBMANAGER_PLM = 330702;
	var JOBMANAGER_WPDM = 6;

	
	var salesOrderID = curSalesOrder.getId();
	var salesOrderNumber = curSalesOrder.getFieldValue('tranid');
	var salesOrderContact = curSalesOrder.getFieldValue('custbody_ordercontact');
	var customerID = curSalesOrder.getFieldValue('entity');
	var customerShipProvince = curSalesOrder.getFieldValue('shipstate');
	var jobManager;  // declaire a placeholder variable to be determined later
	var easternProvinces = ['ON', 'PE', 'QE', 'NS', 'NL'];  // Array of eastern province codes

	log('function CreateJob', 'customerID: ' + customerID + ', customerShipProvince: ' + customerShipProvince + ', jobType: ' + jobType);


	// Determine the proper rep
	if (jobType ==  JOBTYPE_PLM) {
		jobManager = JOBMANAGER_PLM;
	}
	else if (jobType == JOBTYPE_EPDM) {
		if (easternProvinces.indexOf(customerShipProvince) > -1) {
			jobManager = JOBMANAGER_EASTPDM;
		}
		else {
			jobManager = JOBMANAGER_WESTPDM;
		}
	}
	else if (jobType == JOBTYPE_WPDM) {	
		jobManager = JOBMANAGER_WPDM;
	}
	// Create a new job record and save it
	var jobRecord = nlapiCreateRecord('job');
	jobRecord.setFieldValue('companyname', itemDisplayname + ' - ' + salesOrderNumber + ' : ' + lineID);
	jobRecord.setFieldValue('entityid', itemDisplayname + ' - ' + salesOrderNumber + ' : ' + lineID);
	jobRecord.setFieldValue('entitystatus', JOBSTATUS_PENDING);
	jobRecord.setFieldValue('custentity_jobprimarycontact', salesOrderContact);
	jobRecord.setFieldValue('custentity_jobmanager', jobManager);
	jobRecord.setFieldValue('parent', customerID);
	jobRecord.setFieldValue('custentity_jobsalesorder', salesOrderID);
	var jobID = nlapiSubmitRecord(jobRecord, true);



	/*  
	FOR DEBUGGING BELOW IN THE DEBUGGER.  Start code here:
	jobManager = '105';
	jobID = '1885472';
	salesOrderID = '657000';
	salesOrderNumber = 'SA18010';
	itemDisplayname = 'JS600325 Enterprise PDM - Toolbox Customization';
	lineID = '1';
	var curSalesOrder = nlapiLoadRecord('salesorder', salesOrderID);
	var JOBMANAGER_WESTPDM = '105';
	var customerID = '35046';
	*/

	// Create and send email notification
	var jobManagerName = nlapiLookupField('employee', jobManager, 'entityid');
	var jobManagerEmail = nlapiLookupField('employee', jobManager, 'email');
	var emailAddressBCC = 'robert.gama@javelin-tech.com';  // switch to null when done testing
	var emailAddressCC = 'adam.harte-maxwell@javelin-tech.com';

	var customerLinkAddress = 'https://system.netsuite.com/app/common/entity/custjob.nl?id=' + customerID;
	var jobLinkAddress = 'https://system.netsuite.com/app/common/entity/custjob.nl?id=' + jobID;
	var salesOrderLinkAddress = 'https://system.netsuite.com/app/accounting/transactions/salesord.nl?id=' + salesOrderID;

	var records = new Object();
	records['transaction'] = salesOrderID;

	var emailSubject = 'New Job Assignment Notification - ' + salesOrderNumber;

	var emailBody = 'This is an automated email notification, you have a new job that was assigned to you.<br><br>';
	emailBody += '<b>Job Name</b>: ' + itemDisplayname + ' - ' + salesOrderNumber + ' : ' + lineID + '<br><br>';
	emailBody += '<b>Customer: </b><a href="' + customerLinkAddress + '">' + curSalesOrder.getFieldText('entity') + '</a><br>';
	emailBody += '<b>Sales Order: </b><a href="' + salesOrderLinkAddress + '">' + salesOrderNumber + '</a><br><br>';
	emailBody += '<b>Job Manager: </b>' + jobManagerName + '<br>';
	emailBody += '<b>Location: </b>' + customerShipProvince + '<br><br>';
	emailBody += '<b>Link to Job: </b><a href="' + jobLinkAddress + '">Click to Open</a>';

	// Send an email from Adam to the job manager, BBC to Rob, link the email back to the related sales order
	nlapiSendEmail(JOBMANAGER_WPDM, jobManagerEmail, emailSubject, emailBody, emailAddressCC, emailAddressBCC, records);
}

function log(strTitle, strBody) {
	nlapiLogExecution('DEBUG', strTitle, strBody);
}