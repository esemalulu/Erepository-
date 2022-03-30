/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Nov 2015     clayr
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function clientSaveRecordItem(){

	try {
		
		var response = true;
		var type = nlapiGetRecordType();
		var sku = nlapiGetFieldValue('itemid');
		
		var seasonFieldChanged = nlapiGetFieldValue('custitem_season_field_changed');
		
		if (seasonFieldChanged == 'T') {
			
			var seasonField = nlapiGetFieldText('custitemseasonal');
			
			var url = "http://173.160.206.243:9001";
			var postData = '{"meta":{"provider":"ratt","version":"clay_dev","service":"RattSku","procedure":"updateRattSkuSeason"},' + 
							'"arguments":{"externalId":"' + sku + '","season":"' + seasonField + '"}}';
						
			var header = {"content-type":"application/json","message-type":"json","auth-token":"vd7VcIJmz6Xdle7iDqpgrZhdAjHicXILoMl35UYGaX8qd5xO4LnTeQTaUwBkynQa"};
			
			var callback = null;
			var httpMethod = null;
			
			var response = nlapiRequestURL(url,postData,header);
			
			var json = response.body.json;
			
			var strResponse = JSON.stringify(response);
			
			nlapiLogExecution('DEBUG', 'Request URL Response', 'Response: ' + strResponse);
			
			//nlapiLogExecution('DEBUG', 'Request URL Response','Body: ' + response.body + "; Data: " + json);

		}
		
		nlapiLogExecution('DEBUG', 'Save Item Record', 'type: ' + type + '; sku: ' + sku + 
				'; seasonFieldChanged: ' + seasonFieldChanged);
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Save Item Record', 'type: ' + type + '; sku: ' + sku + 
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
		var response = false;
		
	}
	
    return response;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function clientFieldChangedSeasonal(type, name, linenum){
	
	try {
		
		if (name == 'custitemseasonal') {
			
			nlapiSetFieldValue('custitem_season_field_changed','T');
			
			var seasonField = nlapiGetFieldText('custitemseasonal');
			
			nlapiLogExecution('DEBUG', 'Field Changed', 'SubList: ' + type + '; Field: ' + name + '; Linenum: ' + linenum + 
					'; Season Field: ' + seasonField);
		
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Field Changed', 'SubList: ' + type + '; Field: ' + name + '; Linenum: ' + linenum + 
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
	
}
