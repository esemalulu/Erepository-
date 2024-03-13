 /**
  *  Scheduled (sc)<br/>
  * 
  *  _warning: used 3 times in 2010 assume DEADCODE
  *  _warning: email sent from 2, 340932<br/>
  *  
  * existing:<br/>
  * filename: ./Metasploit Licensing/R7_MSLicensing_Unscheduled_SalesOrderProcessing_Template.js ; 34120  ;<br/>
  * script id: customscriptr7_mslicensing_unsch_sopt  ; 181 ;  R7_MSLicensing_Unsch_SalesOrderProcessed  <br/>
  * deploy id:<br/>
  * 	customdeployr7_mslicensing_unsch_soptemp ; 14 ; R7_MSLicensing_Unsch_SalesOrderProcessed ; one time event on 5/31/2010
  * 	customdeploy2 ; 148 ; R7_MSLicensing_Unsch_SalesOrderProcessed 2 ; one time event on 10/28/2010
  * 	customdeploy3 ; 149 ; R7_MSLicensing_Unsch_SalesOrderProcessed 3 ; one time event on 10/28/2010
  * <br/>
  * proposed:<br/>
  * filename: ./Metasploit Licensing/r7_sc_mslicensingunschsalesorderprocessingtemplate.js<br/>
  * script id: customscript_r7_sc_mslicensingunschsalesorderprocessingtemplate<br/>
  * deploy id: customdeploy_r7_sc_mslicensingunschsalesorderprocessingtemplate<br/>
  * 
  * 
  * @class r7_sc_MSLicensingUnschSalesorderProcessingTemplate_DEAD
  * 
  */
//This script will be tripped for 
//every approvedOrderTypes ie 'Billed','Partially Fulfilled','Pending Approval','Pending Fulfillment'
//which has ACL set to T

//TODO Modify search 4579 to say don't include salesorders where lineitem contact is null && source!=ecommerce
//This script will be tripped for 
//every approvedOrderTypes ie 'Billed','Partially Fulfilled','Pending Approval','Pending Fulfillment'
//which has ACL set to T

//THIS SCRIPT WORKS FOR BOTH PRODUCT LINES METASPLOIT && NEXPOSE

