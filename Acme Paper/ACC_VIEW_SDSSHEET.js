function Add_SDSSheetBtn(type, form) {
    try {
        if (type == 'view') {
            var redId = nlapiGetRecordId();
            if (checkSDSItem(redId) == true) {
                var url = "https://'+window.location.host+'/app/site/hosting/scriptlet.nl?script=1593&deploy=1&record=" + redId;
                //form.addButton('custpage_packslip','Packing Slip',"window.open('"+url+"view','','width=750,height=550');"); 	
                form.addButton('custpage_sdsbtn', 'SDS Sheet', "window.open('" + url + "&act=&ifId=&fmId=','','width=1000,height=550');");
                nlapiLogExecution('debug', 'Rec Id :' + redId);
            }
        }
    }
    catch (ex) {
        nlapiLogExecution('error', 'Exception raised on Add_SDSSheetBtn ', ex.toString());
    }
}

/**
*Define methods to get Item Preferred Location By Subsidiary
*@param subId, ItemId
*@return string 			
*/
function checkSDSItem(invId) {
    try {

        var isSDSFlag = false;
        if (invId != '') {
            //var invId='101434';
            var searchResult = nlapiSearchRecord("invoice", null,
                [
                    ["number", "anyof", invId],
                    "AND",
                    ["item.custitem_printed_name", "isnotempty", ""],
                    "AND",
                    ["item.custitem_sds_fileid", "isnotempty", ""]
                ],
                [
                    new nlobjSearchColumn("internalid"),
                    new nlobjSearchColumn("custitem_sds_fileid", "item", null),
                    new nlobjSearchColumn("custitem_printed_name", "item", null)

                ]
            );

            if (searchResult) {
                for (var i = 0; i < searchResult.length; i++) {
                    var allCols = searchResult[i].getAllColumns();
                    var invoiceId = searchResult[i].getValue(allCols[0]);
                    var sdsFileId = searchResult[i].getValue(allCols[1]);
                    var sdsName = searchResult[i].getValue(allCols[2]);
                    nlapiLogExecution('debug', 'sds file id :', sdsFileId);
                    nlapiLogExecution('debug', 'sds file id :', sdsName);
                    if (sdsFileId != '' || sdsName != '') {
                        isSDSFlag = true;
                        break;
                    }

                }
            }
        }
        return isSDSFlag;
    }
    catch (ex) {
        nlapiLogExecution('error', 'Exception raised on checkSDSItem ', ex.toString());
    }
}

