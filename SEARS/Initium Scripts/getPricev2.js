function callDmdwreApi (payload) {
    var restletUrl = nlapiGetContext().getSetting('SCRIPT', 'custscript_target_url_price')
    //var restletUrl = 'http://initium-commerce-qa.apigee.net/v1/ecomplatformapi/pricebooks/full';
    var headers = new Array();
    headers['Content-Type'] = 'applicaton/xml';
    var method = 'POST';

    var restResponse = nlapiRequestURL(restletUrl, payload, headers, null, method);
}


function getPricebook () {
    nlapiLogExecution ('DEBUG', 'RUN', '******STARTED******');
    var price;
    var id;
    var totalCount = 0;
    var fileNumber = 1;
    var searchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_lstprice_search_id')
    var folderId = nlapiGetContext().getSetting('SCRIPT', 'custscript_target_folder_id_price')
    var search = nlapiLoadSearch('item', searchId);//, null, columns);//'customsearch93');
    var START_TIME = new Date().getTime();
    var context = nlapiGetContext();

    var allResults = search.runSearch ();
    var searchResults = allResults.getResults(0,1000);
    var totalCount = 0;
    nlapiLogExecution ('DEBUG', 'RUN', 'GOT PARAMETERS');

    xml_list = '<?xml version="1.0" encoding="UTF-8"?><pricebooks xmlns="http://www.demandware.com/xml/impex/pricebook/2006-10-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><pricebook><header pricebook-id="cad-list-prices"><currency>CAD</currency><display-name xml:lang="x-default">List Prices</display-name><online-flag>true</online-flag></header><price-tables>';
    xml_clear = '<?xml version="1.0" encoding="UTF-8"?><pricebooks xmlns="http://www.demandware.com/xml/impex/pricebook/2006-10-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><pricebook><header pricebook-id="cad-clear-prices"><currency>CAD</currency><display-name xml:lang="x-default">Clearance Prices</display-name><online-flag>true</online-flag></header><price-tables>';
    xml_sale = '<?xml version="1.0" encoding="UTF-8"?><pricebooks xmlns="http://www.demandware.com/xml/impex/pricebook/2006-10-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><pricebook><header pricebook-id="cad-sale-prices"><currency>CAD</currency><display-name xml:lang="x-default">Sale Prices</display-name><online-flag>true</online-flag></header><price-tables>';
    xml_online = '<?xml version="1.0" encoding="UTF-8"?><pricebooks xmlns="http://www.demandware.com/xml/impex/pricebook/2006-10-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><pricebook><header pricebook-id="cad-online-prices"><currency>CAD</currency><display-name xml:lang="x-default">Online Prices</display-name><online-flag>true</online-flag></header><price-tables>';

    // Contents 
    for(var i=0;i<searchResults.length;i++)
    {
        try {
            //checkGovernance();
            yieldScript(context, START_TIME);
            //nlapiLogExecution ('DEBUG', "Item: ", JSON.stringify(searchResults[i]));
            var internalid = searchResults[i].getValue ('internalid');
            var itemrecord = nlapiLoadRecord ('inventoryitem',internalid);
            price_list =  itemrecord.getLineItemMatrixValue ('price1', 'price', 1, 1);
            price_clear = itemrecord.getLineItemMatrixValue ('price1', 'price', 2, 1);
            price_sale = itemrecord.getLineItemMatrixValue ('price1', 'price', 3, 1);
            price_online = itemrecord.getLineItemMatrixValue ('price1', 'price', 4, 1);
            nlapiLogExecution ('DEBUG', 'RUN', "BASE PRICE:"+price_list);
            nlapiLogExecution ('DEBUG', 'RUN', "CLEAR PRICE:"+price_clear);
            nlapiLogExecution ('DEBUG', 'RUN', "SALE PRICE:"+price_sale);
            nlapiLogExecution ('DEBUG', 'RUN', "ONLINE PRICE:"+price_online);
            var id = itemrecord.getFieldValue ('externalid');
            nlapiLogExecution ('DEBUG', 'RUN', "EXTERNAL ID:"+id);
            nlapiLogExecution ('DEBUG', 'RUN', 'RESULT:'+JSON.stringify(searchResults[i]));
            if (id != undefined && price_list != undefined){
                //id =  id.name;
                xml_list += '<price-table product-id="'+id+'">';
                xml_list += '<amount quantity="1">'+price_list+'</amount>';
                xml_list += '</price-table>';
            }
            if (id != undefined && price_clear != undefined){
                //id =  id.name;
                xml_clear += '<price-table product-id="'+id+'">';
                xml_clear += '<amount quantity="1">'+price_clear+'</amount>';
                xml_clear += '</price-table>';
            }
            if (id != undefined && price_sale != undefined){
                //id =  id.name;
                xml_sale += '<price-table product-id="'+id+'">';
                xml_sale += '<amount quantity="1">'+price_sale+'</amount>';
                xml_sale += '</price-table>';
            }
            if (id != undefined && price_online != undefined){
                //id =  id.name;
                xml_online += '<price-table product-id="'+id+'">';
                xml_online += '<amount quantity="1">'+price_online+'</amount>';
                xml_online += '</price-table>';
            }
            if (totalCount%1000 == 0 && totalCount!=0) {
                xml_list += '</price-tables></pricebook></pricebooks>';
                xml_clear += '</price-tables></pricebook></pricebooks>';
                xml_sale += '</price-tables></pricebook></pricebooks>';
                xml_online += '</price-tables></pricebook></pricebooks>';

                callDmdwreApi (xml_list);
                callDmdwreApi (xml_clear);
                callDmdwreApi (xml_sale);
                callDmdwreApi (xml_online);

                var file = nlapiCreateFile('pricebook_list_'+fileNumber+'.xml', 'XMLDOC', xml_list);
                file.setFolder (folderId);
                nlapiSubmitFile (file);
                var file = nlapiCreateFile('pricebook_clear_'+fileNumber+'.xml', 'XMLDOC', xml_clear);
                file.setFolder (folderId);
                nlapiSubmitFile (file);
                var file = nlapiCreateFile('pricebook_sale_'+fileNumber+'.xml', 'XMLDOC', xml_sale);
                file.setFolder (folderId);
                nlapiSubmitFile (file);
                var file = nlapiCreateFile('pricebook_online_'+fileNumber+'.xml', 'XMLDOC', xml_online);
                file.setFolder (folderId);
                nlapiSubmitFile (file);
                fileNumber += 1;

                xml_list = '<?xml version="1.0" encoding="UTF-8"?><pricebooks xmlns="http://www.demandware.com/xml/impex/pricebook/2006-10-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><pricebook><header pricebook-id="cad-list-prices"><currency>CAD</currency><display-name xml:lang="x-default">List Prices</display-name><online-flag>true</online-flag></header><price-tables>';
                xml_clear = '<?xml version="1.0" encoding="UTF-8"?><pricebooks xmlns="http://www.demandware.com/xml/impex/pricebook/2006-10-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><pricebook><header pricebook-id="cad-clear-prices"><currency>CAD</currency><display-name xml:lang="x-default">Clearance Prices</display-name><online-flag>true</online-flag></header><price-tables>';
                xml_sale = '<?xml version="1.0" encoding="UTF-8"?><pricebooks xmlns="http://www.demandware.com/xml/impex/pricebook/2006-10-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><pricebook><header pricebook-id="cad-sale-prices"><currency>CAD</currency><display-name xml:lang="x-default">Sale Prices</display-name><online-flag>true</online-flag></header><price-tables>';
                xml_online = '<?xml version="1.0" encoding="UTF-8"?><pricebooks xmlns="http://www.demandware.com/xml/impex/pricebook/2006-10-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><pricebook><header pricebook-id="cad-online-prices"><currency>CAD</currency><display-name xml:lang="x-default">Online Prices</display-name><online-flag>true</online-flag></header><price-tables>';
                //break;
            } 
            if (i == 999) {
                searchResults = allResults.getResults(totalCount+1,totalCount+1001);
                i = 0;
            }
            nlapiLogExecution ('DEBUG', "Count: ", totalCount);
            totalCount = totalCount + 1;
        }
        catch (e) {
            nlapiLogExecution ('DEBUG', "OUT", e);
        }
    }
    xml_list += '</price-tables></pricebook></pricebooks>';
    xml_clear += '</price-tables></pricebook></pricebooks>';
    xml_sale += '</price-tables></pricebook></pricebooks>';
    xml_online += '</price-tables></pricebook></pricebooks>';

    callDmdwreApi (xml_list);
    callDmdwreApi (xml_clear);
    callDmdwreApi (xml_sale);
    callDmdwreApi (xml_online);

    var file = nlapiCreateFile('pricebook_list_'+fileNumber+'.xml', 'XMLDOC', xml_list);
    file.setFolder (folderId);
    nlapiSubmitFile (file);
    var file = nlapiCreateFile('pricebook_clear_'+fileNumber+'.xml', 'XMLDOC', xml_clear);
    file.setFolder (folderId);
    nlapiSubmitFile (file);
    var file = nlapiCreateFile('pricebook_sale_'+fileNumber+'.xml', 'XMLDOC', xml_sale);
    file.setFolder (folderId);
    nlapiSubmitFile (file);
    var file = nlapiCreateFile('pricebook_online_'+fileNumber+'.xml', 'XMLDOC', xml_online);
    file.setFolder (folderId);
    nlapiSubmitFile (file);

    nlapiLogExecution ('DEBUG', 'RUN', '******FINISHED******');
}

function yieldScript(context, startTime) {
    var reschedule = false;

    //yield the script if the remaining usage is less than 500
    var intRemainingUsage = context.getRemainingUsage();
    if (intRemainingUsage < 500) {
        reschedule = true;
    }

    //yield the script if the execution time is greater than 45 minutes
    var currentTime = new Date().getTime();
    var timeDifference = currentTime - startTime;
    //2,700,00 is 45 minutes
    if (timeDifference > 2700000) {
        reschedule = true;
    }

    if (reschedule) {
        nlapiYieldScript();
        START_TIME = new Date().getTime();
    }
}


function checkGovernance() {
    var context = nlapiGetContext();
    if (context.getRemainingUsage() < 150) {
        var status = nlapiScheduleScript(context.getScriptId(), 
            context.getDeploymentId());
        nlapiLogExecution("DEBUG", "Reschedule status", status);
    }
}