var SEND_ACL_EMAILS_FROM =  340932;
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
				var contactOnLineItem = salesOrder.getLineItemValue('item','custcolr7translinecontact',j);
				var salesOrderSource = salesOrder.getFieldValue('source');
				if(salesOrderSource=='')salesOrderSource=null;
				nlapiLogExecution('DEBUG','LineItem'+j+'. ActivationNeeded, License ',activationNeeded + ", "+license);
				
				//Quickly go through line items which don't have ACL lineitem
				//or the license has already been activated.
				//or the lineitem does not have a contact and the source is not ecommerce(source is null)
				while(
				!((activationNeeded=='T') && 
				(license==null || license=='') 
				//&& (contactOnLineItem!=null && contactOnLineItem !='')
				)
				 && 
				 (j <=salesOrder.getLineItemCount('item'))
				){
					j++;
					//Re-reading activationNeeded, license, and contact values on the lineItem
					activationNeeded = salesOrder.getLineItemValue('item','custcolr7transautocreatelicense',j);
					license = salesOrder.getLineItemValue('item','custcolr7translicenseid',j);
					contactOnLineItem = salesOrder.getLineItemValue('item','custcolr7translinecontact',j);
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
					'custitemr7itemnxlicensetype',	//templateId for Nexpose
					'custitemr7itemmslicensetype1', //templateId for Metasploit
					'custitemr7itemdefaultterm',
					'custitemr7itemactivationemailtemplate')
					);
					
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
					if(itemFields['custitemr7itemmslicensetype1']!=null && itemFields['custitemr7itemmslicensetype1']!=''){
						fields['productline']='metasploit';
						var orderType = itemFields['custitemr7itemmslicensetype'];	
						fields['iidForTemplate'] = itemFields['custitemr7itemmslicensetype1'];
					}else if(itemFields['custitemr7itemnxlicensetype']!=null && itemFields['custitemr7itemnxlicensetype']!=''){
						fields['productline']='nexpose';
						var orderType = itemFields['custitemr7itemnxlicensetype'];
						fields['iidForTemplate'] = itemFields['custitemr7itemnxlicensetype'];
					
					}
						
					var quantity = salesOrder.getLineItemValue('item','quantity',j);
					var location = salesOrder.getLineItemValue('item','location',j);
					var optionsPK = salesOrder.getLineItemValue('item','options',j);
					
					
								
					//Set ProductKey=null if it starts with PEND
					//optionsPK usually comes with junk like CUSTCOLR7ITEMMSPRODUCTKEY F LINEID PEND234234
					nlapiLogExecution('DEBUG','OptionsString Coming in',optionsPK);
					if (optionsPK != null) {
						optionsPK = optionsPK.substring(35);
					}
					
					nlapiLogExecution('DEBUG','OptionsString Parsed',optionsPK);
					
					nlapiLogExecution('DEBUG', 'OptionsPK Parsed', optionsPK);
					
					if(optionsPK!=null && optionsPK.length <=4){
						salesOrder.setLineItemValue('item', 'options', j, '');
					}
					else if (optionsPK!=null && optionsPK.substring(0, 4) == 'PEND') {
							salesOrder.setLineItemValue('item', 'options', j, '');
					}else {
							salesOrder.setLineItemValue('item', 'options', j, optionsPK);
					}
										
					//Set StartDate to Today
					salesOrder.setLineItemValue('item','startdate',j,nlapiDateToString(new Date()));
			
					//ProductLine should be set to metasploit or nexpose
					fields['activationEmailTemplate']= itemFields['custitemr7itemactivationemailtemplate'];
					fields['salesordername'] = salesOrder.getFieldValue('name')
					fields['duration'] = itemFields['custitemr7itemdefaultterm'];
					fields['quantity'] = quantity;
					//ProductLine should have already been set to metasploit or nexpose
					fields['productline'] = fields['productline'];
					fields['productkey'] = salesOrder.getLineItemValue('item','options',j);
					fields['customer'] = salesOrder.getFieldValue('entity');
					fields['salesorder'] = salesOrder.getId();
					fields['salesrep'] = salesOrder.getFieldValue('salesrep');
					fields['contact'] = salesOrder.getLineItemValue('item','custcolr7translinecontact',j);
					fields['ordertype'] = orderType;
					fields['opportunity'] = salesOrder.getFieldValue('opportunity');
					fields['custbodyr7transactionignorepkvalid'] = 
					salesOrder.getFieldValue('custbodyr7transactionignorepkvalid');
					fields['itemid']  = item;
					
					//If the productLine is metasploit
					if (fields['productline'] == 'metasploit') {
						
						//Attempting to processing Metasploit License for line item
						nlapiLogExecution('DEBUG','Attempting to process metasploit license for line item in',' salesorder.');
						
						//Key Method call Below (does the actual creation of license)
						var returnedFields = 
						processMetasploitLicenseForLineItem(fields); // <-- THE KEY KEY METHOD
					
						var licenseName = returnedFields[0];
						var startDateLicense = returnedFields[1];
						var endDateLicense = returnedFields[2];	
						var success = returnedFields[3];
						var productKey = returnedFields[4];
						
						nlapiLogExecution('DEBUG','Product Key Returned',productKey);
						nlapiLogExecution('DEBUG','RevRecEndDate',endDateLicense);
											
						if(success){
							salesOrder.setLineItemValue('item','custcolr7translicenseid',j,licenseName);	
							salesOrder.setLineItemValue('item','revrecstartdate',j,startDateLicense);
							salesOrder.setLineItemValue('item','revrecenddate',j,endDateLicense);
							salesOrder.setLineItemValue('item', 'vsoedelivered', j, 'T');
							salesOrder.setLineItemValue('item', 'options', j, '');
							
							if(productKey!=null){
								//salesOrder.setLineItemText('item', 'options', j, productKey);
							}
							
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
					} //if fields['productline'] == 'metasploit'
					
					else if(fields['productline']=='nexpose'){
						//Attempting to processing NeXpose License for line item
						nlapiLogExecution('DEBUG','Attempting to process Nexpose license for line item in',' salesorder.');
						
						//Key Method call Below (does the actual creation of license)
						var returnedFields = processNexposeLicenseForLineItem(fields);
					
						var licenseName = returnedFields[0];
						var startDateLicense = returnedFields[1];
						var endDateLicense = returnedFields[2];	
						var success = returnedFields[3];
						var productKey = returnedFields[4];
						
						nlapiLogExecution('DEBUG','Product Key Returned',productKey);
						nlapiLogExecution('DEBUG','RevRecEndDate',endDateLicense);
						
						if(success){
							
							salesOrder.setLineItemValue('item','custcolr7translicenseid',j,licenseName);	
							salesOrder.setLineItemValue('item','revrecstartdate',j,startDateLicense);
							salesOrder.setLineItemValue('item','revrecenddate',j,endDateLicense);
							salesOrder.setLineItemValue('item', 'vsoedelivered', j, 'T');
							salesOrder.setLineItemValue('item', 'options', j, '');
							
							if(productKey!=null && productKey!=''){
								//salesOrder.setLineItemText('item', 'options', j, productKey);
							}
							
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
						
				}//if fields['productline']='nexpose'
					
				}//If the line-item is an ACL Order && and the license hasn't already been created
				
				//Should we move this block back into the if statement?	
				try {
						//Submitting the salesOrder to persist the enddate
						var id = nlapiSubmitRecord(salesOrder,false,true);
						nlapiLogExecution('DEBUG','SalesOrder Successfully submitted with id',id);
					}catch(err){
						nlapiLogExecution('ERROR',err.name,err.message);
						nlapiLogExecution('ERROR',err.message,err);
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
	//return null;
	return nlapiSearchRecord('salesorder',4579);
}


function processNexposeLicenseForLineItem(fields){
	if(fields['productkey']==null || fields['productkey']==''){
			return createNewNexposeLicense(fields);
	}else{
			//return new Array('YYYY',null,null,true);
			return renewExistingNexposeLicense(fields);
	}
}

function createNewNexposeLicense(fields){
	
	//Creating new nexpose License record from Template
	var newRecord = nlapiCopyRecord('customrecordr7nexposelicensing',fields['iidForTemplate']);
	
	//Null out ProductKey, Nexpose License Serial No, Product Serial No
	newRecord.setFieldValue('custrecordr7nxproductkey','');
	newRecord.setFieldValue('custrecordr7nxlicenseserialnumber','');
	newRecord.setFieldValue('custrecordr7nxproductserialnumber','');
	
	//Computing endDate = today + quantityPurchased*duration
	var daysToBeAdded = parseInt( parseFloat(fields['quantity'])*parseInt(fields['duration']));
	var computedExpirationDate = nlapiAddDays(new Date(),daysToBeAdded);
	var endDate = nlapiDateToString(computedExpirationDate);
	
	//Setting Start Date 
	newRecord.setFieldValue('custrecordr7nxlicenseoemstartdate',nlapiDateToString(new Date()));
	newRecord.setFieldValue('custrecordr7nxlicensesalesrep',fields['salesrep']);
	newRecord.setFieldValue('custrecordr7nxlicensecustomer',fields['customer']);
	newRecord.setFieldValue('custrecordr7nxlicensesalesorder',fields['salesorder']);
	newRecord.setFieldValue('custrecordr7nxlicensecontact',fields['contact']);
	newRecord.setFieldValue('custrecordr7nxlicenseopportunity',fields['opportunity']);
	
	//Setting End Date
	newRecord.setFieldValue('custrecordr7nxlicenseexpirationdate',endDate);
	
	try{
		var id = nlapiSubmitRecord(newRecord);
		if(id!=null){
			
				var emailRecord = nlapiLoadRecord('customrecordr7nexposelicensing',id);
				fields['licenseid'] = emailRecord.getFieldValue('name');
				//Sending Activation Email
				var success = 
				sendNexposeActivationEmail(emailRecord,"newPurchase",fields['activationEmailTemplate']);
				//If fail to send activation email alert
				if (!success) {
					sendErrorEmail(fields,"Could not email Nexpose license purchaser his license key.(NEW LICENSE CREATION)");
					//serviceException(emailRecord, "Could not email license purchaser his license key.");
				}
		}
		
		var fields = nlapiLookupField('customrecordr7nexposelicensing',id,new Array('name','custrecordr7nxlicenseexpirationdate','custrecordr7nxproductkey'));
		
		nlapiLogExecution('DEBUG','ProductKey',fields['custrecordr7nxlicenseexpirationdate']);
		
		return new Array(fields['name'],nlapiDateToString(new Date()),fields['custrecordr7nxlicenseexpirationdate'],true,fields['custrecordr7nxproductkey']);
	
	}catch(e){
		sendErrorEmail(fields,"Could not submit new license record "+e); 
		return ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false);
	}
}