function viewSDSSheet(request, response) {
    try {
        var act = request.getParameter('act');
        var recId = request.getParameter('record');
        var orderId = (isEmpty(request.getParameter("custpage_so"))) ? '' : request.getParameter('custpage_so');
        var ifId = request.getParameter('ifId');
        var fmId = request.getParameter('fmId');

        nlapiLogExecution('debug', 'Record ID :', 'invoiceId: ' + recId + ', fmId: ' + fmId + 'ifId:' + ifId);

        if (isEmpty(recId)) recId = orderId;

        //var url="https://'+window.location.host+'/app/site/hosting/scriptlet.nl?script=861&deploy=1&record=" + recId+"&act=";
        var title = 'SDS SHEET';
        var form = nlapiCreateForm(title, true);
        // form.setScript('customscript_additional_fees_validation');	
        form.addField('custpage_so', 'text').setDisplayType('hidden').setDefaultValue(recId);

        if (request.getMethod() == 'GET') {

            var page = request.getParameter("page");
            if (page != null && page != "") page = parseFloat(page);


            //form.addSubmitButton('Save');	
            form.addButton('custpage_close', 'Close', "window.close();");
            //form.addButton('custpage_print', 'Print', "window.print();");

            var searchResult = nlapiSearchRecord("invoice", null,
                [
                    ["type", "anyof", "CustInvc"],
                    "AND",
                    ["mainline", "is", "F"],
                    "AND",
                    ["shipping", "is", "F"],
                    "AND",
                    ["taxline", "is", "F"],
                    "AND",
                    ["item.custitem_printed_name", "isnotempty", ""],
                    "AND",
                    ["item.custitem_sds_fileid", "isnotempty", ""],
                    "AND",
                    ["custbody_aq_salesorder.custbody3", "any", ""],
                    "AND",
                    ["internalid", "anyof", recId]
                ],
                [

                    new nlobjSearchColumn("internalid"),
                    new nlobjSearchColumn("tranid"),
                    new nlobjSearchColumn("createdfrom"),
                    new nlobjSearchColumn("item").setSort(true),
                    new nlobjSearchColumn("custitem_sds_fileid", "item", null),
                    new nlobjSearchColumn("custitem_printed_name", "item", null),
                    new nlobjSearchColumn("custbody3", "CUSTBODY_AQ_SALESORDER", null),
                    new nlobjSearchColumn("custbody_aps_stop"),
                    new nlobjSearchColumn("customform")

                ]
            );


            nlapiLogExecution('DEBUG', 'searchResult', searchResult);

            var resultArr = [];

            if (!isEmpty(searchResult)) {
                nlapiLogExecution('DEBUG', 'searchResult Count:' + searchResult.length, '');
                var prevItemId = '';
                for (var i = 0; i < searchResult.length; i++) {
                    var allCols = searchResult[i].getAllColumns();
                    var invId = searchResult[i].getValue(allCols[0]);
                    var soId = searchResult[i].getValue(allCols[2]);
                    var itemId = searchResult[i].getValue(allCols[3]);
                    var sdsFileId = searchResult[i].getValue(allCols[4]);
                    var sdsName = searchResult[i].getValue(allCols[5]);
                    //var isFirstInvoice= searchResult[i].getValue(allCols[6]);
                    //var stopNo= searchResult[i].getValue(allCols[7]);
                    var custFormId = searchResult[i].getValue(allCols[8]);
                    var isFirstInvoice = nlapiLookupField('salesorder', soId, 'custbody3', false);
                    var stopNo = nlapiLookupField('salesorder', soId, 'custbody_aps_stop');

                    nlapiLogExecution('DEBUG', 'isFirstInvoice', isFirstInvoice);
                    nlapiLogExecution('DEBUG', 'itemId', itemId);
                    nlapiLogExecution('DEBUG', 'prevItemId', prevItemId);

                    if (itemId != prevItemId) {
                        if (isFirstInvoice == 'T' || 'F')		//only allow for first Invoice w.r.t SalesOrderl
                        {
                            resultArr.push({
                                invId: invId,
                                soId: soId,
                                itemId: itemId,
                                sdsFileId: sdsFileId,
                                sdsName: sdsName,
                                isFirstInvoice: isFirstInvoice,
                                stopNo: stopNo,
                                custFormId: custFormId
                            });
                        }
                    }

                    prevItemId = itemId;

                }

            }

            var soId = '', invId = '', custFormId = '';

            if (!isEmpty(resultArr)) {
                soId = resultArr[0].soId;
                invId = resultArr[0].invId;
                custFormId = resultArr[0].custFormId;

                var isFolderExist = false;

                var folderId = '', folderName = '', parentFolderId = '3179';

                var folderName = 'SDS_SHEET_' + getDateFormat();// Set folder naming format datewise
                nlapiLogExecution('DEBUG', 'folderName:' + folderName, '');

                var folderSearch = nlapiSearchRecord("folder", null,
                    [
                        ["name", "is", folderName]
                    ],
                    [
                        new nlobjSearchColumn("name").setSort(true),
                        new nlobjSearchColumn("foldersize"),
                        new nlobjSearchColumn("lastmodifieddate"),
                        new nlobjSearchColumn("parent"),
                        new nlobjSearchColumn("numfiles")
                    ]
                );

                if (!isEmpty(folderSearch)) {
                    isFolderExist = true;
                    folderId = folderSearch[0].id;
                    folderName = folderSearch[0].getValue('name');
                    nlapiLogExecution('DEBUG', 'existing folderId:' + folderId + ', folderName:' + folderName, '');
                }
                else {
                    //create a new folder					
                    isFolderExist = false;
                    var newFolder = nlapiCreateRecord('folder');
                    if (newFolder) {
                        newFolder.setFieldValue('parent', parentFolderId);    //  create parent level folder
                        newFolder.setFieldValue('name', folderName);
                        var folderId = nlapiSubmitRecord(newFolder, true);
                        nlapiLogExecution('DEBUG', 'new folder created', 'new folder ID: ' + folderId + ', folderName: ' + folderName);
                    }

                }

                nlapiLogExecution('DEBUG', "folderId", folderId);

                if (!isEmpty(folderId)) {

                    var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
                    xml += "<pdfset>";

                    xml += "<pdf>";
                    xml += getPrintPreview(invId, custFormId); //Get Invoice PDF Template
                    xml += "</pdf>";

                    var stopNo = '';

                    for (var k = 0; k < resultArr.length; k++) {
                        var invId = resultArr[k].invId;
                        var sdsFileId = resultArr[k].sdsFileId;
                        var itemId = resultArr[k].itemId;
                        var stopNo = resultArr[k].stopNo; //'01';

                        nlapiLogExecution('DEBUG', 'itemId:' + itemId + ', sdsFileId:' + sdsFileId.toString(), '');
                        sdsFileId = sdsFileId.split(",");
                        sdsFileId.forEach(function (fileUrl) {
                            try {
                                nlapiLogExecution('DEBUG', 'itemId:' + itemId + ', fileUrl:' + fileUrl, '');
                                xml += "<pdf src='" + fileUrl + "'/>";
                            } catch (error) {
                                nlapiLogExecution('error', 'Error Loading File', error);
                                return;
                            }

                        })
                    }

                    xml += "</pdfset>";

                    //stopNo ='01';// for testing
                    var sdsFileName = '';

                    nlapiLogExecution('DEBUG', "stopNo", stopNo);

                    if (isEmpty(stopNo)) stopNo = 'NaN';
                    // if(!isEmpty(stopNo))
                    // {
                    //Stop#_Inv#_ddmmyy.pdf
                    var filePDF = nlapiXMLToPDF(xml);
                    sdsFileName = stopNo + '_Inv#_' + invId + '.pdf';
                    filePDF.setName(sdsFileName);
                    filePDF.setFolder(folderId);
                    filePDF.setEncoding('UTF-8');
                    filePDF.setIsOnline(true);	//Set Available without login to true			
                    var fileId = nlapiSubmitFile(filePDF);
                    nlapiLogExecution('DEBUG', 'SDS PDF file created successfully', 'FileId:' + fileId + ', subFolderID:' + folderId + ' of parentFolderId:' + parentFolderId);
                    // }
                }
            }
            //End

            nlapiLogExecution('DEBUG', "sdsFileName", sdsFileName);

            if (!isEmpty(searchResult) && !isEmpty(sdsFileName)) {
                response.setContentType('PDF', sdsFileName, 'inline');
                response.write(filePDF.getValue());
            }
            else {
                var htmlbody = "<p>This invoice doesn't have SDS Sheet, please check invoice's items!</p>";
                var htmlHeader = form.addField('custpage_header', 'inlinehtml').setLayoutType('outsideabove', 'startrow');
                htmlHeader.setDefaultValue(htmlbody);
                response.writePage(form);
            }

        }

    }
    catch (err) {
        nlapiLogExecution('error', 'Error On Page', err);
        var htmlbody = "<p>This invoice doesn't have SDS Sheet, please check invoice's items!</p>";
        var htmlHeader = form.addField('custpage_header', 'inlinehtml').setLayoutType('outsideabove', 'startrow');
        htmlHeader.setDefaultValue(htmlbody);
        response.writePage(form);
    }
}

