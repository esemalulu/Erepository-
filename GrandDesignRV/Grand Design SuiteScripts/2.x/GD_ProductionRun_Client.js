/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record','N/query'],
/**
 * @param{record} record
 * @param{serverWidget} serverWidget
 */
function(record,query) {
    
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
           var modelArr = []
           var found = false
           //If we have already been on this record we'll already have data so we can load from there instead of going through the sublist
           var modelArr = scriptContext.currentRecord.getValue('custrecordunitcountjson');
           if(modelArr != '' || undefined)
           var modelArr = JSON.parse(modelArr);
           else{
               modelArr = []
               for(var i = 0; i < scriptContext.currentRecord.getLineCount('custpage_selectbacklogssublist'); i++){
                   found = false;
                   //Only check the line if its marked
                   if(scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_selectbacklogssublist', fieldId: 'custpage_selectbacklog', line: i}) == true){
                       //set the model ID to a variable so we can pass it around        
                       var sublistLineModelID = scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_selectbacklogssublist', fieldId: 'custpage_model', line: i});
                       //If there aren't any models added yet, we can skip the search and just add it in our array
                       if (modelArr.length == 0){
                           modelArr.push({
                               model: sublistLineModelID,
                               count: 1,
                               modelname: getModelName(sublistLineModelID),
                               remove: false
                           });
                           //Since it was never in there, we can call it 'found'
                           found = true;
                       }
                       //If its not a new array (where we switched to found), we need to search to see if the models already added
                       if (found == false){
                           for(var j = 0; j < modelArr.length; j++){
                               //If it is in the array, we just update the count
                               if (modelArr[j].model == sublistLineModelID){
                                   modelArr[j].count += 1;
                                   found = true;
                                       break;
                               };
                           }; 
                       //If we don't find it in our array, we need to add it in
                       if (found == false){
                           modelArr.push({
                               model: sublistLineModelID,
                               count: 1,
                               modelname: getModelName(sublistLineModelID),
                               remove: false
                               });                 
                           };
                       };
                   };
               };
           };
           //We need to assign a value to the field 'custrecordunitcountjson'. This field will hold our array and we will use it as the user updates to line so we don't
           //Have to search everytime
           scriptContext.currentRecord.setValue({fieldId: 'custrecordunitcountjson', value: JSON.stringify(modelArr)});

           //Use a function to create the model counter
           createModelCounter(modelArr);
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
       log.debug('hit','postSource');
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
       if (scriptContext.sublistId == 'custpage_selectbacklogssublist'){
           //First, we grab the count we already have from a hidden field
           var modelArr = JSON.parse(scriptContext.currentRecord.getValue('custrecordunitcountjson'));
           //We'll also assign the current line to a variable because its used a few times
           var index = scriptContext.currentRecord.getCurrentSublistIndex('custpage_selectbacklogssublist')
           var found = false;
           //Next we'll grab the id of whichever value was just changed
           var sublistLineModelID = scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_selectbacklogssublist', fieldId: 'custpage_model', line: index});
           //Now we check if the checkbox was unchecked or checked. If checked, we'll add it to our model Arr
           if(scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_selectbacklogssublist', fieldId: 'custpage_selectbacklog', line: index}) == true){
               //If there aren't any models added yet, we can skip the search and just add it in our array
               if (modelArr.length == 0){
                   modelArr.push({
                       model: sublistLineModelID,
                       count: 1,
                       modelname: getModelName(sublistLineModelID),
                       remove: false
                   });
                   //Since it was never in there, we can call it 'found'
                   found = true;
               }
               //If its not a new array (where we switched to found), we need to search to see if the models already added
               if (found == false){
                   for(var j = 0; j < modelArr.length; j++){
                       //If it is in the array, we just update the count
                       if (modelArr[j].model == sublistLineModelID){
                           modelArr[j].count += 1;
                           found = true;
                               break;
                       };
                   }; 
               //If we don't find it in our array, we need to add it in
               if (found == false){
                   modelArr.push({
                       model: sublistLineModelID,
                       count: 1,
                       modelname: getModelName(sublistLineModelID),
                       remove: false
                       });                 
                   };
               };
           }else{
               try{

                   //If its unchecked we need to find the id and either take the count down or remove it from our list
                   //we are assuming if unchecked it was in our list prior, if not this try/catch will throw the error for us
                   for(var j = 0; j < modelArr.length; j++){
                       //If it is in the array, we just update the count
                       if (modelArr[j].model == sublistLineModelID){
                           //If theres multiple, we just lower the count
                           if(modelArr[j].count > 1){
                               //There is a workflow running that causes this entry point to trigger twice on off checking a line. We circumnavigate
                               //this issue by with our remove value in our object. If true, than we have already made our pass, if not, we lower
                               //the count.
                               if(modelArr[j].remove == false){
                                   modelArr[j].count -= 1;
                                   modelArr[j].remove = true;
                               }else{
                                   modelArr[j].remove = false;
                               }
                               break;
                           }else{
                               if(modelArr[j].remove == false){
                                   modelArr.splice(j,1);
                                   modelArr[j].remove = true;
                               }else{
                                   modelArr[j].remove = false;
                               }
                               break;
                           }
                       };
                   };
               }catch(e){
                   log.debug('ERROR IN MODEL COUNT ITEM REMOVAL', 'There was an error removing an item from the model count:' + e);
               };
           };
           
       //We need to assign a value to the field 'custrecordunitcountjson'. This field will hold our array and we will use it as the user updates to line so we don't
       //Have to search everytime
       scriptContext.currentRecord.setValue({fieldId: 'custrecordunitcountjson', value: JSON.stringify(modelArr)});

       //Use a function to create the model counter
       createModelCounter(modelArr);

           
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
       log.debug('hit','lineInit');
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

   /**
    * Utility Function to get the model name using a model id
    * @param {id} id 
    * @returns modelName
    */
   function getModelName(id){
       modelNameQuery = 'SELECT itemid FROM item WHERE id = ' + id;
       log.debug('query',modelNameQuery);
       modelNameResult = query.runSuiteQL({query:modelNameQuery}).asMappedResults();
       log.debug('modelnameresult',modelNameResult);
       return modelNameResult[0].itemid;
   }
   
   /**
    * 
    * @param {modelArr} modelArr - Arr of object containing model name and count
    */
   function createModelCounter(modelArr){
       var modelList = [];
       //If there are none selected this will populate an empy table
       if(modelArr.length == 0){
           html = getHtml([      
               '<table style="border: 2px solid black; width: 200px;overflow-y: scroll; overflow-x: auto; display: block; height: 100px;">',
                   '<thead>',
                       '<th style="background-color: white; font-weight: bold; font-size: 1.30em; text-align: center; font-color:black;">Added Models</th>',
                   '</thead>',
                   '<tbody>',
                   '</tbody>',
               '</table>'
           ]);
       } else {
           //Add each line to an array to be added to the html table
           for(var j = 0; j < modelArr.length; j++){
               modelList.push(getHtml([
                   '<tr syle ="width: 100%">',
                   '<td style="overflow-x: hidden; white-space: nowrap; font-size: 1.20em;"">',
                   modelArr[j].modelname +
                   ' ----------</td>',
                   '<td style="overflow-x: hidden; white-space: nowrap; font-size: 1.20em;"">',
                   modelArr[j].count +
                   '</td>',
               '</tr>'
               ]))
           };
           //The HTML that will be used when we update the page
           html = getHtml([      
               '<table style="border: 2px solid black; width: 200px;overflow-y: scroll; overflow-x: auto; display: block; height: 100px;">',
                   '<thead>',
                       '<th style="background-color: white; font-weight: bold; font-size: 1.30em; text-align: center; font-color:black;">Added Models</th>',
                   '</thead>',
                   '<tbody>',
                       getHtml(modelList),
                   '</tbody>',
               '</table>'
           ]);
       };

       //Despite being a 2.0 script the inline html needs to be set using 1.0
       window.nlapiSetFieldValue('custrecordgd_selectedunits',html);
   }

    return {
        pageInit: pageInit,
       //  fieldChanged: fieldChanged,
       //  postSourcing: postSourcing,
        sublistChanged: sublistChanged,
       //  lineInit: lineInit,
       //  validateField: validateField,
       //  validateLine: validateLine,
       //  validateInsert: validateInsert,
       //  validateDelete: validateDelete,
       //  saveRecord: saveRecord
    };
    
});