function renewExistingNexposeLicense(fields){
	//nlapiLogExecution('DEBUG','In Renew Existing Metasploit Licence Method','yup');
	
	var existingLicense = findNexposeLicenseWithProductKey(fields['productkey']);
	if(existingLicense==null){
		sendErrorEmail(fields,"Could not find provided productKey/Invalid ProductKey "+fields['productkey']); 
			return new Array ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false);
	}
	
	//Loading the license record to be renewed
	var licenseRecord = nlapiLoadRecord('customrecordr7nexposelicensing',existingLicense);
	
	//If not overridden by custbodyr7transactionignorepkvalid set to T
	//If ignorePKValidation is not set to T
	if (fields['custbodyr7transactionignorepkvalid'] != 'T' ) {
	
		//Item id they are renewing 
		var sku = fields['itemid'];
		nlapiLogExecution("DEBUG", 'Renewing SKU', sku);
		
		//Check compatibility
		var isCompatible = isCompatibleSKULicenseNexpose(sku, licenseRecord,fields['']);
		
		//Note compatibility
		nlapiLogExecution('DEBUG', 'SKU: ' + sku + ' License: ' + existingLicense + " Compatible", isCompatible);
		
		//If not compatible, email DZ, SB, and suspend license
		if (!isCompatible) {
			skuLicenseIsIncompatibleProcessing(sku,licenseRecord.getId(),fields['salesorder'],'263');
			return new Array("XXX", nlapiDateToString(new Date()), nlapiDateToString(nlapiAddDays(new Date(), fields['duration'])), false);
		}
	}
	
	
	var presentExpirationDate = nlapiStringToDate(licenseRecord.getFieldValue('custrecordr7nxlicenseexpirationdate'));
	//If presentExpiration Date < today, presentExpirationDate = today
	if(presentExpirationDate <= new Date()){ 
		presentExpirationDate = new Date();
	}
	
	//Computing the expiration date = presentExpirationDate + quantityPurchased*duration
	var daysToBeAdded = parseInt( parseFloat(fields['quantity'])*parseInt(fields['duration']));
	var computedExpirationDate = nlapiAddDays(presentExpirationDate,daysToBeAdded);
	
	//Just changing the expirationDate on the license record for renewals
	licenseRecord.setFieldValue('custrecordr7nxlicenseexpirationdate',nlapiDateToString(computedExpirationDate));
	
	try {
		var id = nlapiSubmitRecord(licenseRecord);
		if(id!=null){
				var emailRecord = nlapiLoadRecord('customrecordr7nexposelicensing',id);
				fields['licenseid'] = emailRecord.getFieldValue('name');
			
				//Sending Activation Email for Nexpose Renewal
				var success = true; //removed this logic
				
				if (!success) {
					//serviceException(emailRecord, "Could not email license purchaser his license key.(RENEWAL PURCHASE)");
					sendErrorEmail(fields,"Could not email Nexpose license purchaser his license key.(RENEWAL PURCHASE)");
				}
		}
		
		var lFields = nlapiLookupField('customrecordr7nexposelicensing',id,new Array('name','custrecordr7nxlicenseexpirationdate'));
		
		nlapiLogExecution('DEBUG','Renewal License Name',lFields['name']);
		
		return new Array(lFields['name'],nlapiDateToString(presentExpirationDate),lFields['custrecordr7nxlicenseexpirationdate'],true);
	
	}catch(err){
		sendErrorEmail(fields,"Could not resubmit renewal license "+fields['productkey']+err); 
		return new Array ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false)	
	}
}

