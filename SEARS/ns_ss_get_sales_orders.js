function ss_sendSalesOrders()
{
	try
	{
		var restletUrl = 'http://initium-commerce-dev.apigee.net/ns-wms/ns-salesorder';      
		var method = "POST";
		//user token
		var token = {
			public: 'K7ZLHaw4xL3sD31DAcbwfxAh0b1b',
			secret: 'YNusTLN3LAFamuMuHxcbhedVOP2L'
		};

		//app credentials
		var oauth = OAuth({
			consumer: {
				public: 'Ey9uBrsnSxl389dZesPsWA38qPvJoU3D',
				secret: 'uZUnMY2DOT1LXAOT'
			},
			signature_method: 'HMAC-SHA1'
		});

		var request_data = {
			url: restletUrl,
			method: method,
			data: {}
		};

		var oauth_data = {
			oauth_consumer_key: oauth.consumer.public,
			oauth_nonce: oauth.getNonce(),
			oauth_signature_method: oauth.signature_method,
			oauth_timestamp: oauth.getTimeStamp(),
			oauth_version: '1.0',
			oauth_token: token.public
		};

		var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
		headerWithRealm.Authorization += ',realm= " " ';
		
		//HTTP headers
        var headers = new Array();
        headers['Content-Type'] = 'application/json';
        headers['Authorization'] = headerWithRealm.Authorization;

        //Setting up Datainput
        var jsonObj = {};
        jsonObj.salesOrders = [];

        //Run search for flagged sales orders
        var arrSearchResults = nlapiSearchRecord(null, 'customsearch_ns_find_wms_sales_order', null, null);
		for (i in arrSearchResults)
		{
			nlapiLogExecution('DEBUG', 'Sales Order #', arrSearchResults[i].getId());
			salesOrderRec = nlapiLoadRecord('salesorder', arrSearchResults[i].getId());

			var jsonSO = {};
			jsonSO.tranid = arrSearchResults[i].getValue('tranid');
			jsonSO.otherrefnum = arrSearchResults[i].getValue('otherrefnum');
			jsonSO.location = arrSearchResults[i].getValue('location');
			jsonSO.trandate = arrSearchResults[i].getValue('trandate');
			jsonSO.billaddressee = arrSearchResults[i].getValue('billaddressee');
			jsonSO.billaddr1 = arrSearchResults[i].getValue('billaddr1');
			jsonSO.billaddr2 = arrSearchResults[i].getValue('billaddr2');
			jsonSO.billcity = arrSearchResults[i].getValue('billcity');
			jsonSO.billstate = arrSearchResults[i].getValue('billstate');
			jsonSO.billzip = arrSearchResults[i].getValue('billzip');
			jsonSO.billcountry = arrSearchResults[i].getValue('billcountry');
			jsonSO.billphone = arrSearchResults[i].getValue('billphone');
			jsonSO.shipaddressee = arrSearchResults[i].getValue('shipaddressee');
			jsonSO.shipaddr1 = arrSearchResults[i].getValue('shipaddr1');
			jsonSO.shipaddr2 = arrSearchResults[i].getValue('shipaddr2');
			jsonSO.shipcity = arrSearchResults[i].getValue('shipcity');
			jsonSO.shipstate = arrSearchResults[i].getValue('shipstate');
			jsonSO.shipzip = arrSearchResults[i].getValue('shipzip');
			jsonSO.shipcountry = arrSearchResults[i].getValue('shipcountry');
			jsonSO.shipphone = arrSearchResults[i].getValue('shipphone');
			jsonSO.shipmethod = arrSearchResults[i].getValue('shipmethod');
			jsonSO.source = arrSearchResults[i].getValue('source');

			//Still needed?
				//billemailaddress
				//gsthstamount
				//pstqstamount
				//scac
				//shipemailaddress
			nlapiLogExecution('DEBUG', 'JSON Object', JSON.stringify(jsonSO));

			jsonSO.items = [];

			//Iterate through line items on order
			intNumItems = salesOrderRec.getLineItemCount('item');
			for (var j = 1; j <= intNumItems; j++)
			{
				var jsonItem = {};

				jsonItem.line = j;
				jsonItem.description = salesOrderRec.getLineItemValue('item', 'decription', j);
				jsonItem.rate  = salesOrderRec.getLineItemValue('item', 'rate', j);
				jsonItem.quantity  = salesOrderRec.getLineItemValue('item', 'quantity', j);

				//Still needed?
					//itemgsthstamount
					//itempsthstamount

				jsonSO.items.push(jsonItem);
			}
			jsonObj.salesOrders.push(jsonSO);

			//Set to true when ready to release to prod
			if(true)
			{
				salesOrderRec.setFieldValue('custbody_sent_to_apigee', 'T');
				nlapiSubmitRecord(salesOrderRec);
			}
		}

		//Stringifying JSON
	    var myJSONText = JSON.stringify(jsonObj);

		restResponse = nlapiRequestURL(restletUrl, myJSONText, headers, null, method);

		nlapiLogExecution('DEBUG', 'Rest Response', restResponse.getBody());
		nlapiLogExecution('DEBUG', 'Rest Code', restResponse.getCode());
		nlapiLogExecution('DEBUG', 'Rest Error', restResponse.getError());
	    nlapiLogExecution('DEBUG', 'Restlet URL', restletUrl);
	    nlapiLogExecution('DEBUG', 'Generated OAuth header ', headerWithRealm.Authorization)
		nlapiLogExecution('DEBUG', 'JSON', 'Data: ' + myJSONText);
	}
	catch(error)
	{
		if (error.getDetails != undefined)
        {
           nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
           throw error;
        }
        else
        {
           nlapiLogExecution('ERROR','Unexpected Error', error.toString()); 
           throw nlapiCreateError('99999', error.toString());
        }
	}
}