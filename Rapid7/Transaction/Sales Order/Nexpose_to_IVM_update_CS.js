

function processNexposeItems(){
    var orderId = nlapiGetRecordId();
    var suiteletURL = nlapiResolveURL('RESTLET', 'customscriptnexpose_to_ivm_update', 'customdeploynexpose_to_ivm_update')
    suiteletURL += '&custscript_salesorder=' + orderId;
    result = confirm('Please confirm, you want to replace Nexpose items to IVM?');
    if(result){
        alert('Submitted items, this could take some time...');
        var response = nlapiRequestURL(suiteletURL);
        if(response.body==='SO Updated'){
            alert('Items are updated, reloading transaction...');
            window.location.reload();
        }else if(response.body==='no_items'){
            alert('There are no items to update');
        }else{
            alert(response.body);
        }
    }
}
