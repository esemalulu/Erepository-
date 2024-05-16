/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/log'],function (record, search, log) {

    function beforeLoad(scriptContext) {
  		// if (scriptContext.type !== scriptContext.UserEventType.VIEW)
    	// var form = scriptContext.form;
      	// var itemid = form.getField({id: 'itemid'});
     	// itemid.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
		// var rec = scriptContext.newRecord;
		// var type = rec.getValue({fieldId: 'itemtype'});
		// log.debug({title: 'item type', details: 'Type: ' + type });
		
		// if(type ==='OthCharge')
		// {
		// 	rec.setValue({fieldId: 'customform', value: '198'});
		// 	log.debug({title: 'Defaulted the form', details: 'formid: ' + rec.getValue({fieldId: 'customform'})});
		// }
		
		// rec.setValue({fieldId: 'itemid', value: "To be generated" });
		//log.debug('scriptContext.type',scriptContext.type);
		const itemRec = scriptContext.newRecord;
		itemRec.getField('itemid').isMandatory = false;

    }

    function beforeSubmit(scriptContext) {
    	if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.COPY){
			var customrecord_max_item_numberSearchObj = search.create({
			   type: "customrecord_max_item_number",
			   columns:
			   [
				  search.createColumn({name: "name",sort: search.Sort.ASC,label: "Name" }),
				  //search.createColumn({name: "internalid", label: "Internal ID"}),
				  search.createColumn({name: "custrecord_max_item_number", label: "Maximum Item Count"})
			   ]
			});
			//var searchResultCount = customrecord_max_item_numberSearchObj.runPaged().count;
			//log.debug("customrecord_max_item_numberSearchObj result count",searchResultCount);
			var searchResult = customrecord_max_item_numberSearchObj.run().getRange({
				start: 0,
				end: 1
			});
			var maxRecId = searchResult[0].id;
			var maxnum = searchResult[0].getValue({name: 'custrecord_max_item_number'});
				log.debug({title: 'Maximum Number', details: 'Id: ' + maxnum });

			const itemRec = scriptContext.newRecord;
				
			// Make changes to one field.
			var max1  = parseInt(maxnum)
			//log.debug({title: 'Parsed Maximum Number', details: 'Id: ' + max1});
			var max2 = max1 + 1
			//log.debug({title: 'Added Parsed Maximum Number', details: 'Id: ' + max2 });
			var str1 = max2.toString()
			//log.debug({title: 'String Parsed Maximum Number',details: 'Id: ' + str1 });
			itemRec.setValue({fieldId: 'itemid',value: str1});
			// Save the record.
			record.submitFields({
				type: 'customrecord_max_item_number',
				id: maxRecId,
				values: {
					'custrecord_max_item_number': str1
				}
			}); 
			return true;
		}
	}
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
});