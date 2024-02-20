/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/file', 'N/ui/serverWidget', 'N/runtime', 'N/url', 'N/https'],
    /**
     * @param {search} search
     * @param {file} file
     * @param {serverWidget} serverWidget
     * @param {runtime} runtime
     * @param {url} url
     * @param {https} https
     * @returns {{onRequest: onRequest}}
     */
    (search, file, serverWidget, runtime, url, https) => {
        let exports = {};
        let pageContext;
        let htmlContent;
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            pageContext = scriptContext;
            if(scriptContext.request.method === 'GET' && scriptContext.request.parameters.fileId === 'getVendorPayments') {
               //
            }
            
            if(scriptContext.request.method === 'GET') {
                writeSuiteletHTML();
            }
        }
        const getRestletUrl = () => {
            const paymentRESTlet = {
                scriptId: 'customscript_gd_rl_export_payment',
                deploymentId: 'customdeploy_gd_rl_export_payment',
                returnExternalUrl: false
            }
            return url.resolveScript(paymentRESTlet);
        }
        
        const getSuiteletUrl = () => {
            const executeTaskSuitelet = {
                scriptId: 'customscript_gd_sl_execute_task',
                deploymentId: 'customdeploy_gd_sl_execute_task',
                returnExternalUrl: false
            }
            return url.resolveScript(executeTaskSuitelet);
        }
        const writeSuiteletHTML = () => {
            try {
                htmlContent = getHTMLContent();
                if (htmlContent) {
                    htmlContent = htmlContent.replace('{restleturl}', getRestletUrl());
                    htmlContent = htmlContent.replace('{suiteleturl}', getSuiteletUrl());
                    htmlContent = addCSSFiles(htmlContent);
                    htmlContent = addJavascriptFiles(htmlContent);
                    let placeholder = getHTMLPlaceholder();
                    placeholder.bodyAreaField.defaultValue = htmlContent;
                    pageContext.response.writePage(placeholder.form);
                } else {
                    pageContext.response.write('The HTML file is missing. Contact your system admin.');
                }
            } catch (e) {
                pageContext.response.write('There was an error rendering the Suitelet. Please contact your system administrator.\r\n' + e.message);
                log.error({title: 'writeSuiteletHTML error', details: e});
            }
        }

        const addCSSFiles = (htmlContent) => {
            let tempString = '';
            const fileCabinetFile = loadFileFromCabinet('gdExportPayment.css');
            if (fileCabinetFile) {
                tempString = `<link rel="stylesheet" type="text/css" data-filename="gdExportPayment.css" href="${fileCabinetFile.url}" />\r\n`;
            }
            return htmlContent.replace('{gd_css}', tempString);
        }
        const addJavascriptFiles = (htmlContent) => {

            const sourceJSFiles = {
                MAIN: 'gdExportPaymentMain.js'
            };

            const loadScriptsFromCabinet = () => {
                // value is the source file name.
                return Object.values(sourceJSFiles).reduce( (result, value, key) => {
                    const fileCabinetFile = loadFileFromCabinet(value);
                    if (fileCabinetFile) {
                        result += `<script type="text/javascript" data-filename="${value}" src="${fileCabinetFile.url}"></script>\r\n`;
                        return result;
                    }
                }, '');
            }
            return htmlContent.replace('{sourceJSFiles}', loadScriptsFromCabinet());
        }
        /**
         * Creates the form to hold the HTML and returns the form and body field placeholder.
         * @returns {{form: Form, bodyAreaField: (nlobjField|Field)}}
         */
        const getHTMLPlaceholder = () => {
            let form = serverWidget.createForm({
                title: 'Export Payments',
                hideNavBar: false
            });
            let bodyAreaField = form.addField({
                id: 'custpage_bodyareafield',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Body Area Field'
            });
            return {form: form, bodyAreaField: bodyAreaField};
        }
        const getHTMLContent = () => {
            
            function loadHtmlContentFromCabinet() {
                const fileObj = loadFileFromCabinet('GD_SL_ExportPayment.html');
                if (fileObj) {
                    return fileObj.getContents();
                }
                return '';
            }

            return loadHtmlContentFromCabinet();
        }
        /**
         * Loads a file from the file cabinet.
         * @param filename {string} The name of the file to load.
         * @returns {File|null} A file object if the file exists, null otherwise.
         */
        const loadFileFromCabinet = (filename) => {
            let filter = search.createFilter({
                name: 'name',
                join: 'file',
                operator: search.Operator.IS,
                values: filename
            });
            const column = search.createColumn({name: 'internalid', join: 'file'});
            let result = search.create({
                type: search.Type.FOLDER,
                filters: filter,
                columns: column
            }).run().getRange({start: 0, end: 1});

            let fileId;

            if (result && result.length > 0) {
                fileId = result[0].getValue({name: 'internalid', join: 'file'});
            }
            //log.debug({title: 'loadFileFromCabinet', details: `filename: ${filename}, fileId: ${fileId}`});
            if (fileId) {
                return file.load({
                    id: fileId
                });
            }
            return null;
        }
        return {onRequest}
    });
