 /**
  *  Scheduled (sc)<br/>
  * 
  *  _warning: DEADCODE. Used once in 2010.
  * 
  *  _warning: email sent from 2<br/>
  *  
  * existing:<br/>
  * filename: ./Metasploit Licensing/R7_MSLicensing_Unscheduled_SalesOrderProcessing.js ; 34537  ;<br/>
  * script id: customscriptr7_mslicensing_unscheduled_s ; 173 ;  R7_MSLicensing_Unsch_SalesOrderProcessed  <br/>
  * deploy id:<bustomr/>
  * 	customdeployr7_mslicensing_unscheduled_s ; 8 ; R7_MSLicensing_Unscheduled_SalesOrderPro ; one time event on 5/13/2010
  * <br/>
  * proposed:<br/>
  * filename: ./Metasploit Licensing/r7_sc_mslicensingunschsalesorderprocessing.js<br/>
  * script id: customscript_r7_sc_mslicensingunschsalesorderprocessing<br/>
  * deploy id: customdeploy_r7_sc_mslicensingunschsalesorderprocessing<br/>
  * 
  * 
  * @class r7_sc_MSLicensingUnschSalesorderProcessing_DEAD
  * 
  */

/**
 * This script will be tripped for 
 * every approvedOrderTypes ie 'Billed','Partially Fulfilled','Pending Approval','Pending Fulfillment'
 * which has ACL set to T
 *
 * @method processSalesOrder
 */
