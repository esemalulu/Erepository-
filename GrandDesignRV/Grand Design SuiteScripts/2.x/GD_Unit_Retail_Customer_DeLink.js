/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record','N/search'],
/**
 * @param {redirect} redirect
 */
function(record,search) {
   
    /**
     * Definition of the Workflow Action script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	
    	var unitRecId = scriptContext.newRecord.id;
		
		//For Case
		var supportcaseSearchObj = search.create({
		   type: "supportcase",
		   filters:
		   [
			  ["custeventgd_retailcustomer","anyof",unitRecId]
		   ],
		   columns:
		   [
			  search.createColumn({name: "internalid", label: "Internal ID"})
		   ]
		});
		var searchResultCount = supportcaseSearchObj.runPaged().count;
		log.debug("supportcaseSearchObj result count",searchResultCount);
		supportcaseSearchObj.run().each(function(result){
		   // .run().each has a limit of 4,000 results
		   var caseId = result.getValue('internalid');
		   log.debug('caseId',caseId);
		   record.submitFields({
			   type: 'supportcase',
			   id: caseId,
			   values:{
				   'custeventgd_retailcustomer': null
			   }
		   });
		   return true;
		});
		
		//For Claim
		var customrecordrvsclaimSearchObj = search.create({
		   type: "customrecordrvsclaim",
		   filters:
		   [
			  ["custrecordclaim_retailcustomer","anyof",unitRecId]
		   ],
		   columns:
		   [
			  search.createColumn({name: "internalid", label: "Internal ID"})
		   ]
		});
		var searchResultCount = customrecordrvsclaimSearchObj.runPaged().count;
		log.debug("customrecordrvsclaimSearchObj result count",searchResultCount);
		customrecordrvsclaimSearchObj.run().each(function(result){
		   // .run().each has a limit of 4,000 results
		   var claimId = result.getValue('internalid');
		   log.debug('claimId',claimId);
		   record.submitFields({
			   type: 'customrecordrvsclaim',
			   id: claimId,
			   values:{
				   'custrecordclaim_retailcustomer': null
			   }
		   });
		   return true;
		});
		
		//For Spiff
		var customrecordrvsspiffSearchObj = search.create({
		   type: "customrecordrvsspiff",
		   filters:
		   [
			  ["custrecordspiff_retailcustomer","anyof",unitRecId]
		   ],
		   columns:
		   [
			  search.createColumn({name: "internalid", label: "Internal ID"})
		   ]
		});
		var searchResultCount = customrecordrvsspiffSearchObj.runPaged().count;
		log.debug("customrecordrvsspiffSearchObj result count",searchResultCount);
		customrecordrvsspiffSearchObj.run().each(function(result){
		   // .run().each has a limit of 4,000 results
		   var spiffId = result.getValue('internalid');
		   log.debug('spiffId',spiffId);
		   record.submitFields({
			   type: 'customrecordrvsspiff',
			   id: spiffId,
			   values:{
				   'custrecordspiff_retailcustomer': null
			   }
		   });
		   return true;
		});
		
		//For Pre-Auth
		var customrecordrvspreauthSearchObj = search.create({
		   type: "customrecordrvspreauthorization",
		   filters:
		   [
			  ["custrecordpreauth_retailcustomer","anyof",unitRecId]
		   ],
		   columns:
		   [
			  search.createColumn({name: "internalid", label: "Internal ID"})
		   ]
		});
		var searchResultCount = customrecordrvspreauthSearchObj.runPaged().count;
		log.debug("customrecordrvspreauthSearchObj result count",searchResultCount);
		customrecordrvspreauthSearchObj.run().each(function(result){
		   // .run().each has a limit of 4,000 results
		   var preAuthId = result.getValue('internalid');
		   log.debug('preAuthId',preAuthId);
		   record.submitFields({
			   type: 'customrecordrvspreauthorization',
			   id: preAuthId,
			   values:{
				   'custrecordpreauth_retailcustomer': null
			   }
		   });
		   return true;
		});

    }

    return {
        onAction : onAction
    };
    
});