function getPrintPreview(invId, custFormId) {
    try {
        var recId = invId;//'10973';			
        var formId = custFormId;//'150';	
        var htmlStr = "";
        var mode = 'HTML'; //PDF ,HTML
        var htmlbody = nlapiPrintRecord('TRANSACTION', recId, mode, { formnumber: formId }); //get html file of transaction record as in-line 
        var htmlbody = htmlbody.getValue();
        // nlapiLogExecution("debug", "SO Preview Page1 ", htmlbody);
        // htmlStr = htmlbody.replace('<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">','');
        // htmlStr = htmlStr.replace('<pdfset>','');
        // htmlStr = htmlStr.replace('</pdfset>','');
        // nlapiLogExecution("debug", "SO Preview Page2 ", htmlStr);
        return htmlStr;
    }
    catch (ex) {
        nlapiLogExecution('ERROR', 'Error raised in getPrintPreview', ex);
    }
}

/**		
 *Mehod: Used to get Today's Date as per required date format     
 *@param (Object) null
 *@return string date
 */
function getDateFormat() {
    var dd = '', mm = '', yyyy = '';
    var date = new Date();
    //date.setDate(date.getDate()-0); //To set day before pls substract by 1

    dd = date.getDate();
    mm = parseInt(date.getMonth() + 1);
    yyyy = date.getFullYear();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    var cpDate = mm + '' + dd + '' + yyyy; //MMDDYYYY format
    return cpDate;
}


/**
*Define methods to check empty object
*@param obj
*@return boolean 			
*/

function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }
    else {
        if (stValue instanceof String) {
            if ((stValue == '')) {
                return true;
            }
        }
        else if (stValue instanceof Array) {
            if (stValue.length == 0) {
                return true;
            }
        }
        return false;
    }
}

