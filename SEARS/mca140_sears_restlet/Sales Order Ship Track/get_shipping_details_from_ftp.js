var categoriesToReturn = [] ;

function getShippingDetailsfromFTP() {

	var url = "http://initium-commerce-dev.apigee.net/sears-ftp/read?initial-directory=/QA/Outgoing";
    var response = nlapiRequestURL(url, null, null, 'POST');
    var result = JSON.parse(response.getBody());
    var xml = result["messages"][0];
	var asDoc = nlapiStringToXML(xml);
    var scanNodes = nlapiSelectNodes(asDoc, '//Scan');
    var data_list = [];
    for (var i = 0; i < scanNodes.length; i++) {
		var data = new Object();

		data['TrackingNumber'] = nlapiSelectValue(scanNodes[i], "@TrackingNumber");

		var shipmentNode = nlapiSelectNode(scanNodes[i], "//Shipment");
		data['BillToAccountNumber'] = nlapiSelectValue(shipmentNode, "@BillToAccountNumber");
		data['SalesOrderNo'] = nlapiSelectValue(shipmentNode, "@SalesOrderNo");

        if(typeof data['SalesOrderNo'] != "undefined" && data['SalesOrderNo'] != ""){
        	var filters = new Array();

			filters[0] = new nlobjSearchFilter('custbody_sears_sales_ordernum', null, 'is', data['SalesOrderNo']);

			var salesOrderList = nlapiSearchRecord("salesorder", null, filters,null);

			if(typeof salesOrderList[0] != "undefined"){
				var so = nlapiLoadRecord('salesorder',salesOrderList[0]['id']);
				so.setFieldValue("shipcomplete","T");
				nlapiSubmitRecord(so);
			}

        }
		
		
   
		var itemNode = nlapiSelectNode(shipmentNode, "//Item");
		data['Pieces'] = nlapiSelectValue(itemNode, "@Pieces");

		var shipToNode = nlapiSelectNode(shipmentNode, "//ShipTo");
		data['Address'] = nlapiSelectValue(shipToNode, "@Address");
		data['City'] = nlapiSelectValue(shipToNode, "@City");
		data['Email'] = nlapiSelectValue(shipToNode, "@Email");

	    data_list.push(data);

	}

	return JSON.stringify(data_list);

}

function postShippingDetailsfromFTP() {
	
}