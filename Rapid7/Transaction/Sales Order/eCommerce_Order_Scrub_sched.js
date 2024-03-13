/**
 * Class Description
 * 
 * Version    1.00           
 * Date       01 May 2013     
 * Author     mburstein     
 * 
 * Scheduled script kicked off by Sales Order afterSubmit User Event when type is create and source is web. 
 * The script runs the search SCRIPT - eCommerce Scrub, which pulls all web orders that have not been scrubbed (custbodyr7salesorderecommerceprocessed == F), 
 * and scrubs for VSOE/Fraud and creates opportunities when necessary.  
 * 
 * It handles the following for Web Orders:
 * 		eCommerce Data Scrubbing 
 * 		Creates an Opportunity for the order if one does not exist.  This will be extended by renewOnline().
 * 		Potential fraud checks
 * 
 * renewOnline() this is a function that will be created at a later time to extend eCommerce for Online Renewals of Complex Orders
 * 
 * 
 * @class scrub_eCommerce_Order
 * @for salesOrderUserEvent
 */

function scrub_eCommerce_Order(){
	// Get ACR Product types for Item Options
	this.arrProductTypes = grabAllProductTypes();
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	this.debug = true;

	// SearchId 14040 = SCRIPT - eCommerce Scrub	
	var arrSearchResults = nlapiSearchRecord('transaction', 14040);
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && unitsLeft(1500) && timeLeft(7); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var orderId = searchResult.getValue(columns[0]);
		
		try {
			process_eCommerce(orderId);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error on ACR Process Entire Sales Order - ACR', 'Error: ' + e);
		}
	}
}

function process_eCommerce(orderId){
	var recOrder = nlapiLoadRecord('salesorder',orderId);	
	/*
	 * If the source is not null then this is eCommerce
	 */
	var orderLineCount = recOrder.getLineItemCount('item');
	var orderValidated = recOrder.getFieldValue('custbodyr7ordervalidated');
	/*
	 * Pull the order line checker out.  The eCommerce should only setup the field validation.
	 * A seperate function should schedule the ACR script once everything is in order
	 */	
	for (var i = 1; i <= orderLineCount; i++) {
		var itemId = recOrder.getLineItemValue('item', 'item', i);
		var acrId = nlapiLookupField('item', itemId, 'custitemr7itemacrproducttype');
		var isACL = recOrder.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
		var activationKey = recOrder.getLineItemValue('item', arrProductTypes['activationid'][acrId], i);
		var licenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
		
		// If is ACL and licenseId is blank, and source is not null then eCommerce
		/*
		 * TODO This is the validation that checks to make sure we want to scrub the order.  
		 * This logic might change when we implement additional item Association/Validation Checks
		 */
		if (isACL == 'T' && (licenseId == null || licenseId == '') && (activationKey != null && activationKey != '')) {	
			// Trip the opp creation section
			tripECommerce = true;
			break;
		}	
	}
	/*
	 *TODO DO WE NEED TO CHECK THESE STILL? 
	 *var vsoe1 = record.getFieldValue('custbodyr7vsoereviewed');
	var vsoe2 = record.getFieldValue('vsoeautocalc');
	var vsoe3 = record.getFieldValue('tranisvsoebundle');
	var vsoe4 = record.getLineItemValue('item', 'vsoedelivered', 1);
	var vsoe5 = record.getLineItemValue('item', 'vsoeallocation', 1);
	var log = "VSORvwd:" + vsoe1 + " VSOAtClc:" + vsoe2 + " VSODlvrd" + vsoe4 + " VSOAlloc" + vsoe5 + " VSOBndle" + vsoe3;
	nlapiLogExecution('DEBUG', 'VSOE Fields Coming in', log);
	*/
	
	if (tripECommerce == true) {
		// Scrub the order
		recOrder = scrubECommerceOrder(recOrder);
		
		// If no opp attached, create a new opp
		var oppId = recOrder.getFieldValue('opportunity');
		if (oppId == null || oppId == '') {
			oppId = createOpportunityRecord(recOrder);
			recOrder.setFieldValue('opportunity', oppId);
		}
		else {
			nlapiLogExecution('DEBUG', 'Opportunity already exists', oppId);
		}
	}

	if (recOrder.getFieldValue('paymentmethod') == 7) { //paypal
		recOrder.setFieldValue('custbodyr7transactionignoreavs', 'T'); // if ignoreAVS is true then ignore fraud
	}
	
	if (potentialEcommerceFraudAVS(recOrder)) { //If this returns true then potential fraud
		//Persisting changes already made
		recOrder.setFieldValue('custbodyr7salesorderautocreatel', 'T'); //Suspend Autocreate Licesnse
		//record.setFieldText('orderstatus', 'Pending Approval'); //Set orderstatus to Pending Approval
		//record.setFieldText('status', 'Pending Approval');  Set status to Pending Approval
		nlapiLogExecution('DEBUG', 'Set Suspend Auto-Create License = T', 'yup');
		var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		
		var text = "" +
		"Sales Order: <a href='"+toURL+"/app/accounting/transactions/salesord.nl?id=" +
		nlapiGetRecordId() +
		"'> Link </a>" +
		"<br>AVS Street Match: " +
		recOrder.getFieldValue('ccavsstreetmatch') +
		"<br>AVS Zip Match: " +
		recOrder.getFieldValue('ccavszipmatch') +
		"<br>CSC Match: " +
		recOrder.getFieldValue('ccsecuritycodematch') +
		"<br>Address: " +
		recOrder.getFieldValue('billaddress');
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Suspended AutoCreate License', text);
		nlapiLogExecution('DEBUG', 'Sent email to Derek regarding suspending ACL', 'yup');
		return;	
	}
	var id = nlapiSubmitRecord(recOrder, null, true);
	/*
	 * Load record again after submit and check vsoe values
	 */
	var record2 = nlapiLoadRecord('salesorder', id);
	/*
	 *TODO is this necessary? Set vsoeautocalc F on sales order on second run???
	 */
	record2.setFieldValue('vsoeautocalc', 'F');
	nlapiSubmitRecord(record2, null, true);
	/**
	 * If the eCommerce scrub has completed successfully, 
	 * mark the eCommerce Processed checkbox true on the order.
	 * This will prevent subsequent eCommerce Processing attempts
	 * 
	 * @property eCommerceProcessed
	 * @for scrub_eCommerce_Order
	 */
	var eCommerceProcessed = recOrder.getFieldValue('custbodyr7salesorderecommerceprocessed');
	nlapiLogExecution('DEBUG','eCommerceProcessed',eCommerceProcessed);
}

