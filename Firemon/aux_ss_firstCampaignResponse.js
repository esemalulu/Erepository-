/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Jul 2016     WORK-rehanlakhani
 * customsearch2130
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) 
{
	var stageVals = ["LEAD", "PROSPECT"];
	
	var sf = [
	          	new nlobjSearchFilter('stage', null, 'anyof', stageVals),
	          	new nlobjSearchFilter('leadsource', null, 'anyof','@NONE@'),
	          	new nlobjSearchFilter('internalid', 'campaignresponse', 'noneof', '@NONE@'),
	          	new nlobjSearchFilter('isinactive', 'campaignresponse', 'is', 'F')
	         ];
	
	var sc = [
	          	new nlobjSearchColumn('companyname', null, 'GROUP'),
	          	new nlobjSearchColumn('internalid', null, 'GROUP'),
	          	new nlobjSearchColumn('title', 'campaignResponse', 'MIN'),
	          	new nlobjSearchColumn('responsedate', 'campaignResponse', 'MIN').setSort()
	         ];
	
	var rs = nlapiSearchRecord('customer', null, sf, sc);
	if(rs != null)
	{
		for(var i = 0; i < rs.length; i+=1)
		{
			var recordId = rs[i].getValue(sc[1]);
			var resDate  = rs[i].getValue(sc[3]);
			var title	 = rs[i].getValue(sc[2]);
			var prevCompany;
			
			if(prevCompany != recordId)
			{
				var custRec = nlapiLoadRecord('customer', recordId);
					custRec.setFieldText('leadsource', title);
				nlapiSubmitRecord(custRec, false, true);
				prevCompany = recordId;
			}
			else
			{
				continue;
			}
		}
	}
}
