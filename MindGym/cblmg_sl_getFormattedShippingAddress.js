
/**
 * Suitelet used by Client script to get formatted shipping address based on record type and record id
 * @param req
 * @param res
 */

function getFormattedShippingAddress(req, res) {
	
	var recid = req.getParameter('recid');
	var rectype = req.getParameter('rectype');
	//Added Nov 30 2015 - Tix 5515
	var locid = req.getParameter('locid');
	var retjson = {
		"status":false,
		"err":"",
		"address":{
			"attn":"",
			"adree":"",
			"phone":"",
			"adr1":"",
			"adr2":"",
			"adr3":"",
			"city":"",
			"state":"",
			"zip":"",
			"country":""
		}
	};
	
	try 
	{
		//Tix5515 - Load Alphaprint location address and pass it back
		if (locid && locid == '16')
		{
			//11 is internal id of alphaprint
			var locrec = nlapiLoadRecord('location','11');
			retjson['address'].attn = locrec.getFieldValue('attention');
			retjson['address'].adree = locrec.getFieldValue('addressee');
			retjson['address'].phone = locrec.getFieldValue('addrphone');
			retjson['address'].adr1 = locrec.getFieldValue('addr1');
			retjson['address'].adr2 = locrec.getFieldValue('addr2');
			retjson['address'].adr3 = locrec.getFieldValue('addr3');
			retjson['address'].city = locrec.getFieldValue('city');
			retjson['address'].state = locrec.getFieldValue('state');
			retjson['address'].zip = locrec.getFieldValue('zip');
			retjson['address'].country = locrec.getFieldText('country');
			
			retjson['status'] = true;
		}
		//only execute if clientId is set
		else if (recid && rectype) 
		{
			
			//search for shipping or billing address for record
			var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', recid),
			            new nlobjSearchFilter('isinactive',null,'is','F')];
			
			var ccol = [new nlobjSearchColumn('shipaddress1'),
			            new nlobjSearchColumn('shipaddress2'),
			            new nlobjSearchColumn('shipaddress3'),
			            new nlobjSearchColumn('shipattention'),
			            new nlobjSearchColumn('shipphone'),
			            new nlobjSearchColumn('shipaddressee'),
			            new nlobjSearchColumn('shipcity'),
			            new nlobjSearchColumn('shipstate'),
			            new nlobjSearchColumn('shipzip'),
			            new nlobjSearchColumn('shipcountry')];
			var crs = nlapiSearchRecord(rectype, null, cflt, ccol);
			
			if (crs && crs.length > 0) {
				
				retjson['address'].attn = crs[0].getValue('shipattention');
				retjson['address'].adree = crs[0].getValue('shipaddressee');
				retjson['address'].phone = crs[0].getValue('shipphone');
				retjson['address'].adr1 = crs[0].getValue('shipaddress1');
				retjson['address'].adr2 = crs[0].getValue('shipaddress2');
				retjson['address'].adr3 = crs[0].getValue('shipaddress3');
				retjson['address'].city = crs[0].getValue('shipcity');
				retjson['address'].state = crs[0].getValue('shipstate');
				retjson['address'].zip = crs[0].getValue('shipzip');
				retjson['address'].country = crs[0].getText('shipcountry');
				
				retjson['status'] = true;
			} else {
				retjson['err'] = 'No Results found';
			}
		} else {
			retjson['err'] = 'Missing required record type and/or id';
		}
		
	} catch (addrerr) {
		log('error','Error getting '+rectype+' shipping address ',recid+' failed: '+getErrText(addrerr));
		retjson['err'] = 'Error occured: '+getErrText(addrerr);
	}
	log('debug','json',JSON.stringify(retjson));
	res.write(JSON.stringify(retjson));
	
}