function findNexposeLicenseWithProductKey(productKey){
	var searchFilters = new Array(new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', productKey));
	var searchResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, searchFilters);
	if (searchResults != null && searchResults.length >= 1) {
		return searchResults[0].getId();	
	}
	else{
		return null;
	}
}

function sendNexposeActivationEmail(record,newPurchaseOrRenewal,emailTemplateId){
	nlapiLogExecution('DEBUG','In sendActivationEmail','yup')
	var success= false;
	try {
		if (emailTemplateId != null) {
			//Send email from the salesrep on the license record
			
			var salesRepId = record.getFieldValue('custrecordr7nxlicensesalesrep');
			
			var customerId = record.getFieldValue('custrecordr7nxlicensecustomer');
			if (customerId != null && customerId != ''){
				var accountManagerId = nlapiLookupField('customer', customerId, 'custentityr7accountmanager');
			}
			else {
				var accountManagerId = '';
			}
			
			var sendEmailFrom = accountManagerId;
			if (sendEmailFrom == null || sendEmailFrom == '') {
				sendEmailFrom = salesRepId;
			}
			//If the salesrep email is not found, DZ sends the email
			if (sendEmailFrom == null || sendEmailFrom == '') {
				sendEmailFrom = 340932;
			}
			//Lookup the contact email address
			contactEmailAddress = lookupContactEmail(record.getFieldValue('custrecordr7nxlicensecontact'));
			//Attach the email with the nexpose licensing record
			var records = new Array();
			records['recordtype'] = record.getRecordType();
			records['record'] = record.getId();
			var body = nlapiMergeRecord(emailTemplateId, 
			'customrecordr7nexposelicensing', 
			record.getId()
			);
			
			nlapiLogExecution('DEBUG', 'Sending the b email', 'baboom');
			
			//Send the Email
			nlapiSendEmail(sendEmailFrom, 
			contactEmailAddress, 
			body.getName(), 
			body.getValue(), null, null, records);
			
			success = true;
		} //If emailTemplateId is present
		else{
			//else declare victory and be done. No activation email is sent.
			success = true;
		}
	}catch(e){
		nlapiLogExecution("EMERGENCY",'Could not mail activation email',e);
		nlapiLogExecution("ERROR",'Could not mail activation email',e);
		return success;
	}
	return success;
}



