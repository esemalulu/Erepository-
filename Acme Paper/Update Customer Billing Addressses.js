/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'],

function(search, record) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {

    	try
    	{
        	//Search Results
    			var customerSearchObj = search.create({
    				   type: "customer",
    				   filters:
    				   [
    				      ["stage","anyof","CUSTOMER"], 
    				      "AND", 
    				      ["isdefaultbilling","is","T"], 
    				      "AND", 
    				      ["internalidnumber","greaterthanorequalto","60391"]
    				   ],
    				   columns:
    				   [
    				    	search.createColumn({name: "internalid", sort: search.Sort.ASC}),
    				      search.createColumn({name: "billaddress", label: "Billing Address"}),
    				      search.createColumn({name: "billaddressee", label: "Billing Addressee"}),
    				      search.createColumn({name: "altname", label: "Name"}),
    				      search.createColumn({name: "isperson", label: "Is Individual"})
    				   ]
    				});
    				var searchResultCount = customerSearchObj.runPaged().count;
    				log.debug("customerSearchObj result count",searchResultCount);
    				customerSearchObj.run().each(function(result)
    				{
    					try
    					{
    						var customerId = result.id;
    						var customerRecord = record.load({
    							type: record.Type.CUSTOMER,
    							id: customerId
    						});
    						var name = customerRecord.getValue({fieldId : 'companyname'});
    						var addresses = customerRecord.getLineCount({
    							sublistId: 'addressbook'
    						});
    						//log.debug({ title: 'addresses', details: addresses });

    						for (var i = 0; i < addresses; i++) {
    							var defaultBillingAddress = customerRecord.getSublistValue({
    								sublistId: 'addressbook',
    								fieldId: 'defaultbilling',
    								line: i
    							});
    							

    							if (defaultBillingAddress) {
    								// Check if one of the addresses has its default billing set to YES

    								var customerAddress = customerRecord.getSublistSubrecord({
    									sublistId: 'addressbook',
    									fieldId: 'addressbookaddress',
    									line: i
    								});

    								var addressee = customerAddress.getValue({
    									fieldId: 'addressee'
    								});
    								var addr1 = customerAddress.getValue({
    									fieldId: 'addr1'
    								});
    								var addr2 = customerAddress.getValue({
    									fieldId: 'addr2'
    								});
    								//log.debug('name', name);
    								//log.debug('addressee', addressee);
    								if( addressee != name )
    								{
    									customerAddress.setValue({
        									fieldId: 'addressee',
        									value: name
        								});
    									customerAddress.setValue({
        									fieldId: 'addr1',
        									value:addressee
        								});
    									customerAddress.setValue({
        									fieldId: 'addr2',
        									value: addr1
        								});
    									customerAddress.setValue({
        									fieldId: 'addr3',
        									value: addr2
        								});
    									//customerAddress.save();
    									var customerId = customerRecord.save();
        								log.debug({title: 'customerId',details: customerId});
    								}
    							}
    						} // End of FOR-LOOP
    						return true;
    					}
    					catch(e)
    					{
    						log.debug('Error',e);
    					}
    				});

    	}
    	catch(e)
    	{
    		log.debug('Error !', e.toString());
    	}
 	
    }

    return {
        execute: execute
    };
    
});
