var approvedOrderTypes = new Array('Billed','Partially Fulfilled','Pending Approval','Pending Fulfillment');
var metasploitOrderType = new Array(210);

function afterSubmit(type){
		
	if (type == 'create' || type == 'edit' || type=='approve') {
		var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		
		nlapiLogExecution('DEBUG','ProductKey Coming In',record.getLineItemValue('item','options',1));
		nlapiLogExecution('DEBUG','ProductKey Coming In',record.getLineItemValue('item','options',2));
		//nlapiLogExecution('DEBUG','ProductKey Coming In',record.getLineItemValue('item','options',3));
				
		//Check if any item needs to TripScript
		var tripScript = false;
		var tripECommercePart = false;
		for (var i = 1; i <= record.getLineItemCount('item'); i++) {
			var activationNeeded = record.getLineItemValue('item','custcolr7transautocreatelicense',i)
			var license = record.getLineItemValue('item','custcolr7translicenseid',i);
			nlapiLogExecution('DEBUG','License, Activation Needed',license + " "+activationNeeded);
			if (activationNeeded=='T' && (license==null || license=='')){
				nlapiLogExecution('DEBUG','Set trip Ecommerce part to true','true');
				tripECommercePart = true;
				tripScript = true;
			} 	
		}
		
		var vsoe1= record.getFieldValue('custbodyr7vsoereviewed');
		var vsoe2= record.getFieldValue('vsoeautocalc');
		var vsoe3= record.getFieldValue('tranisvsoebundle');
		var vsoe4= record.getLineItemValue('item','vsoedelivered',1);
		var vsoe5= record.getLineItemValue('item','vsoeallocation',1);
		var log = "VSORvwd:"+vsoe1+" VSOAtClc:"+vsoe2+" VSODlvrd"+vsoe4+" VSOAlloc"+vsoe5 + " VSOBndle"+ vsoe3;
		nlapiLogExecution('DEBUG','VSOE Fields Coming in',log);
		
		
		var source = record.getFieldValue('source');
		if(source=='')source=null;
		nlapiLogExecution('DEBUG','Source',source);
		
	
		//If source!=null we know it's an E-Commerce Order
		nlapiLogExecution('DEBUG','IS IT ECommerce?',"Source"+source+"TripEcommercePart"+tripECommercePart);
		if( source!=null && (tripECommercePart==true)){
			nlapiLogExecution('DEBUG','In PRocess Ecommerce order','true');
			record = processECommerceOrder(record);		
			oppId = createOpportunityRecord(record);
			record.setFieldValue('opportunity',oppId);
		}
		
		vsoe1= record.getFieldValue('custbodyr7vsoereviewed');
		vsoe2= record.getFieldValue('vsoeautocalc');
		vsoe3= record.getFieldValue('tranisvsoebundle');
		vsoe4= record.getLineItemValue('item','vsoedelivered',1);
		vsoe5= record.getLineItemValue('item','vsoeallocation',1);
		log = "VSORvwd:"+vsoe1+" VSOAtClc:"+vsoe2+" VSODlvrd"+vsoe4+" VSOAlloc"+vsoe5 + " VSOBndle"+ vsoe3;
		nlapiLogExecution('DEBUG','VSOE Fields Before Submit',log);
		
		var id = nlapiSubmitRecord(record,null,true);
		var record2 = nlapiLoadRecord('salesorder',id);
		
		vsoe1= record.getFieldValue('custbodyr7vsoereviewed');
		vsoe2= record.getFieldValue('vsoeautocalc');
		vsoe3= record.getFieldValue('tranisvsoebundle');
		vsoe4= record.getLineItemValue('item','vsoedelivered',1);
		vsoe5= record.getLineItemValue('item','vsoeallocation',1);
		log = "VSORvwd:"+vsoe1+" VSOAtClc:"+vsoe2+" VSODlvrd"+vsoe4+" VSOAlloc"+vsoe5 + " VSOBndle"+ vsoe3;
		nlapiLogExecution('DEBUG','VSOE After Submit Fields',log);

		record2.setFieldValue('vsoeautocalc','F');
		nlapiSubmitRecord(record2,null,true);
		
		if(isApproved(record)){
			nlapiLogExecution('DEBUG','The Script would have tripped','yup');
			if(tripScript)nlapiScheduleScript(173);
		}
		
	}
}

//@param - nlobjRecord salesorder
//returns - false if salesorder is not approved
//returns - true if salesorder has 'status' = 1 of many approved statuses
function isApproved(record){
	var orderStatus = record.getFieldText('orderstatus');
	var status = record.getFieldValue('status');
	//nlapiLogExecution('DEBUG','OrderStatus',orderStatus);
	//nlapiLogExecution('DEBUG','Status',status);
	nlapiLogExecution("DEBUG",'Status + OrderStatus',status + " " + orderStatus);
	
	for(var i=0;approvedOrderTypes!=null && i<approvedOrderTypes.length;i++){
		if(orderStatus == approvedOrderTypes[i])
			return true;
	}
	return false;
}

function processECommerceOrder(record){
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
	
	//If presentLeadSource is null set LeadSource 2002-Website-Rep
	nlapiLogExecution('DEBUG', 'Lead Source Coming In', record.getFieldValue('leadsource'));
	if (record.getFieldValue('leadsource') == '' || record.getFieldValue('leadsource') == null) {
		record.setFieldValue('leadsource', -6);
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
	
	nlapiLogExecution('DEBUG','OrderStatus Coming In',record.getFieldText('orderstatus'));
	if (record.getFieldText('orderstatus') == 'Pending Approval'||
		record.getFieldText('orderstatus') == ''||
		record.getFieldText('orderstatus') == null
		){ 
		//record.setFieldText('orderstatus','B');
		record.setFieldText('orderstatus', 'Pending Fulfillment');
	}
	
	return record;
}

//@param - nlobjRecord salesorder
//
function createOpportunityRecord(record){    
	
	var staticFields = new Array(
	new Array('title','E*Commerce Order Automatically Processed'),
	new Array('entitystatus',13),
	new Array('custbodyr7oppwinlossdescription','E*Commerce Order automatically processed in NetSuite.'),
	new Array('custbodyr7oppwinlosscategory',9),
	new Array('winlossreason',97),
	new Array('custbodyr7oppwinner',48),
	new Array('custbodyr7opportunitytype',6)
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
	
	//fields store all the value of the fields
	var fields = new Array();
	for (var i = 0; i < staticFields.length; i++) {
		oppRecord.setFieldValue(staticFields[i][0], staticFields[i][1]);
		fields[staticFields[i][0]] = staticFields[i][1];
		//nlapiLogExecution('DEBUG','Setting Opportunity field '+staticFields[i][0],staticFields[i][1]);
	}
	for (var i = 0; i < salesOrderFields.length; i++) {
		oppRecord.setFieldValue(salesOrderFields[i][0], record.getFieldValue(salesOrderFields[i][1]));
		fields[salesOrderFields[i][0]] = record.getFieldValue(salesOrderFields[i][1]);
		//nlapiLogExecution('DEBUG','Setting Opportunity field'+salesOrderFields[i][0],record.getFieldValue(salesOrderFields[i][1]));
	}	
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
	nlapiSendEmail(2,2,
	'Error on R7_MSLicensing_SalesOrder_SS',
	text + "<br>" + fieldListing);
	
}



