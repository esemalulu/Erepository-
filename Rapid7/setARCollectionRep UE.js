/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {
	function afterSubmit(context) {
		if(context.type === 'create' || context.type === 'edit' || context.type === 'xedit'){
			setARCollectionRep(context);
		}
	}

    function setARCollectionRep(context) {
		try {
			var newRecId = context.newRecord.id;
			if(context.type === 'edit' || context.type === 'xedit'){
				var oldCustomerRec = context.oldRecord;
				var old_managerlevelteam  = oldCustomerRec.getValue({ fieldId: 'custentityr7managerlevelteam' });
			}else{
				var old_managerlevelteam  = '';
			}
			
			var newCustomerRec = record.load({
                type: record.Type.CUSTOMER,
                id: newRecId
            });
			var new_managerlevelteam  = newCustomerRec.getValue({ fieldId: 'custentityr7managerlevelteam' });
			var arcollectionrep = newCustomerRec.getValue({ fieldId: 'custentityr7arcollectionrep' });
			var arRep;
			if(new_managerlevelteam){
				if(!arcollectionrep || (new_managerlevelteam!=old_managerlevelteam)){
					var customrecord_ar_collection_rep_mappingSearchObj = search.create({
	                    type: "customrecord_ar_collection_rep_mapping",
	                    filters:
	                        [
	                            ["isinactive","is","F"]
	                        ],
	                    columns:
	                        [
	                            "custrecord_ar_collection_rep_assignee",
	                            "custrecord_ar_collection_par_or_cust",
	                            "custrecord_ar_collection_sales_divs"
	                        ]
	                });
	                customrecord_ar_collection_rep_mappingSearchObj.run().each(function(result){
	                    var salesDivisions = result.getValue({name: 'custrecord_ar_collection_sales_divs'});
	                    if(salesDivisions.indexOf(new_managerlevelteam) !== -1){
	                        arRep = result.getValue({name: 'custrecord_ar_collection_rep_assignee'});
	                    }
	                    return true;
	                });
	              log.debug('arRep',arRep);
	              newCustomerRec.setValue({ fieldId: 'custentityr7arcollectionrep' , value: arRep});

	              var customerId = newCustomerRec.save({
		          	enableSourcing: true,
		          	ignoreMandatoryFields: true,
		          });
	              log.debug('customerId',customerId); 
				}	
			}
			
		} catch (e) {
			log.debug({ title: 'error occured on afterSubmit stage: ', details: e });
		}
	}
	return {
		afterSubmit: afterSubmit
	};
});