/**
 * This function checks the order for fraud.  Returns true if fraudelent.
 * @method potentialEcommerceFraudAVS()
 * @for scrub_eCommerce_Order
 * @param {Object} record
 */
function potentialEcommerceFraudAVS(record){
	nlapiLogExecution('DEBUG','Ignore AVS',record.getFieldValue('custbodyr7transactionignoreavs'));
	if (record.getFieldValue('custbodyr7transactionignoreavs') != 'T') {
		
		var iid = record.getFieldValue('entity');
		var email = nlapiLookupField('customer', iid, 'email');
		
		if (record.getFieldValue('ccavsstreetmatch') != 'Y' ||
			record.getFieldValue('ccavsstreetmatch') != 'Y' ||
			record.getFieldValue('ccsecuritycodematch') != 'Y' ||
			freeMailDomain(email)) { //If any of these conditions are met return potentialFraud
			return true;
		}
		else {
			return false;
		}
	}
	else {
		//If ignoreavs is set to T return false ie. this is not a fraud order based on AVS
		return false;
	}	
}

// True if the order submitted email adress is a freemail domain.
function freeMailDomain(email){
	if(email==null) return false;
	if(email.indexOf('@')==-1) return false;

    var domain = email.substr(email.indexOf('@', 0) + 1);
    nlapiLogExecution('DEBUG', 'Domain Parsed', domain);
    var searchFilters = new Array(new nlobjSearchFilter('name', null, 'is', domain), new nlobjSearchFilter('name', null, 'is', domain));
    var searchResults = nlapiSearchRecord('customrecordr7domainnames', null, searchFilters);
    if (searchResults != null && searchResults.length >= 1) {
        return true;
    }
    else {
        return false;
    }
    return false;
}

