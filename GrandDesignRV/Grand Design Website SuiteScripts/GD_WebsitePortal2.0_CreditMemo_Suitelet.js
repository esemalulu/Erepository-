/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       6 Jul 2017     brians
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GDWebsiteCreditMemoSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);		
	
	var HTMLfield = form.addField('custpage_creditmemohtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('entity',null,'anyof', ['@CURRENT@'])); //Filter: "Dealer is mine"
	filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn('tranid').setSort(true));
	columns.push(new nlobjSearchColumn('trandate'));
	columns.push(new nlobjSearchColumn('otherrefnum'));
	columns.push(new nlobjSearchColumn('custbodyrvsunit'));
	columns.push(new nlobjSearchColumn('total'));
	columns.push(new nlobjSearchColumn('memo'));
	columns.push(new nlobjSearchColumn('status'));
	
	var results = GetSteppedSearchResults('creditmemo', filters, columns, null);
	if(results != null && results.length > 0)
	{
		returnObj.creditMemos = [];
		var obj = '';
		for(var i = 0; i < results.length; i++)
		{
			obj = {};
			obj.id = results[i].getId();
			obj.tranid = results[i].getValue('tranid');
			obj.trandate = results[i].getValue('trandate');
			obj.poNumber = results[i].getValue('otherrefnum');
			obj.unit = results[i].getText('custbodyrvsunit');
			obj.total = results[i].getValue('total');
			obj.status = {"id":results[i].getValue('status'), "name": results[i].getText('status')};
			obj.memo = results[i].getValue('memo');
			returnObj.creditMemos.push(obj);
		}
	}
	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	var context = nlapiGetContext();

	returnObj.role = context.getRole();
	returnObj.urlString = domain + '/app/accounting/transactions/custcred.nl?compid=' + acct;
	
	var datafield = form.addField('custpage_creditmemodata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(GD_BUNDLE_FILES_MODULE_PORTALCREDITMEMO);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}