function processSalesOrder(){
	
		//crash
			
		nlapiLogExecution('DEBUG','------------------------------','------------');
	
		var costToProcessALineItem = 150;
		var ctx = nlapiGetContext();
		
		//Find the salesOrder lineItems to be processed
		//results is only found once for this execution of the script.
		var results = findSalesOrdersToBeProcessed();
		
		if(results!=null){
			nlapiLogExecution('DEBUG','Results To Process',results.length);
		}
		
		//crash
		for(var i=0;results!=null && i<results.length && unitsLeft(80+costToProcessALineItem);i++){
			
			//Load the salesOrder
			var salesOrder = nlapiLoadRecord('salesorder',results[i].getId());
			nlapiLogExecution('DEBUG','Processing SalesOrder ' + results[i].getId(),'i='+i);
			salesOrder = setAllLocation(salesOrder); 
			
			var salesRep = salesOrder.getFieldValue('salesrep');
						
			//Process all individual line-items on the salesOrder
			for(var j=1;
			j<=salesOrder.getLineItemCount('item') && 
			unitsLeft(costToProcessALineItem);
			j++){
				
				nlapiLogExecution('DEBUG','Processing Line Item of SalesOrder',j);
				
				//Load the salesOrder record again.
				//This load is to avoid the RCRD_CHANGED error
				//the salesOrder is submitted after every lineItem is processed to persist changes
				salesOrder = nlapiLoadRecord('salesorder',results[i].getId());
				//Should we move this inside the subsequent if statement
				
				
				var activationNeeded = salesOrder.getLineItemValue('item','custcolr7transautocreatelicense',j);
				var license = salesOrder.getLineItemValue('item','custcolr7translicenseid',j);
				nlapiLogExecution('DEBUG','LineItem'+j+'. ActivationNeeded, License ',activationNeeded + ", "+license);
				
				//Quickly go through line items which don't have ACL lineitem
				//or the license has already been activated.
				//or the lineitem does not have a contact and the source is not ecommerce(source is null)
				while((activationNeeded!='T' || 
				(license!=null && license!='') ||
				((contactOnLineItem==null || contactOnLineItem =='') &&
				 salesOrderSource==null)) &&
				j <=salesOrder.getLineItemCount('item'))
				{
					j++;
					activationNeeded = salesOrder.getLineItemValue('item','custcolr7transautocreatelicense',j);
					license = salesOrder.getLineItemValue('item','custcolr7translicenseid',j);
					nlapiLogExecution('DEBUG','LineItem'+j+'. ActivationNeeded, License ',activationNeeded + ", "+license);
				}
				
				//If the line-item is an ACL Order &&
				//And the license hasn't already been created
				if(activationNeeded=='T' && (license==null || license=='')){
					
					//The fields array contains all the parameters for creating/renewing a license
					var fields = new Array();
					
					//Lookup Item fields which will be used to determine
					//expirationdate of license and productline and orderType
					var item = salesOrder.getLineItemValue('item','item',j);
					var itemFields = nlapiLookupField('item',item,new Array(
					'custitemr7itemnxlicensetype','custitemr7itemmslicensetype',
					'custitemr7itemdefaultterm'));
					
					//Lookup the primarycontact of the customer
					var presentContact = salesOrder.getLineItemValue('item','custcolr7translinecontact',j)
					nlapiLogExecution('DEBUG','Present Contact ',presentContact);
					
					if(presentContact==null||presentContact==''){
						var customerId = salesOrder.getFieldValue('entity');
						var contactEmail = salesOrder.getFieldValue('email');
						var lineItemContact = obtainLineItemContact(customerId,contactEmail);
						salesOrder.setLineItemValue('item','custcolr7translinecontact',j,lineItemContact);
						nlapiLogExecution('DEBUG','Set Primary Contact To',lineItemContact);
					}
					
					//Default Term as looked up in the item record
					var defaultTerm = itemFields['custitemr7itemdefaultterm'];
					
					//Determining the orderType and productLine
					if(itemFields['custitemr7itemmslicensetype']!=null && itemFields['custitemr7itemmslicensetype']!=''){
						fields['productline']='metasploit';
						var orderType = itemFields['custitemr7itemmslicensetype'];	
					}else if(itemFields['custitemr7itemnxlicensetype']!=null && itemFields['custitemr7itemnxlicensetype']!=''){
						var orderType = itemFields['custitemr7itemnxlicensetype'];
						fields['productline']='nexpose';
					}
						
					var quantity = salesOrder.getLineItemValue('item','quantity',j);
					var location = salesOrder.getLineItemValue('item','location',j);
					var optionsPK = salesOrder.getLineItemValue('item','options',j);
					
					
								
					//Set ProductKey=null if it starts with PEND
					//optionsPK usually comes with junk like CUSTCOLR7ITEMMSPRODUCTKEY F LINEID PEND234234
					nlapiLogExecution('DEBUG','OptionsString Coming in',optionsPK);
					optionsPK = optionsPK.substring(35);
					nlapiLogExecution('DEBUG','OptionsString Parsed',optionsPK);
					nlapiLogExecution('DEBUG', 'OptionsPK Parsed', optionsPK);
					if(optionsPK.length <=4){
						salesOrder.setLineItemValue('item', 'options', j, '');
					}
					else if (optionsPK.substring(0, 4) == 'PEND') {
							salesOrder.setLineItemValue('item', 'options', j, '');
					}else {
							salesOrder.setLineItemValue('item', 'options', j, optionsPK);
					}
										
					
				
					//Set StartDate to Today
					salesOrder.setLineItemValue('item','startdate',j,nlapiDateToString(new Date()));
			
					//ProductLine should be set to metasploit or nexpose
					fields['salesordername'] = salesOrder.getFieldValue('name')
					fields['duration'] = itemFields['custitemr7itemdefaultterm'];
					fields['quantity'] = quantity;
					fields['productline'] = fields['productline'];
					fields['productkey'] = salesOrder.getLineItemValue('item','options',j);
					fields['customer'] = salesOrder.getFieldValue('entity');
					fields['salesorder'] = salesOrder.getId();
					fields['salesrep'] = salesOrder.getFieldValue('salesrep');
					fields['contact'] = salesOrder.getLineItemValue('item','custcolr7translinecontact',j);
					fields['ordertype'] = orderType;
					fields['opportunity'] = salesOrder.getFieldValue('opportunity');
					
					//if the productline is metasploit
					if (fields['productline'] == 'metasploit') {
						
						//Attempting to processing Metasploit License for line item
						nlapiLogExecution('DEBUG','Attempting to process metasploit license for line item in',' salesorder.');
						
						//Key Method call Below (does the actual creation of license)
						var returnedFields = processMetasploitLicenseForLineItem(fields);
						
						var licenseName = returnedFields[0];
						var startDateLicense = returnedFields[1];
						var endDateLicense = returnedFields[2];	
						var success = returnedFields[3];
						if(success){
							salesOrder.setLineItemValue('item','custcolr7translicenseid',j,licenseName);	
							salesOrder.setLineItemValue('item','revrecstartdate',j,startDateLicense);
							salesOrder.setLineItemValue('item','revrecenddate',j,endDateLicense);
							salesOrder.setLineItemValue('item', 'vsoedelivered', j, 'T');
							salesOrder.setLineItemValue('item', 'options', j, '');
							if (nlapiStringToDate(endDateLicense) > nlapiStringToDate(salesOrder.getFieldValue('enddate'))) {
								salesOrder.setFieldValue('enddate', endDateLicense);
							}
							if (nlapiStringToDate(startDateLicense) < nlapiStringToDate(salesOrder.getFieldValue('startdate'))) {
								salesOrder.setFieldValue('startdate', startDateLicense);
							}
								
						}else{
							//salesOrder.setLineItemValue('item','location',j,salesOrder.getFieldValue('location'));
							salesOrder.setLineItemValue('item','custcolr7translicenseid',j,"XXX");
							salesOrder.setLineItemValue('item','options',j,"");
						}
					}
					else if(fields['productline']=='nexpose'){
						//This is all we do in the non-template version (send an email)
						salesOrder.setLineItemValue('item','custcolr7translicenseid',j,"XXX");
						var txt = "Sales Order Id" +salesOrder.getFieldValue('name');
						nlapiSendEmail(2,2,'NexposeLineItem on SalesOrder',txt);
					}
					
					
				}//If the line-item is an ACL Order && and the license hasn't already been created
				
					//Should we move this block back into the if statement?
					try {
						//Submitting the salesOrder to persist the enddate
						var id = nlapiSubmitRecord(salesOrder,false,true);
						nlapiLogExecution('DEBUG','SalesOrder Successfully submitted with id',id);
					}catch(err){
						nlapiLogExecution('ERROR',err.name,err.message);
						throw nlapiCreateError('203','Could not re-save salesorder.Exiting script',false);
					}
					
			}////Process all individual line-items on the salesOrder	
		}
		
		//nlapiLogExecution('DEBUG','Units Remaining when Script Chains',nlapiGetContext().getRemainingUsage());
		var results = findSalesOrdersToBeProcessed();
		if(results!=null && results.length>=1){
			wasteUnits(nlapiGetContext().getRemainingUsage() - 30);
			nlapiLogExecution('DEBUG','The SCRIPT is chaining ','to itself.');
			nlapiScheduleScript(ctx.getScriptId(),ctx.getDeploymentId());
		}
}

