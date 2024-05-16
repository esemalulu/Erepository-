/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/log", "N/record", "N/search", "N/sftp", "N/file", "N/runtime"], function (log, record, search, sftp, file, runtime)
{

    function getInputData()
    {
        try
        {
            var FedexArray = getFedexInformation();
            log.debug("fedexArray", FedexArray);
            return FedexArray;
        }
        catch (error)
        {
            log.error('error', error);
        }
    }
    function map(context)
    {
        try
        {
            var values = JSON.parse(context.value);
            if (!values) return;
            log.debug("values", values);
            var acmeCode = values.acmeCode || "";
            var itemQty = values.qty || "";
            var date = values?.date?.split("/") || "";
            if (date != "" && date) date = date[2] + date[0] + date[1];
            date += "000000";
            log.debug("date", date)
            var trackingNumbers = values?.trackingNumbers || "";
            trackingNumbers = trackingNumbers?.split("<BR>");
            if (trackingNumbers?.length < 1) trackingNumbers = "";
            log.debug("tracking numbers", trackingNumbers);
            var orderName = values?.orderName || "";
            var customer = values?.customer || "";
            var fedexLine = "";
            if (typeof trackingNumbers == 'object')
            {
                trackingNumbers.forEach(function (trackingNumber)
                {
                    fedexLine += `"${acmeCode}","${itemQty}","${date}","${trackingNumber}","${orderName}","${customer}"\n`;
                });
            }
            else
            {
                fedexLine = `"${acmeCode}","${itemQty}","${date}","${trackingNumbers}","${orderName}","${customer}"\n`;
            }
            log.debug('fedexLine', fedexLine);
            context.write({
                key: 'fedexLines',
                value: { line: fedexLine }
            });
        }
        catch (error)
        {
            log.error('error', error);
        }
    }

    function reduce(context)
    {
        try
        {
            var arrayAllLines = context.values;
            if (!arrayAllLines.length) return;
            var lines = [];
            arrayAllLines.forEach(function (line)
            {
                var line = JSON.parse(line)?.line;
                lines.push(line);
            });
            createFile(lines.join(''), "fedex_tracking_numbers_");
        }
        catch (error)
        {
            log.error('error', error);
        }

    }

    function summarize(summary)
    {

    }

    //------------------------ AUXLIAR FUNCTIONS ------------------------------

    //Gets all the information for the item fulfillment sent by Fedex
    function getFedexInformation()
    {
        var arrayFedex = [];

        var itemfulfillmentSearchObj = search.create({
            type: "itemfulfillment",
            filters:
                [
                    ["type", "anyof", "ItemShip"],
                    "AND",
                    ["mainline", "is", "T"],
                    "AND",
                    ["createdfrom.trackingnumber", "isnotempty", ""],
                    "AND",
                    ["formulatext: {shipmethod}", "contains", "Fedex"],
                    "AND",
                    ["trandate", "on", "today"],
                    "AND", 
                    ["name","anyof","96580"], 
                ],
            columns:
                [
                    search.createColumn({
                        name: "itemid",
                        join: "item",
                        label: "Acme code"
                    }),
                    search.createColumn({ name: "quantity", label: "Quantity" }),
                    search.createColumn({ name: "trandate", label: "Date" }),
                    search.createColumn({ name: "trackingnumbers", label: "Tracking Numbers" }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{createdfrom.otherrefnum}",
                        label: "PO #"
                    }),
                    search.createColumn({ name: "entity", label: "Customer" })
                ]
        });
        var searchResultCount = itemfulfillmentSearchObj.runPaged().count;
        log.debug("itemfulfillmentSearchObj result count", searchResultCount);
        itemfulfillmentSearchObj.run().each(function (result)
        {
            var obj = {};
            obj.acmeCode = result.getValue({ name: "itemid", join: "item" });
            obj.qty = result.getValue("quantity");
            obj.date = result.getValue("trandate");
            obj.trackingNumbers = result.getValue("trackingnumbers");
            obj.orderName = result.getValue({ name: "formulatext", formula: "{createdfrom.otherrefnum}" });
            obj.customer = result.getText("entity");
            arrayFedex.push(obj);
            return true;
        });
        return arrayFedex;
    }//End getFedexInformation
    function createFile(newFile, nameFile)
    {
        try
        {
            var fileObj = file.create({
                name: nameFile + new Date().toLocaleDateString('en-GB').split('/').reverse().join('').split('-').join('') + '.txt',
                fileType: file.Type.PLAINTEXT,
                contents: newFile
            });
            log.debug('fileObj', fileObj);
            sendFilesToServerSFTP(fileObj);
            fileObj.folder = 1525;
            var newId = fileObj.save();
            log.audit("new File Id: ", newId);
        }
        catch (error)
        {
            log.error("createFile error", error);
        }
    }
    function sendFilesToServerSFTP(fileObj)
    {
        try
        {
            const passwordGuid = runtime.getCurrentScript().getParameter({ name: 'custscript_fedex_restockit_password_gui' });
            const myHostKey = runtime.getCurrentScript().getParameter({ name: 'custscript_fedex_restockit_hostkey' });
            const username = runtime.getCurrentScript().getParameter({ name: 'custscript_fedex_restockit_username' });
            const url = runtime.getCurrentScript().getParameter({ name: 'custscript_fedex_restockit_url' });
            const directory = runtime.getCurrentScript().getParameter({ name: 'custscript_fedex_restockit_directory' });
            log.debug('passwordGuid', passwordGuid);
            log.debug('myHostKey', myHostKey);
            log.debug('username', username);
            log.debug('url', url);
            log.debug('directory', directory);
            // Establish a connection to a remote FTP server
            let connection = sftp.createConnection({
                username: username,
                passwordGuid: passwordGuid,
                url: url,
                directory: directory,
                hostKey: myHostKey
            });
            if (!connection) return;
            log.debug('connection', connection);
            //Upload file into today's directory
            connection.upload({
                file: fileObj,
                directory: '/',
                replaceExisting: true
            });
        }
        catch (error)
        {
            log.error('error SFTP', error);
        }
    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
