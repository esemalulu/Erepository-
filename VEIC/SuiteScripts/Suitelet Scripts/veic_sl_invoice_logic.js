/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file', 'N/record', 'N/render', 'N/https', 'N/query'], function(file, record, render, https, query) {

    function onRequest(context) {
        try {
            // // Load the invoice record
            // let invoiceId = context.request.parameters.recId;  // Assuming you pass the invoiceId as a URL parameter
            // log.debug('invoiceId', invoiceId);
            // let invoiceRecord = record.load({
            //     type: record.Type.INVOICE,
            //     id: invoiceId
            // });

            // let invoiceDate = invoiceRecord.getValue({
            //     fieldId: 'trandate'
            // });

            // let invoiceNumber = invoiceRecord.getValue({
            //     fieldId: 'tranid'
            // });

            // // let invoiceDate = invoiceRecord.getValue({
            // //     fieldId: 'custbody_from_date'
            // // });

            // // Load the Master XML file from File Cabinet
            // let masterXmlFile = file.load({
            //     id: 26807  // Replace with your actual file ID for the master XML
            // });
            // let masterXmlContent = masterXmlFile.getContents();
            // //Here we are passing the Invoice Date
            // masterXmlContent = masterXmlContent.replace('{{invoice_date}}', dateFormat(invoiceDate));
            // //Here we are passing the Invoice Number
            // masterXmlContent = masterXmlContent.replace('{{invoice_number}}', invoiceNumber);
            // //Here we are passing the Invoice Number
            // //masterXmlContent = masterXmlContent.replace('{{bill_address}}', bodyContent);

            // // Load the Child XML file from File Cabinet
            // let childXmlFile = file.load({
            //     id: 26808  // Replace with your actual file ID for the child XML
            // });
            // let childXmlContent = childXmlFile.getContents();

            // // Replace placeholders in the Master XML with actual data
            // //let headerDate = invoiceRecord.getValue('date');
            // //masterXmlContent = masterXmlContent.replace('{{header_date}}', headerDate);

            // // Replace placeholders in the Child XML with actual data
            // let bodyContent = generateInvoiceBody(invoiceRecord, childXmlContent);
            // masterXmlContent = masterXmlContent.replace('{{body_content}}', bodyContent);

            // // Render XML to PDF
            // let renderer = render.create();
            // renderer.templateContent = masterXmlContent; // Set the combined XML content
            // let pdfFile = renderer.renderAsPdf();

            // // Serve the PDF as response
            // context.response.writeFile(pdfFile, true);

            let renderer = render.create();

            let invoiceId = context.request.parameters.recId;  // Assuming you pass the invoiceId as a URL parameter
            let invoiceFormId = context.request.parameters.invoiceFormId; 
            
            log.debug('invoiceId', invoiceId);
            let invoiceRecord = record.load({
                type: record.Type.INVOICE,
                id: invoiceId
            });

            let apdfScriptId = extractingScriptIdFromAPDF(invoiceFormId);

            renderer.addRecord('record', invoiceRecord);

            renderer.setTemplateByScriptId(apdfScriptId);//This one always need to be uppercase
            context.response.writeFile(renderer.renderAsPdf(), true);

            //  // Assume you have the internal ID of the Advanced PDF template
            //  let templateId = 112;  // Replace with your template internal ID

            //  // Load the 'printtemplate' record
            //  let templateRecord = record.load({
            //      type: record.Type.ADVANCED_PDF_TEMPLATE,  // Advanced PDF template record type
            //      id: templateId
            //  });
 
            //  // Get the 'CUSTTMPL' ID (Custom Template) field value
            //  let customTemplateId = templateRecord.getValue({
            //      fieldId: 'custtmpl'  // Field ID for Custom Template (CUSTTMPL)
            //  });
 
            //  // Log or return the Custom Template ID
            //  log.debug('CUSTTMPL ID:', customTemplateId);

            // Running the SuiteQL query directly
            // let myCustomerQuery = query.create({
            //     type: query.Type.ADVANCED_PDF_TEMPLATE
            // });

            // let firstCondition = myCustomerQuery.createCondition({
            //     fieldId: 'id',
            //     operator: query.Operator.EQUAL,
            //     values: 112
            // });

            // myCustomerQuery.condition = myCustomerQuery.and(firstCondition, myCustomerQuery);
            // let resultSet = myCustomerQuery.run();

            // log.debug('resultSet', resultSet);

            // Add a condition for the query
            // let myCustomerQuery = query.create({
            //     type: query.Type.CUSTOMER
            // });
            // let mySalesRepJoin = myCustomerQuery.autoJoin({
            //     fieldId: 'salesrep'
            // });
            // let firstCondition = myCustomerQuery.createCondition({
            //     fieldId: 'id',
            //     operator: query.Operator.EQUAL,
            //     values: 2692
            // });
            // let secondCondition = myCustomerQuery.createCondition({
            //     fieldId: 'id',
            //     operator: query.Operator.EQUAL,
            //     values: 2695
            // });
            // let thirdCondition = mySalesRepJoin.createCondition({
            //     fieldId: 'email',
            //     operator: query.Operator.START_WITH_NOT,
            //     values: 'Adobe'
            // });
            // //myCustomerQuery.condition = myCustomerQuery.and(thirdCondition,myCustomerQuery.or(firstCondition, secondCondition));
            // myCustomerQuery.condition = myCustomerQuery.and(firstCondition, secondCondition);
            // let resultSet = myCustomerQuery.run();

            // log.debug('resultSet', resultSet);

        } catch (e) {
            // log.error('Error generating PDF', e);
            // context.response.write('An error occurred while generating the PDF.');
            log.error({
                title: 'Error Rendering PDF',
                details: e.message
            });
            context.response.write('Error occurred while generating PDF.');
        }
    }

    function generateInvoiceBody(invoiceRecord, childXmlContent) {
        let bodyContent = '';

        // Example: Adding each item in the invoice to the body
        let lineCount = invoiceRecord.getLineCount({
            sublistId: 'item'
        });

        for (let i = 0; i < lineCount; i++) {
            let itemDescription = invoiceRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'description',
                line: i
            });

            let quantity = invoiceRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
            });

            let unitPrice = invoiceRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: i
            });

            let total = quantity * unitPrice;

            // Add item to bodyContent (using the child XML structure)
            bodyContent += childXmlContent
                .replace('{{item_description}}', itemDescription)
                .replace('{{quantity}}', quantity)
                .replace('{{unit_price}}', unitPrice)
                .replace('{{total}}', total);
        }

        return bodyContent;
    }

    function dateFormat(dateT){
    const date = new Date(dateT);

    // Get the month, day, and year
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-based month
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    // Combine into MMDDYYYY format
    const formattedDate = `${month}/${day}/${year}`;

    return formattedDate;
    }

    function extractingScriptIdFromAPDF(internalid) {
        const dupQuery = query.create({
            type: query.Type.ADVANCED_PDF_TEMPLATE
        });
        dupQuery.columns = [
            dupQuery.createColumn({
                fieldId: 'scriptid'
            })
        ];
        const internalidCondition = dupQuery.createCondition({
            fieldId: 'id',
            operator: query.Operator.EQUAL,
            values: internalid
        });
        dupQuery.condition = dupQuery.and(internalidCondition);
        
        // Run the query
        const resultSet = dupQuery.run();
        const results = resultSet.results;
        let scriptId;
        for (let i = results.length - 1; i >= 0; i--) {
            const pdf = results[i].values;
            scriptId = pdf[0];
        }

        log.debug({
            title: 'scriptId',
            details: scriptId
        });

        return scriptId;
            
    }

    return {
        onRequest: onRequest
    };

});