function obtainLineItemContact(customerId,email){
	//Check if customerId, email, and give acesss
	
	nlapiLogExecution('DEBUG','CustomerId of SalesOrder',customerId);
	nlapiLogExecution('DEBUG','Email of salesOrder',email);
	
	var searchFilters = new Array(
	new nlobjSearchFilter('company',null,'is',customerId),
	new nlobjSearchFilter('email',null,'is',email)
	);
	
	var results = nlapiSearchRecord('contact',null,searchFilters);
	if(results!=null){
		contactId = results[0].getId();
	}
	else{
		contactId = null;
	}
	return contactId;
}


function setAllLocation(salesOrder){
	for(var i=1;i<=salesOrder.getLineItemCount('item');i++){
		var location = salesOrder.getLineItemValue('item','location',i); 	
			if(location==null || location==''){
				salesOrder.setLineItemValue('item','location',i,salesOrder.getFieldValue('location'));
			}
	}
	return salesOrder;
}


//Return sales orders to be processed
function findSalesOrdersToBeProcessed(){
	return nlapiSearchRecord('salesorder',4500);
}

function processMetasploitLicenseForLineItem(fields){
	nlapiLogExecution('DEBUG','Metasploit Renewal')
	if(fields['productkey']==null || fields['productkey']==''){
			return createNewMetasploitLicense(fields);
	}else{
			//return new Array('YYYY',null,null,true);
			return renewExistingMetasploitLicense(fields);
	}
}

