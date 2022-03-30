/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */

	
	
function emailBeforeSubmit(){
	
	var procmsg = '';
		
	var soID = nlapiGetRecordId();	
	var SOrec = nlapiLoadRecord(nlapiGetRecordType(),soID);
	
	var trans = SOrec.getFieldValue('tranid');
	var ordertype = SOrec.getFieldValue('custbody_order_type');	
	var reseller = SOrec.getFieldValue('custbody_reseller');	
	
	var endusr = SOrec.getFieldValue('custbody_end_user');				
	var cusRec = nlapiLoadRecord('customer', endusr);
		
	var partneremail = cusRec.getFieldValue('email');	                     //Partner Sale Email  
	var directemail = SOrec.getFieldValue('custbody_tricerat_contactemail'); //Direct Email for the 
	
	var slsrep = SOrec.getFieldValue('salesrep');
	
	var emailTemplate_1_FileId = '1915165'; //PRODUCT Fulfillment Template 
	var emailTemplate_2_FileId = '1922350'; //RENEWAL Fulfillment Template 
		
   var arrSearchFilters = [new nlobjSearchFilter('custrecord_ordref', null, 'anyof', soID ),
                           new nlobjSearchFilter('custitem_afa150220_producturl', 'custrecord_license_itemref', 'isnot','')];
	 
	var arrSearchColumns = [new nlobjSearchColumn('custrecord_license_itemref'),
	                        new nlobjSearchColumn('custrecord_serialnumber'),
                            new nlobjSearchColumn('custitem_afa150220_producturl', 'custrecord_license_itemref')];		
	
	
	 var records = new Object();
	 records['transaction'] = soID;
	
	
	if(ordertype =='1' || ordertype=='3'){
		
	var lscr = nlapiSearchRecord ('customrecord_licenses', null, arrSearchFilters, arrSearchColumns);					
 	var allCols = lscr[0].getAllColumns();
	var materialList = '';
	
	//Loop through each result and add in the Body
	for (var r=0; r < lscr.length; r++) {
	
	var eachRowValue = '';
	//Loop through each columns and add the value
	for (var h=0; h < allCols.length; h++) {

		
	var rowValue = lscr[r].getText(allCols[h]);
		
	if (!rowValue) {
	rowValue = lscr[r].getValue(allCols[h]);
	}

	eachRowValue += '<td align="left" >'+nlapiEscapeXML(rowValue)+'</td>';	
		
	}
	materialList += '<tr style="padding-top: 2px; padding-bottom: 2px;">'+eachRowValue+'</tr>';
	}		
	
			
		try{
				
			var htmlXml = nlapiLoadFile(emailTemplate_1_FileId).getValue();	
			htmlXml = htmlXml.replace('#ITEMLIST#',materialList );		
			
			var renderer = nlapiCreateTemplateRenderer();
			renderer.addRecord('salesorder', SOrec);	
			renderer.addRecord('customer', cusRec);		
			renderer.setTemplate(htmlXml);
			var renderHTML = renderer.renderToString();
			
			
			if(reseller){
														   //partneremail
			var newEmail = nlapiSendEmail(slsrep, 'elijah@audaxium.com', 'Order Status: Order #' +trans+ ' has been Fulfilled',renderHTML , null, null,records);
	
			}else if(!reseller){
														   //directemail
			var newEmail = nlapiSendEmail(slsrep, 'elijah@audaxium.com', 'Order Status: Order #' +trans+ ' has been Fulfilled',renderHTML , null, null,records);
				
			}			

			
		} catch (e) {
			log('error','Error Generating Email', getErrText(e));
			procmsg = 'ERROR generating Email: '+getErrText(e);
		}	
			
	}
	
	
	

	if(ordertype =='2'){
		
		try{		
	
		var htmlXml = nlapiLoadFile(emailTemplate_2_FileId).getValue();	
					
		var renderer = nlapiCreateTemplateRenderer();
		renderer.addRecord('salesorder', SOrec);	
		renderer.addRecord('customer', cusRec);		
		renderer.setTemplate(htmlXml);
		var renderHTML = renderer.renderToString();
		
		if(reseller){
			   												//partneremail
			var newEmail = nlapiSendEmail(slsrep, 'elijah@audaxium.com', 'Order Status: Order #' +trans+ ' has been Fulfilled',renderHTML , null, null,records);

		}else if(!reseller){
			   												//directemail
			var newEmail = nlapiSendEmail(slsrep, 'elijah@audaxium.com', 'Order Status: Order #' +trans+ ' has been Fulfilled',renderHTML , null, null,records);

		}
		
	}catch(e) {
		   nlapiLogExecution('ERROR', e.getCode(), e.getDetails());    			
    }
	
	}
	
	
	

	
}

	
	