function scrubECommerceOrder(record){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	//Setting startdate to today
	if (record.getFieldValue('startdate') == null || record.getFieldValue('startdate') == '') {
		record.setFieldValue('startdate', nlapiDateToString(new Date()));
	}
	
	//Setting enddate to today
	if (record.getFieldValue('enddate') == null || record.getFieldValue('enddate') == '') {
		record.setFieldValue('enddate', nlapiDateToString(new Date()));
	}
	
	salesRepFields = nlapiLookupField('employee', record.getFieldValue('salesrep'), new Array('location', 'department'));
	//Set department to salesRep Location	
	if (record.getFieldValue('department') == null || record.getFieldValue('department') == '') {
		record.setFieldValue('department', salesRepFields['department']);
	}
	//Set location to salesRep Location
	if (record.getFieldValue('location') == null || record.getFieldValue('location') == '') {
		record.setFieldValue('location', salesRepFields['location']);
	}
	
	//Set Other Ref # to 'Web Order'
	if (record.getFieldValue('otherrefnum') == null || record.getFieldValue('otherrefnum') == '') {
		record.setFieldValue('otherrefnum', 'Web Order');
	}
	
	//If leadSource is null set LeadSource 2002-Website-Rep
	nlapiLogExecution('DEBUG', 'Lead Source Coming In', record.getFieldValue('leadsource'));
	if (record.getFieldValue('leadsource') == '' || record.getFieldValue('leadsource') == null) {
		record.setFieldValue('leadsource', 219002);
	}
	
	// Set Customer record leadsource field to salesorder leadsource
	try {
		if (record.getFieldValue('entity') != '' && record.getFieldValue('entity') != null) {
			nlapiSubmitField('customer', record.getFieldValue('entity'), 'leadsource', record.getFieldValue('leadsource'));
		}
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, "ERROR SCRUBBING ECOMMERCE ORDER", 
		'Could not set Customer Record Lead Source \n OrderId: <a href="'+toURL+'/app/accounting/transactions/salesord.nl?id=' 
		+ record.getId() + '&whence=">' + record.getId() + '\n Error: ' + e);
	}
		
	nlapiLogExecution('DEBUG', 'Payment Method', record.getFieldValue('paymentmethod'));
	
	record.setFieldValue('vsoeautocalc', 'T');
	record.setFieldValue('tranisvsoebundle', 'F');
	
	if (record.getFieldValue('tranisvsoebundle') == '' || record.getFieldValue('tranisvsoebundle') == null) {
		record.setFieldValue('tranisvsoebundle', 'F');
	}
	

	if (record.getFieldValue('custbodyr7vsoereviewed') == '' || record.getFieldValue('custbodyr7vsoereviewed') == null) {
		record.setFieldValue('custbodyr7vsoereviewed', 'T');
	}
	
	/*
	 * Order Status Notes
	 * 	A = Pending Approval � The sales order has not been approved.
	 *  B = Pending Fulfillment � The order is pending creation of an invoice or cash sale, including partially billed shipping orders.
	 */
	//TODO what to do about Orderstatus?
	nlapiLogExecution('DEBUG','OrderStatus Coming In',record.getFieldText('orderstatus'));
	if (record.getFieldValue('orderstatus') == 'Pending Approval' || 
		record.getFieldText('orderstatus') == '' || 
		record.getFieldText('orderstatus') == null) {
		
		// Mark all order Pending Approval - TODO fix this in future versions.	
		record.setFieldText('orderstatus', 'A');
		//record.setFieldValue('orderstatus','B'); // 
	}
	
	setLineItemContacts(record);
	
	return record;
}

