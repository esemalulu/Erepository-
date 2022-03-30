/**
 * Module Description
 * Button for sending the Parent Gym form link to client
 
 * Version    Date            Author           Remarks
 * 1.0		  31 Jan 2017	  apple.villanueva
 */
 
function beforeLoad_SendParentGymForm(type, form, request){
	if(type == 'view'){		
		if(isParentGym()){
			
			var stUrl = nlapiResolveURL(
				'SUITELET',
				'customscript_aux_sl_parentgymform',
				'customdeploy_aux_sl_parentgymform'
			)+
			'&action=senderpopup'+
			'&sender='+nlapiGetUser()+
			'&companyname='+nlapiGetFieldValue('companyname')+
			'&clientid='+nlapiGetRecordId();	
			
			var popupSender = "nlOpenWindow('" + stUrl + "', 'custom_popup', 'width=500,height=300,resizable=yes,scrollbars=yes')";
			form.addButton('custpage_sendparentgymformlink','Email Parent Gym Form', popupSender); 
						
			//form.addButton('custpage_sendparentgymformlink', 'Email Parent Gym Form', 'sendParentGymForm()');
			//form.setScript('customscript_aux_cs_send_parentgymform');
		}
	}
}

function isParentGym(){
	
	var stParentGymCategory = nlapiGetContext().getSetting('SCRIPT','custscript_parentgym_categoryid');
	
	if(stParentGymCategory && nlapiGetFieldValue('category') == stParentGymCategory){
		return true;
	}
	
	return false;
	
}

/*
function sendParentGymForm(){
	
	var stUrl = nlapiResolveURL('SUITELET', 'customscript_aux_sl_parentgymform', 'customdeploy_aux_sl_parentgymform');
	
	var customerDetails = nlapiLookupField('customer', nlapiGetRecordId(), ['email', 'companyname']);
	
	var params = new Array();
	params['action'] = 'senderpopup';
	params['sender'] = nlapiGetUser();
	params['companyname'] = customerDetails.companyname;
	params['clientid'] = nlapiGetRecordId();
					
	var objResponse = nlapiRequestURL(stUrl, params);	//POST call
	if(objResponse.getCode() == '200'){
		var stBody = objResponse.getBody();
		alert(stBody);
	} else {
		alert('Error: ' + objResponse.getCode() + ' - ' + objResponse.getBody());
	}
	
}
*/