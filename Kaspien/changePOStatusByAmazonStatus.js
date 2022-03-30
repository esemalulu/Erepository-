/**
 * Change PO status depending on the Amazon status
 */
 
 function changePOStatusByAmazonStatus(type) {
	 nlapiLogExecution('DEBUG', 'type', type);
	if (type == 'create' || type == 'edit') {
		var custRec = nlapiGetNewRecord();
		var amazonStatus = custRec.getFieldText('custbodyetailz_po_amz_status');
		nlapiLogExecution('DEBUG', 'amazonStatus', amazonStatus);
		if(amazonStatus) {
			var poStatus = custRec.getFieldText('custbodyetailz_po_status');
          	var poDestinationNonCloseValues = ['Ships to Processing Facility','Ships to Albany Processing Facility'];
			nlapiLogExecution('DEBUG', 'poStatus', poStatus);
			if(poStatus != "17.5 Pending Case") {
				if(amazonStatus == "In_Transit") poStatus = "15 In Transit";
				else if(amazonStatus == "Checked_In") poStatus = "16 Checked In";
				else if(amazonStatus == "Receiving") poStatus = "17 Receiving";
              	else if(amazonStatus == "Cancelled" && poDestinationNonCloseValues.indexOf(custRec.getFieldText('custbodypo_destination')) === -1) poStatus = "19 Closed";
				else if(amazonStatus == "Deleted" && poDestinationNonCloseValues.indexOf(custRec.getFieldText('custbodypo_destination')) === -1) poStatus = "19 Closed";
				else if(amazonStatus == "Closed") poStatus = "19 Closed";
				nlapiLogExecution('DEBUG', 'poStatus1', poStatus);
				if(poStatus) custRec.setFieldText("custbodyetailz_po_status", poStatus);
			}
		}
	}
 }