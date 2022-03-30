/* close sales action*/
function custom_close_remaining(){
    nlapiLogExecution('DEBUG', 'Closing sales order', 'CLOSING ORDER GO');
    close_remaining(nlapiGetRecordId(), 'salesord');
}

/* close order*/
function close_remaining(id, trantype) {
    var logTitle = "CLOSE REMAINING";
    /*var manager = (trantype == 'trnfrord') ? 'transferordermanager.nl' : 'salesordermanager.nl';
    document.location = '/app/accounting/transactions/'+manager+'?type=closeremaining&trantype='+trantype+'&id='+id;*/
    var salesOrderRecord = nlapiLoadRecord('salesorder', id); 
    var lineItemCount = salesOrderRecord.getLineItemCount('item');
    nlapiLogExecution('DEBUG', logTitle, "LINE ITEM COUNT:"+lineItemCount);
    var partialClose = false;
    for (var i=0; i < lineItemCount; i++) {
        var sentToApigee = salesOrderRecord.getLineItemValue('item', 'custcol_sent_to_apigee', i+1);
        var itemType = salesOrderRecord.getLineItemValue('item', 'itemtype', i+1);
      nlapiLogExecution('DEBUG', "ITEM TYPE:",itemType);
        if (itemType == 'InvtPart') {
            if (sentToApigee == 'F' ) {
                salesOrderRecord.setLineItemValue('item', 'isclosed', i+1, 'T');
                  nlapiLogExecution('DEBUG', "SET TO CLOSED:","LINE "+(i+1));
            }
            else {
                partialClose = true;
            }
        }
    }
    var id = nlapiSubmitRecord(salesOrderRecord);
    nlapiLogExecution('DEBUG', logTitle, "PARTIAL CLOSE:"+partialClose);
    if (partialClose) {
        if(window.confirm("Entire order cannot be closed because some lines have already been sent to WMS. Please complete order close by checking the CLOSED checkbox on the line level")){
            window.location.reload();
        }
        else {
            window.location.reload();
        }
    }
    else {
        if(window.confirm("All lines successfully cancelled.")){
            window.location.reload();
        }
        else {
            window.location.reload();
        }
    }
    //nlapiLogExecution('DEBUG', "Closing", form.getButton('custpage_closeremaining'));
}
