/**
 * Module Description
 * 
 */

//var nsSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_searchid');

//Sample MapsBI Access
var mbiApiKey = 'ceab6d17-2deb-430e-8a6d-1cb805b46a40';

function syncNsToMapsBiSample(type) {
	
	/**
	//Lookup all Datasets created via API
	var listDsUrl = 'https://mapsbi.com/services/api/ListDatasets?apiKey='+mbiApiKey+'&output=json';
	var listDsRes = nlapiRequestURL(listDsUrl);
	//returned is array of json
	*/
	
	//Upload Data to Data set 9 - Dataset created via API linked to Saved Search ID 91 (MapsBI-Sample Search)
	var uploadDsUrl = 'https://mapsbi.com/services/api/UploadData?apiKey='+mbiApiKey+'&output=json&datasetId=9';
	var wrapperDsXml = '<DatasetData xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api">'+
					   	'<DataRows>#DATAROWS#</DataRows>'+
					   '</DatasetData>';
	
	var dataRowTemplate = '<DataRow>'+
						  	'<DataColumns>'+
								'<DataColumn>'+
									'<Name>Customer Country</Name>'+
									'<Value>#NSCOUNTRYCODE#</Value>'+
								'</DataColumn>'+
								'<DataColumn>'+
									'<Name>Customer Address 1</Name>'+
									'<Value>#NSADDR1#</Value>'+
								'</DataColumn>'+
								'<DataColumn>'+
									'<Name>Customer Address 2</Name>'+
									'<Value>#NSADDR2#</Value>'+
								'</DataColumn>'+
								'<DataColumn>'+
									'<Name>Customer City</Name>'+
									'<Value>#NSCITY#</Value>'+
								'</DataColumn>'+
								'<DataColumn>'+
									'<Name>Customer Province/State</Name>'+
									'<Value>#NSSTATE#</Value>'+
								'</DataColumn>'+
								'<DataColumn>'+
									'<Name>Customer Zip</Name>'+
									'<Value>#NSZIP#</Value>'+
								'</DataColumn>'+
								'<DataColumn>'+
									'<Name>Customer Name</Name>'+
									'<Value>#NSCUSTNAME#</Value>'+
								'</DataColumn>'+
								'<DataColumn>'+
									'<Name>Date</Name>'+
									'<Value>#NSTRXDATE#</Value>'+
								'</DataColumn>'+
								'<DataColumn>'+
									'<Name>Amount</Name>'+
									'<Value>#NSTRXAMOUNT#</Value>'+
								'</DataColumn>'+
							'</DataColumns>'+
							'<RowId>#NSINTERNALID#</RowId>'+
						'</DataRow>';
	//get result set from Saved Search
	var ssrs = nlapiSearchRecord(null, 91, null, null);
	
	if (ssrs && ssrs.length > 0) {
		var strDataRows = '';
		//only when it has results
		for (var s=0; s < ssrs.length; s++) {
			//only process when there is Country defined
			var tctr = ssrs[s].getValue('countrycode','customer');
			log('debug','state',ssrs[s].getValue('statedisplayname','customer'));
			log('debug','Searched: ', tctr);
			
			if (tctr) {
				//var twrap = wrapperDsXml;
				var tdx = dataRowTemplate;
				var tdate = ssrs[s].getValue('trandate');
				var tdobj = new Date(tdate);
				//reformat to MapsBI Format: YYYY-MM-DD
				tdate = tdobj.getFullYear()+'-'+(tdobj.getMonth()+1)+'-'+tdobj.getDate();
				log('debug','addr 1',ssrs[s].getValue('address1','customer'));
				tdx = tdx.replace('#NSCOUNTRYCODE#', tctr);
				tdx = tdx.replace('#NSADDR1#', ((ssrs[s].getValue('address1','customer'))?nlapiEscapeXML(ssrs[s].getValue('address1','customer')):''));
				tdx = tdx.replace('#NSADDR2#', ((ssrs[s].getValue('address2 ','customer'))?nlapiEscapeXML(ssrs[s].getValue('address2','customer')):''));
				tdx = tdx.replace('#NSCITY#', ((ssrs[s].getValue('city','customer'))?nlapiEscapeXML(ssrs[s].getValue('city','customer')):''));
				tdx = tdx.replace('#NSSTATE#', ((ssrs[s].getValue('statedisplayname','customer'))?nlapiEscapeXML(ssrs[s].getValue('statedisplayname','customer')):''));
				tdx = tdx.replace('#NSZIP#', ((ssrs[s].getValue('zipcode','customer'))?nlapiEscapeXML(ssrs[s].getValue('zipcode','customer')):''));
				tdx = tdx.replace('#NSCUSTNAME#', nlapiEscapeXML(ssrs[s].getText('entity')));
				tdx = tdx.replace('#NSTRXDATE#', tdate);
				tdx = tdx.replace('#NSTRXAMOUNT#', ssrs[s].getValue('amount'));
				tdx = tdx.replace('#NSINTERNALID#', ssrs[s].getId());
				
				strDataRows += tdx;
				//twrap = twrap.replace('#DATAROWS#', tdx);
				
			}
		}
		
		if (strDataRows.length > 0) {
			wrapperDsXml = wrapperDsXml.replace('#DATAROWS#', strDataRows);
			
			var uploadDsRes = nlapiRequestURL(uploadDsUrl, wrapperDsXml, null, 'POST');
			if (uploadDsRes.getBody().indexOf('"Status":"OK"') > -1) {
				log('debug','Added Records',uploadDsRes.getBody());
			} else {
				log('error','Error adding/updating','errored');
			}
		}
								
	}
	
	/**
	//Create DataSet Using Saved Search ID 91 (MapsBI-Sample Search)
	var searchTitle = 'NS MapsBI-Sample Search (91) New';
	var createDsUrl = 'https://mapsbi.com/services/api/CreateDatasetDefinition?apiKey='+mbiApiKey+'&output=json';
	var createDsXml = '<DatasetDefinition xmlns="http://schemas.datacontract.org/2004/07/Inovex.Map.Api">'+
						'<ColumnSet>'+
							'<Column>'+
								'<Name>Customer Country</Name>'+
								'<Type>LOCATION.COUNTRY</Type>'+
							'</Column>'+
							'<Column>'+
								'<Name>Customer Address 1</Name>'+
								'<Type>LOCATION.ADDRESS1</Type>'+
							'</Column>'+
							'<Column>'+
								'<Name>Customer Address 2</Name>'+
								'<Type>LOCATION.ADDRESS2</Type>'+
							'</Column>'+
							'<Column>'+
								'<Name>Customer City</Name>'+
								'<Type>LOCATION.CITY</Type>'+
							'</Column>'+
							'<Column>'+
								'<Name>Customer Province/State</Name>'+
								'<Type>LOCATION.PROV_STATE</Type>'+
							'</Column>'+
							'<Column>'+
								'<Name>Customer Zip</Name>'+
								'<Type>LOCATION.ZIP_POSTAL</Type>'+
							'</Column>'+
							'<Column>'+
								'<Name>Customer Name</Name>'+
								'<Type>TEXT</Type>'+
							'</Column>'+
							'<Column>'+
								'<Name>Date</Name>'+
								'<Type>TIMELINE</Type>'+
							'</Column>'+
							'<Column>'+
								'<Name>Amount</Name>'+
								'<Type>FLOAT</Type>'+
							'</Column>'+
						'</ColumnSet>'+
						'<DatasetName>'+searchTitle+'</DatasetName>'+
					'</DatasetDefinition>';
		//send request to MapsBI
		var createDsRes = nlapiRequestURL(createDsUrl, createDsXml);
		
		log('debug','res',createDsRes.getBody());
	*/
	
}
