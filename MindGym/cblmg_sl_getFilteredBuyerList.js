//
/**
 * Suitelet used by Client script to get list of contacts attached to customer record.
 * @param req
 * @param res
 */

function getFilteredBuyerList(req, res) {
	
	var customerId = req.getParameter('customerid');
	var retjson = {
		"status":false,
		"err":"",
		"list":new Array()
	};
	try {
		
		//only execute if clientId is set
		if (customerId) {
			
			//search for ALL contacts for client
			var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', customerId),
			            new nlobjSearchFilter('isinactive','contact','is','F')];
			var ccol = [new nlobjSearchColumn('internalid', 'contact',null),
			            new nlobjSearchColumn('company', 'contact',null),
			            new nlobjSearchColumn('firstname', 'contact',null).setSort(),
			            new nlobjSearchColumn('lastname', 'contact',null)];
			var crs = nlapiSearchRecord('customer', null, cflt, ccol);
			
			if (crs && crs.length > 0) {
				for (var c=0; c < crs.length; c++) {
					
					var ctid = crs[c].getValue('internalid', 'contact', null);
					var ctdisplay = crs[c].getText('company', 'contact', null)+' : '+
									(crs[c].getValue('firstname', 'contact', null)?crs[c].getValue('firstname', 'contact', null):'')+' '+
									(crs[c].getValue('lastname', 'contact', null)?crs[c].getValue('lastname', 'contact', null):'');
					retjson['list'].push({
						'id':ctid,
						'text':ctdisplay
					});
				}
				retjson['status'] = true;
			} else {
				retjson['err'] = 'No Results found';
			}
		}
		
	} catch (buyerlisterr) {
		log('error','Error getting buyer list',customerId+' customer failed searching for all buyers: '+getErrText(buyerlisterr));
		retjson['err'] = 'Error occured: '+getErrText(buyerlisterr);
	}
	log('debug','json',JSON.stringify(retjson));
	res.write(JSON.stringify(retjson));
	
}