function renewExistingMetasploitLicense(fields){
	//nlapiLogExecution('DEBUG','In Renew Existing Metasploit Licence Method','yup');
	
	var existingLicense = findMetasploitLicenseWithProductKey(fields['productkey']);
	if(existingLicense==null){
		sendErrorEmail(fields,"Could not find provided productKey/Invalid ProductKey "+fields['productkey']); 
			return new Array ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false);
	}
	
	var licenseRecord = nlapiLoadRecord('customrecordr7metasploitlicensing',existingLicense);
	var presentExpirationDate = nlapiStringToDate(licenseRecord.getFieldValue('custrecordr7mslicenseexpirationdate'));
	if(presentExpirationDate <= new Date()){ 
		presentExpirationDate = new Date();
	}
	
	var daysToBeAdded = parseInt( parseFloat(fields['quantity'])*parseInt(fields['duration']));
	var computedExpirationDate = nlapiAddDays(presentExpirationDate,daysToBeAdded);
	
	licenseRecord.setFieldValue('custrecordr7mslicenseexpirationdate',nlapiDateToString(computedExpirationDate));
	licenseRecord.setFieldValue('custrecordr7mslicensependingsubmission','T');
	try {
		var id = nlapiSubmitRecord(licenseRecord);
		if(id!=null){
				var emailRecord = nlapiLoadRecord('customrecordr7metasploitlicensing',id);
				fields['licenseid'] = emailRecord.getFieldValue('name');
				var success = sendMetasploitActivationEmail(emailRecord,"renewal");
				if (!success) {
					//serviceException(emailRecord, "Could not email license purchaser his license key.(RENEWAL PURCHASE)");
					sendErrorEmail(fields,"Could not email license purchaser his license key.(RENEWAL PURCHASE)");
				}
		}
		var lFields = nlapiLookupField('customrecordr7metasploitlicensing',id,new Array('name','custrecordr7mslicenseexpirationdate'));
		nlapiLogExecution('DEBUG','Renewal License Name',lFields['name']);
		return new Array(lFields['name'],nlapiDateToString(presentExpirationDate),lFields['custrecordr7mslicenseexpirationdate'],true);
	
	}catch(err){
		sendErrorEmail(fields,"Could not resubmit renewal license "+fields['productkey']+err); 
		return new Array ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false)	
	}
}


function findMetasploitLicenseWithProductKey(productKey){
	var searchFilters = new Array(new nlobjSearchFilter('custrecordr7msproductkey', null, 'is', productKey));
	var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, searchFilters);
	if (searchResults != null && searchResults.length >= 1) {
		return searchResults[0].getId();	
	}
	else{
		return null;
	}
}