function processMetasploitLicenseForLineItem(fields){
	if(fields['productkey']==null || fields['productkey']==''){
			return createNewMetasploitLicense(fields);
	}else{
			//return new Array('YYYY',null,null,true);
			return renewExistingMetasploitLicense(fields);
	}
}

function createNewMetasploitLicense(fields){
	//Creating new metasploit License record from Template
	var newRecord = nlapiCopyRecord('customrecordr7metasploitlicensing',fields['iidForTemplate']);
	
	//Null out ProductKey, Nexpose License Serial No, Product Serial No
	newRecord.setFieldValue('custrecordr7msproductkey','');
	newRecord.setFieldValue('custrecordr7nxlicenseserialnumber','');
	newRecord.setFieldValue('custrecordr7msproductserialno','');
	
	//Setting Start Date 
	//newRecord.setFieldValue('custrecordr7nxlicenseoemstartdate',nlapiDateToString(new Date())); //No start date for metasploit
	
	//Computing endDate = today + quantityPurchased*duration
	var daysToBeAdded = parseInt( parseFloat(fields['quantity'])*parseInt(fields['duration']));
	var computedExpirationDate = nlapiAddDays(new Date(),daysToBeAdded);
	var endDate = nlapiDateToString(computedExpirationDate);
	
	//Setting End Date
	newRecord.setFieldValue('custrecordr7mslicenseexpirationdate',endDate);
	
	//Setting other miscellaneous fields on the license record
	newRecord.setFieldValue('custrecordr7mslicensesalesrep',fields['salesrep']);
	newRecord.setFieldValue('custrecordr7mslicensecustomer',fields['customer']);
	newRecord.setFieldValue('custrecordr7mslicensesalesorder',fields['salesorder']);
	newRecord.setFieldValue('custrecordr7mslicensecontact',fields['contact']);
	newRecord.setFieldValue('custrecordr7mslicenseopportunity',fields['opportunity']);
	
	try{
		var id = nlapiSubmitRecord(newRecord);
		if(id!=null){
				var emailRecord = nlapiLoadRecord('customrecordr7metasploitlicensing',id);
				fields['licenseid'] = emailRecord.getFieldValue('name');
				var success = sendMetasploitActivationEmail(emailRecord,"newPurchase",fields['activationEmailTemplate']);
				if (!success) {
					sendErrorEmail(fields,"Could not email license purchaser his license key.(NEW LICENSE CREATION)");
					//serviceException(emailRecord, "Could not email license purchaser his license key.");
				}
		}
		
		var fields = nlapiLookupField('customrecordr7metasploitlicensing',id,new Array('name','custrecordr7mslicenseexpirationdate','custrecordr7msproductkey'));
		
		nlapiLogExecution('DEBUG','ProductKey',fields['custrecordr7msproductkey']);
		
		return new Array(fields['name'],nlapiDateToString(new Date()),fields['custrecordr7mslicenseexpirationdate'],true,fields['custrecordr7msproductkey']);
	
	}catch(e){
		sendErrorEmail(fields,"Could not submit new license record "+e); 
		return ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false);
	}
	
}





