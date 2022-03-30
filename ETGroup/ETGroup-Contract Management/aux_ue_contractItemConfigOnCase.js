/**
 * Author: js@Audaxium
 * User event deployed for Support Case record to handle contract item support
 */

function supportCaseBeforeLoad(type, form, req){
	
	//add hidden field to capture redirect from SL
	var hiddenCustomRedirect = form.addField('custpage_customredirect','checkbox','',null,null);
	hiddenCustomRedirect.setDisplayType('hidden');
	
	var hiddenCitems = form.addField('custpage_citems_sl','textarea','',null,null);
	hiddenCitems.setDisplayType('hidden');
	
	var hiddenOnCase = form.addField('custpage_oncase','textarea','',null,null);
	hiddenOnCase.setDisplayType('hidden');
	
	if (req) {
		if (req.getParameter('fromsl')=='yes') {
			hiddenCustomRedirect.setDefaultValue('T');
		}
	}
	
	if (type=='edit' || type=='create') {
		
		if (type == 'create' && req) {
			
			if (req.getParameter('reqcontractitems')) {
				hiddenCitems.setDefaultValue(req.getParameter('reqcontractitems'));
			}
			
			if (req.getParameter('reqcustomer')) {
				nlapiSetFieldValue('company', req.getParameter('reqcustomer'));
			}
			
		}
		var configBtn = form.addButton('custpage_btn_contractitemconfig','Attach Contract Item(s) to this Case','openContractItemConfig()');
	}
	
}

function supportCaseAfterSubmit(type) {
	if (nlapiGetFieldValue('custpage_customredirect')=='T') {
		nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetNewRecord().getId(), false);
	}
}