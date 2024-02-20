/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file', 'N/query', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/url', './GD_Constants.js'],
/**
 * @param{file} file
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 * @param{ui/serverWidget} ui/serverWidget
 * @param{record} record
 * @param{url} url
*/
(file, query, record, runtime, serverWidget, url, GD_Constants) => {
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = (scriptContext) => {

        // Create the Suitelet & load all the necessary files
        let form = serverWidget.createForm({ title : 'Chassis Scheduling' });

        if (scriptContext.request.method == 'GET') {
           
            var htmlField = form.addField({
                id: 'custpage_page',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Chassis Scheduling'
            });
            
            htmlField.defaultValue =
                '<style>' +
                file.load('/SuiteScripts/Grand Design SuiteScripts/2.x/GD_ChassisScheduling_Style.css').getContents() +
                '</style>' +
                file.load('/SuiteScripts/Grand Design SuiteScripts/2.x/GD_ChassisScheduling_View.html').getContents() +
                '<!-- Source VueJS library --> <script src="https://unpkg.com/vue@3.2.40/dist/vue.global.js"></script>' +
                '<!-- Source jQuery library --> <script src="https://code.jquery.com/jquery-3.7.0.js"></script>' +
                '<!-- Source Data Tables library & extensions --> <script src="https://cdn.datatables.net/v/dt/dt-1.13.6/b-2.4.2/fc-4.3.0/fh-3.4.0/r-2.5.0/sc-2.2.0/sl-1.7.0/datatables.min.js"></script> <!-- Source datatables library -->' +
                '<script type="text/javascript" src="' + file.load('/SuiteScripts/Grand Design SuiteScripts/2.x/GD_ChassisScheduling_Model.js').url + '"></script>';

            scriptContext.response.writePage(form);
        }
        else { // POST
            // Get the Data sent from the Model
            let allData = JSON.parse(scriptContext.request.body);

            // We'll create the Processing Record in NetSuite & return the record ID.
            let processingRec = record.create({type: 'customrecordgd_chassissched_procrec', isDynamic: true});
            processingRec.setValue({fieldId: 'custrecordgd_chassissched_status', value: GD_Constants.GD_CHASSISSCHEDULINGSTATUS_OPEN});
            processingRec.setValue({fieldId: 'custrecordgd_chassissched_unitjson', value: allData.unitsToUpdate});
            processingRec.setValue({fieldId: 'custrecordgd_chassissched_location', value: allData.locationId});
            let processingRecId = processingRec.save();

            // Send the Processing Record Id back to the Model
            let responseObj = {};
            responseObj.processingRecId = processingRecId;

            return scriptContext.response.write(JSON.stringify(responseObj));
        }
    }

    return {onRequest}

});