function createOpportunityRecord(record){    
	
	nlapiLogExecution('DEBUG','Creating Opportunity for record',record.getId());
	
	var staticFields = new Array(
	new Array('title','E*Commerce Order Automatically Processed'),
	new Array('entitystatus',83),
	new Array('custbodyr7oppwinlossdescription','E*Commerce Order automatically processed in NetSuite.'),
	new Array('custbodyr7oppwinlosscategory',9),
	new Array('winlossreason',97),
	new Array('custbodyr7oppwinner',48),
	new Array('custbodyr7opportunitytype','6')
	);
	
	var salesOrderFields = new Array(
	new Array('entity','entity'),
	new Array('projectedtotal','total'),
	new Array('department','department'),
	new Array('salesrep','salesrep'),
	new Array('leadsource','leadsource'),
	new Array('partner','partner'),
	new Array('custbodyr7partnerdealtype','custbodyr7partnerdealtype'),
	new Array('department','department'),
	new Array('location','location')
	);
	
	
	var oppRecord = nlapiCreateRecord('opportunity');
	//nlapiLogExecution('DEBUG','Creating Opportunity Record','');
	
	//Copying staticfields values into the fiels of the
	//opportunity record.
	//staticfields store all the value of the fields
	var fields = new Array();
	for (var i = 0; i < staticFields.length; i++) {
		oppRecord.setFieldValue(staticFields[i][0], staticFields[i][1]);
		fields[staticFields[i][0]] = staticFields[i][1];
		//nlapiLogExecution('DEBUG','Setting Opportunity field '+staticFields[i][0],staticFields[i][1]);
	}
	
	
	//Copying the field values of the salesOrder into the opportunity
	for (var i = 0; i < salesOrderFields.length; i++) {
		oppRecord.setFieldValue(salesOrderFields[i][0], record.getFieldValue(salesOrderFields[i][1]));
		fields[salesOrderFields[i][0]] = record.getFieldValue(salesOrderFields[i][1]);
		//nlapiLogExecution('DEBUG','Setting Opportunity field'+salesOrderFields[i][0],record.getFieldValue(salesOrderFields[i][1]));
	}
	
	//oppRecord.setFieldValue('',record.getId());
		
	try {
		var id = nlapiSubmitRecord(oppRecord);
		return id;
	}catch(err){
		errorText = "Could not create associated opportunity for salesOrder "+ record.getFieldValue('tranid');
		errorText = "<br>"+err.name+":"+err.message;
		sendErrorEmail(fields,errorText);
		return '';		
	}
}

function sendErrorEmail(fields,text){
	nlapiLogExecution("ERROR",'Error on',text);
	var fieldListing ="";
	for(field in fields){
		fieldListing += field + ": " + fields[field] + "<br>";
	}	
	nlapiSendEmail(adminUser,adminUser,'ERROR creating eCommerce Opp',text + "<br>" + fieldListing);
}

function setLineItemContacts(record){
	for (var i = 1; i <= record.getLineItemCount('item'); i++) {
		var isACL = record.getLineItemValue('item', 'custcolr7transautocreatelicense', i);
		var licenseId = record.getLineItemValue('item', 'custcolr7translicenseid', i);
		if (isACL == 'T' && (licenseId == null || licenseId == '')) {
			//Lookup the primarycontact of the customer
			var presentContact = record.getLineItemValue('item', 'custcolr7translinecontact', i);
			nlapiLogExecution('DEBUG', 'Present Contact ', presentContact);
			if (presentContact == null || presentContact == '') {
				var customerId = record.getFieldValue('entity');
				var contactEmail = record.getFieldValue('email');
				
				// if line contact empty, find contact for given customer/email and set the line contact
				var lineItemContact = obtainLineItemContact(customerId, contactEmail);
				record.setLineItemValue('item', 'custcolr7translinecontact', i, lineItemContact);
				
				// If line location is empty, set it to the Sales Rep location
				var location = record.getLineItemValue('item', 'location', i);
				if (location == null || location == '') {
					record.setLineItemValue('item', 'location', i, salesRepFields['location']);
				}
				nlapiLogExecution('DEBUG', 'Set Primary Contact To', lineItemContact);
			}
		}
	}
}	
/**
 * This function finds the contactId associated with as given customerId and email
 * 
 * @method obtainLineItemContact
 * @for scrub_eCommerce_Order
 * @param {Integer} customerId
 * @param {String} email
 * @returns {Integer} contactId
 */
function obtainLineItemContact(customerId,email){
	

	nlapiLogExecution('DEBUG','CustomerId of SalesOrder',customerId);
	nlapiLogExecution('DEBUG','Email of salesOrder',email);
	
	var searchFilters = new Array(
	new nlobjSearchFilter('company',null,'is',customerId),
	new nlobjSearchFilter('email',null,'is',email)
	);
	
	var results = nlapiSearchRecord('contact',null,searchFilters);
	if (results != null) {
		contactId = results[0].getId();
	}
	else {
		contactId = null;
	}
	return contactId;
}

function timeLeft(timeLimitInMinutes){

	if (timeLimitInMinutes == null || timeLimitInMinutes == '') {
		timeLimitInMinutes = 11;
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