function renewExistingMetasploitLicense(fields){
	//nlapiLogExecution('DEBUG','In Renew Existing Metasploit Licence Method','yup');
	
	//Finding the existing license
	var existingLicense = findMetasploitLicenseWithProductKey(fields['productkey']);
	if(existingLicense==null){
		sendErrorEmail(fields,"Renewal Process. Could not find provided productKey/Invalid ProductKey "+fields['productkey']); 
			return new Array ("XXX",nlapiDateToString(new Date()),nlapiDateToString(nlapiAddDays(new Date(),fields['duration'])),false);
	}
	
	
	//Loading the license record to be renewed
	var licenseRecord = nlapiLoadRecord('customrecordr7metasploitlicensing',existingLicense);
	
	//If not overridden by custbodyr7transactionignorepkvalid set to T
	//If ignorePKValidation is not set to T
	if (fields['custbodyr7transactionignorepkvalid'] != 'T' ) {
	
		//Item id they are renewing 
		var sku = fields['itemid'];
		nlapiLogExecution("DEBUG", 'Renewing SKU', sku);
		
		//Check compatibility
		var isCompatible = isCompatibleSKULicenseMetasploit(sku, licenseRecord);
		
		//Note compatibility
		nlapiLogExecution('DEBUG', 'SKU: ' + sku + ' License: ' + existingLicense + " Compatible", isCompatible);
		
		//If not compatible, email DZ, SB, and suspend license
		if (!isCompatible) {
			skuLicenseIsIncompatibleProcessing(sku,licenseRecord.getId(),fields['salesorder'],'263');
			return new Array("XXX", nlapiDateToString(new Date()), nlapiDateToString(nlapiAddDays(new Date(), fields['duration'])), false);
		}
	}
	
	
	//If presentExpiration Date < today, presentExpirationDate = today
	var presentExpirationDate = nlapiStringToDate(licenseRecord.getFieldValue('custrecordr7mslicenseexpirationdate'));
	if(presentExpirationDate <= new Date()){ 
		presentExpirationDate = new Date();
	}
	
	//Computing the new expiration date
	var daysToBeAdded = parseInt( parseFloat(fields['quantity'])*parseInt(fields['duration']));
	var computedExpirationDate = nlapiAddDays(presentExpirationDate,daysToBeAdded);
	
	//Just changing the expirationDate on the license record for renewals
	licenseRecord.setFieldValue('custrecordr7mslicenseexpirationdate',nlapiDateToString(computedExpirationDate));
	
	try {
		var id = nlapiSubmitRecord(licenseRecord);
		if(id!=null){
				var emailRecord = nlapiLoadRecord('customrecordr7metasploitlicensing',id);
				fields['licenseid'] = emailRecord.getFieldValue('name');
				var success = true; //removed this logic
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



function sendMetasploitActivationEmail(record,newPurchaseOrRenewal,emailTemplateId){
	nlapiLogExecution('DEBUG','In sendActivationEmail','yup')
	var success= false;
	try {
		if (emailTemplateId != null) {
			//If templateId is not null
			var salesRepId = record.getFieldValue('custrecordr7mslicensesalesrep');
			
			var customerId = record.getFieldValue('custrecordr7mslicensecustomer');
			if (customerId != null && customerId != ''){
				var accountManagerId = nlapiLookupField('customer', customerId, 'custentityr7accountmanager');
			}
			else {
				var accountManagerId = '';
			}
			
			var sendEmailFrom = accountManagerId;
			if (sendEmailFrom == null || sendEmailFrom == '') {
				sendEmailFrom = salesRepId;
			}
			//If the salesrep email is not found, DZ sends the email
			if (sendEmailFrom == null || sendEmailFrom == '') {
				sendEmailFrom = 340932;
			}
			nlapiLogExecution('DEBUG','Email Template Id:',emailTemplateId);	
			//Lookup contact Email address
			contactEmailAddress = lookupContactEmail(record.getFieldValue('custrecordr7mslicensecontact'));
			
			nlapiLogExecution('DEBUG','Contact Email Address',contactEmailAddress);

			//Attaching email to metasploit licensing record
			var records = new Array();
			records['recordtype'] = record.getRecordType();
			records['record'] = record.getId();
			
			var body = nlapiMergeRecord(emailTemplateId, 'customrecordr7metasploitlicensing', record.getId());
			
			nlapiLogExecution('DEBUG','Body of renewal email',body);
			
			nlapiLogExecution('DEBUG', 'Sending the b email', 'baboom');
			
			sendEmailFrom = SEND_ACL_EMAILS_FROM;
			//Sending the email
			nlapiSendEmail(
			sendEmailFrom, 
			contactEmailAddress, 
			body.getName(), 
			body.getValue(), 
			null, 
			null, //bcc 
			records);
			
			
			success = true;
		}
		else{ //If no templateId is found declare victory. No email is sent.
			success = true;
		}
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
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser,adminUser,
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
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser,adminUser,
	'Error on R7_MSLicensing_Unscheduled_ResubmitLicenses',
	message);
}