function createNewMetasploitLicense(fields){
	//Creating new metasploitLicense record
	var newRecord = nlapiCreateRecord('customrecordr7metasploitlicensing');
	
	var daysToBeAdded = parseInt( parseFloat(fields['quantity'])*parseInt(fields['duration']));
	var computedExpirationDate = nlapiAddDays(new Date(),daysToBeAdded);
	
	//Setting SalesRep and Other Fields
	var endDate = nlapiDateToString(computedExpirationDate);
	
	newRecord.setFieldValue('custrecordr7mslicensesalesrep',fields['salesrep']);
	newRecord.setFieldValue('custrecordr7mslicensecustomer',fields['customer']);
	newRecord.setFieldValue('custrecordr7mslicensesalesorder',fields['salesorder']);
	newRecord.setFieldValue('custrecordr7mslicensecontact',fields['contact']);
	newRecord.setFieldValue('custrecordr7msordertype',fields['ordertype']);
	newRecord.setFieldValue('custrecordr7mslicenseopportunity',fields['opportunity']);
	newRecord.setFieldValue('custrecordr7mslicenseexpirationdate',endDate);
	newRecord.setFieldValue('custrecordr7mslicensependingsubmission','T');
	
	try{
		var id = nlapiSubmitRecord(newRecord);
		if(id!=null){
				var emailRecord = nlapiLoadRecord('customrecordr7metasploitlicensing',id);
				fields['licenseid'] = emailRecord.getFieldValue('name');
				var success = sendMetasploitActivationEmail(emailRecord,"newPurchase");
				if (!success) {
					sendErrorEmail(fields,"Could not email license purchaser his license key.(NEW LICENSE CREATION)");
					//serviceException(emailRecord, "Could not email license purchaser his license key.");
				}
		}
		var fields = nlapiLookupField('customrecordr7metasploitlicensing',id,new Array('name','custrecordr7mslicenseexpirationdate'));
		return new Array(fields['name'],nlapiDateToString(new Date()),fields['custrecordr7mslicenseexpirationdate'],true);
	}catch(e){
		sendErrorEmail(fields,"Could not submit new license record "+e); 
		return ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false);
	}
	
}

function sendMetasploitActivationEmail(record,newPurchaseOrRenewal){
	nlapiLogExecution('DEBUG','In sendActivationEmail','yup')
	var success= false;
	try {
		var emailTemplateId = null;
		
		if (newPurchaseOrRenewal == 'newPurchase') {
			emailTemplateId = 431;		
		}else if(newPurchaseOrRenewal == 'renewal'){
			emailTemplateId = 431;
		}
		
		sendEmailFrom = record.getFieldValue('custrecordr7mslicensesalesrep');	
		contactEmailAddress = lookupContactEmail(record.getFieldValue('custrecordr7mslicensecontact'));
		
		if(sendEmailFrom==null||sendEmailFrom==''){sendEmailFrom = 2;}
		var records = new Array();
		records['recordtype'] = record.getRecordType();
		records['record'] = record.getId();
		var body = nlapiMergeRecord(emailTemplateId, 'customrecordr7metasploitlicensing', record.getId());
		nlapiLogExecution('DEBUG','Sending the b email','baboom');
		nlapiSendEmail(sendEmailFrom, contactEmailAddress, body.getName(), body.getValue(), null, 'derek_zanga@rapid7.com', records);
		success = true;
	}catch(e){
		nlapiLogExecution("EMERGENCY",'Could not mail activation email',e);
		return success;
	}
	return success;
}

function lookupContactEmail(contactId){
	var email = nlapiLookupField('contact',contactId,'email');
	return email;
}


function boom(){
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

function sendErrorEmail(fields,text){
	nlapiLogExecution("ERROR",'Error on',text);
	var fieldListing ="";
	for(field in fields){
		fieldListing += field + ": " + fields[field] + "<br>";
	}	
	nlapiSendEmail(2,2,
	'Error on R7_MSLicensing_Unscheduled_SalesOrderProcessed',
	text + "<br>" + fieldListing);
}


function unitsLeft(number){
    var unitsLeft = nlapiGetContext().getRemainingUsage();
    if (unitsLeft >= number) {
        return true;
    }
    return false;
}

function wasteUnits(number){
	var beginningUsage = nlapiGetContext().getRemainingUsage();
	var remainingUsage = nlapiGetContext().getRemainingUsage();
	while (remainingUsage >= beginningUsage - number) {
		var someWastefulActivity = nlapiLookupField('customer', 130910, 'isinactive');
		remainingUsage = nlapiGetContext().getRemainingUsage();
	}
}

function serviceException(record,message){
	//Send message to Support indicating error with license purchase.
	nlapiLogExecution("EMERGENCY",'ERROR',message);
	nlapiSendEmail(2,2,
	'Error on R7_MSLicensing_Unscheduled_ResubmitLicenses',
	message);
}



