/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/log", "N/encode", "N/file", "N/email","N/runtime"], function (search, record, log, encode, file, email,runtime) {

    function getInputData() {
        try {
            var itemreceiptSearchObj = search.create({
                type: "itemreceipt",
                filters:
                    [
                        ["type", "anyof", "ItemRcpt"],
                        "AND",
                        ["item.type", "anyof", "InvtPart"],
                        "AND",
                        ["item.custitem_dnr", "anyof", "2"],
                        "AND",
                        ["datecreated", "within", "lastbusinessweek"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custitem_buyer",
                            join: "item",
                            summary: "GROUP",
                            sort: search.Sort.ASC,
                            label: "Buyer"
                        })
                    ]
            });
            var itemreceiptSearchObjCount = itemreceiptSearchObj.runPaged().count;
            log.debug("itemreceiptSearchObj result count", itemreceiptSearchObjCount);
            return itemreceiptSearchObj;
        }
        catch (error) {
            log.error('error en get inputdata', error);
        }

    }

    function map(context) {
        try {
            var result = JSON.parse(context.value);
            // searchByVendor(result)
            var idBuyer = result.values["GROUP(custitem_buyer.item)"].value
            var infoBuyer = searchByVendor(idBuyer);
            var idFile = generarExcel(infoBuyer.items, idBuyer)
            log.debug('infoBuyer', infoBuyer);
            var scriptObj = runtime.getCurrentScript();
            // SEND EMAIL
            var senderId = scriptObj.getParameter({ name: 'custscript_sdb_sender_email' });
            var recipientEmail = 'bernabee.g@suitedb.com';
            var fileObj = file.load({
                id: idFile
            });
            email.send({
                author: senderId,
                recipients: recipientEmail,
                subject: 'Test Sample Email Module',
                body: 'El email enrealidad va para: ' + infoBuyer.email.email,
                attachments: [fileObj],
            });
        }
        catch (error) {
            log.error('error', error);
        }

    }

    function reduce(context) {
    }
    function summarize(summary) {

    }
    function searchByVendor(id) {
        var resultVendor = [];
        var itemreceiptSearchObj = search.create({
            type: "itemreceipt",
            filters:
                [
                    ["type", "anyof", "ItemRcpt"],
                    "AND",
                    ["item.type", "anyof", "InvtPart"],
                    "AND",
                    ["item.custitem_dnr", "anyof", "2"],
                    "AND",
                    ["datecreated", "within", "lastbusinessweek"],
                    "AND",
                    ["item.custitem_buyer", "anyof", id]
                ],
            columns:
                [
                    search.createColumn({
                        name: "displayname",
                        join: "item",
                        label: "Display Name"
                    }),
                    search.createColumn({ name: "createdfrom", label: "Created From" }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{tranid}",
                        label: "Formula (Text)"
                    })
                ]
        });
        var count = itemreceiptSearchObj.runPaged().count;
        itemreceiptSearchObj.run().each(function (result) {
            resultVendor.push(JSON.parse(JSON.stringify(result)))
            return true;
        });
        var emailEmploye = search.lookupFields({
            type: 'employee',
            id: id,
            columns: ['email']
        });
        log.debug('resultVendor', resultVendor);
        log.debug('emailEmploye', emailEmploye);
        var infoBuyer = {
            email: emailEmploye,
            items: []
        }
        resultVendor.forEach(element => {
            var obj = {}
            obj.itemName = element.values["item.displayname"];
            obj.createdfrom = element.values["createdfrom"][0]?.text;
            obj.reference = element.values["formulatext"];
            infoBuyer.items.push(obj);
            log.debug('obj', obj);
        });
        return infoBuyer

    }
    function generarExcel(arrayObjetos, id) {
        let xmlStr = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
        xmlStr += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
        xmlStr += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
        xmlStr += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
        xmlStr += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
        xmlStr += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
        xmlStr += '<Worksheet ss:Name="Sheet1">';
        xmlStr += '<Table>'
            + '<Row>'
            + '<Cell><Data ss:Type="String"> Item Name </Data></Cell>'
            + '<Cell><Data ss:Type="String"> PO Associated</Data></Cell>'
            + '<Cell><Data ss:Type="String"> Transaction Reference </Data></Cell>'
            + '</Row>';
        // Agregar las filas de datos
        arrayObjetos.forEach(objeto => {
            xmlStr += '<Row>'
                + `<Cell><Data ss:Type="String">${objeto.itemName}</Data></Cell>`
                + `<Cell><Data ss:Type="String">${objeto.createdfrom}</Data></Cell>`
                + `<Cell><Data ss:Type="String">${objeto.reference}</Data></Cell>`
                + '</Row>';
        });
        xmlStr += '</Table></Worksheet></Workbook>';

        log.debug('xmlStr', xmlStr)
        // Retornar el string completo del archivo Excel
        var strXmlEncoded = encode.convert({
            string: xmlStr,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64
        });

        var fileName = 'excel_buyer_' + id;
        var objXlsFile = file.create({
            name: fileName,
            fileType: file.Type.EXCEL,
            contents: strXmlEncoded,
            folder: -15,
            isOnline: true
        });

        return objXlsFile.save();
    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
