/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
 define(['N/record','N/query'],
 /**
  * @param{record} record
  * @param{query} query
  */
function(query,record) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
    	window.markAll = function () {
    		var sublistLength  = scriptContext.currentRecord.getLineCount({
    			sublistId: 'custpage_sublistcreatebacklogs'
    		});
    		for (var i = 0; i < sublistLength; i++) {
    			scriptContext.currentRecord.selectLine({
        			sublistId: 'custpage_sublistcreatebacklogs',
        			line: i
        		});
                if (scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: 'custpage_sublistcreatebacklogs',
                    fieldId: 'custpage_subcreatebacklog'}) == 'F' || !scriptContext.currentRecord.getCurrentSublistValue({
                        sublistId: 'custpage_sublistcreatebacklogs',
                        fieldId: 'custpage_subcreatebacklog'})) {
    	    		scriptContext.currentRecord.setCurrentSublistValue({
    	    			sublistId: 'custpage_sublistcreatebacklogs',
    	    			fieldId: 'custpage_subcreatebacklog',
    	    			value: true
    	    		});
                }
    		}
    	};

    	window.unmarkAll = function (id) {
    		var sublistLength  = scriptContext.currentRecord.getLineCount({
    			sublistId: 'custpage_sublistcreatebacklogs'
    		});
    		for (var i = 0; i < sublistLength; i++) {
    			scriptContext.currentRecord.selectLine({
        			sublistId: 'custpage_sublistcreatebacklogs',
        			line: i
        		});
                if (scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: 'custpage_sublistcreatebacklogs',
                    fieldId: id}) == 'T' || scriptContext.currentRecord.getCurrentSublistValue({
                        sublistId: 'custpage_sublistcreatebacklogs',
                        fieldId: id})) {
    	    		scriptContext.currentRecord.setCurrentSublistValue({
    	    			sublistId: 'custpage_sublistcreatebacklogs',
    	    			fieldId: id,
    	    			value: false
    	    		});
                }
    		}
    	};
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {
        if (scriptContext.sublistId == 'custpage_sublistcreatebacklogs'){
            var modelArr = [];
            var modelArrCt = [];
            var modelList = [];
            var index;
            var html;
            //Get the line count and iterate through the sublist. if the checkbox is checked then we will decide if its been added or not already. If so, we add 1 to the ct, if not, we add the field
            for(var i = 0; i < scriptContext.currentRecord.getLineCount('custpage_sublistcreatebacklogs'); i++){
                if(scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_sublistcreatebacklogs', fieldId: 'custpage_subcreatebacklog', line: i}) == true){
                    if(modelArr.includes(scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_sublistcreatebacklogs', fieldId: 'custpage_submodel', line: i}))){
                        index = modelArr.indexOf((scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_sublistcreatebacklogs', fieldId: 'custpage_submodel', line: i})))
                        modelArrCt[index] += 1;
                    }
                    else{
                        modelArr.push(scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_sublistcreatebacklogs',fieldId: 'custpage_submodel', line: i}));
                        modelArrCt.push(1);
                    };
                };
            }; 

            //Check to see if any models have been selected. If not, display an empty table
            if(modelArr.length <= 0){
                //The HTML that will be used when we update the page
                html = getHtml([      
                    '<table style="border: 2px solid black; width: 220px;overflow-y: scroll; display: block; height: 150px;">',
                        '<thead>',
                            '<th style="background-color: white; font-weight: bold; font-size: 1.5em; text-align: center; font-color:black;">Added Models</th>',
                        '</thead>',
                        '<tbody>',
                        '</tbody>',
                    '</table>'
            ]);
            }else{
                //Add each line to an array to be added to the html table
                for(var j = 0; j < modelArr.length; j++){
                    modelList.push(getHtml([
                        '<tr syle ="width: 150px">',
                        '<td style="overflow-x: hidden; font-size: 1.3em; white-space: nowrap; text-align: right;">',
                            modelArr[j] +
                        '</td>',
                        '<td style = "overflow-x": hidden; font-size: 1.3em; white-space: nowrap;">_________</td>',
                        '<td style="overflow-x: hidden; font-size: 1.3em; white-space: nowrap;">',
                        modelArrCt[j] +
                        '</td>',
                    '</tr>'
                    ]));
                };

                //The HTML that will be used when we update the page
                var html = getHtml([      
                    '<table style="border: 2px solid black; width: 220px;overflow-y: scroll; display: block; height: 150px;">',
                        '<thead>',
                            '<th style="background-color: white; font-weight: bold; font-size: 1.5em; text-align: center; font-color:black;">Added Models</th>',
                        '</thead>',
                        '<tbody>',
                            getHtml(modelList),
                        '</tbody>',
                    '</table>'
                ]);
            };
 

            //Despite being a 2.0 script the inline html needs to be set using 1.0
            window.nlapiSetFieldValue('custpage_selectedmodels',html);
            
        }
    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
        
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
 
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    /**
    * A utility function to create HTML.
    * @param {Array} template - Array of string to join into an HTML document.
    */
    function getHtml(template) {
         return template.join("\n");
    };

    return {
        pageInit: pageInit,
        // fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        // lineInit: lineInit,
        // validateField: validateField,
        // validateLine: validateLine,
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        // saveRecord: saveRecord
    };
    
});
