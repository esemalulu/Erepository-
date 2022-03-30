/**
 * Author: js@Audaxium
 * User event deployed for Contract Header
 * 
 */

function userEventBeforeLoad(type, form, request) {
	//create hidden custom field to customize redirect after save
	var hiddenCustomRedirect = form.addField('custpage_customredirect','checkbox','',null,null);
	hiddenCustomRedirect.setDisplayType('hidden');
	
	//set default values for name
	if (type=='create' && nlapiGetContext().getExecutionContext()=='userinterface') {
		nlapiSetFieldValue('name','AUTO Generate-DO NOT SET');
	}
	
	//when it's from Suitelet, set redirect URL back to Contract Header in View mode
	if (request && request.getParameter('fromsl')=='yes') {
		hiddenCustomRedirect.setDefaultValue('T');
	}
	
	//add create case button on View mode only
	if (type=='view') {
		var newCaseGeneratorUrl = nlapiResolveURL('SUITELET',
				   'customscript_ax_sl_contractitem_config',
				   'customdeploy_ax_sl_contractitem_config')+'&custpage_contractheader='+nlapiGetRecordId()+'&custpage_customerid='+nlapiGetFieldValue('custrecord_acmch_customer')+
				   '&custpage_rectype='+nlapiGetRecordType();

		var configBtn = form.addButton('custpage_btn_contractitemconfig',
		'Create New Case',
		'window.open(\''+newCaseGeneratorUrl+'\', \'\', \'width=1100,height=750,resizable=yes,scrollbars=yes\');return true;');
	}
	
}

function userEventAfterSubmit(type){
	var contractName = '';
	
	try {
		if (type == 'create') {
			//when type is create, depending on who is creating it, generate name
			if (nlapiGetContext().getExecutionContext()=='suitelet') {
				//contract header is generated by Suitelet.
				//auto generate contract name as Contract#[internalid]_[customer name]
				var customerText = nlapiGetFieldText('custrecord_acmch_customer');
				contractName = 'Contract#'+nlapiGetRecordId()+' '+customerText;
			} else if (nlapiGetContext().getExecutionContext()=='userinterface') {
				contractName = 'Contract#'+nlapiGetRecordId()+' '+nlapiGetFieldValue('custrecord_acmch_postfix');
			}
			if (contractName) {
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'name', contractName);
			}
		}
		
		if (type == 'edit' && nlapiGetContext().getExecutionContext()=='userinterface') {
			contractName = 'Contract#'+nlapiGetRecordId()+' '+nlapiGetFieldValue('custrecord_acmch_postfix');
			//if different, update it
			if (nlapiGetFieldValue('name') != contractName) {
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'name', contractName);
			}
			
			//redirect the user to THIS contract header record if it came from Suitelet
			if (nlapiGetFieldValue('custpage_customredirect')=='T') {
				nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), false);
			}
		}
		
	} catch (cheaderError) {
		var sbj = 'Error processing Contract header aftersubmit';
		var msg = 'Error Contract Header Processing<br/>'+
				  'Contract Header ID: '+nlapiGetRecordId()+'<br/>'+
				  'Execution Context: '+nlapiGetContext().getExecutionContext()+'<br/>'+
				  'User: '+nlapiGetContext().getName()+'<br/>'+
				  'Error Message:<br/>'+
				  getErrText(cheaderError);
		nlapiSendEmail(-5, 'joe.son@audaxium.com', sbj, msg);
		log('error','Error processing contract header',getErrText(cheaderError));
	}
	
}