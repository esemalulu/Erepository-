/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/format', './AUX_pardot_lib', 'N/search', 'N/runtime', 'N/task'],

function(record, format, pardotLib, search, runtime, task)
{

    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext)
    {
        functionNavigator();
    }

    function functionNavigator()
    {
        var sf = [
                      ["custrecord_pi_config_key","isnotempty",""],
                      "AND",
                      ["custrecord_pi_config_email","isnotempty",""],
                      "AND",
                      ["custrecord_pi_config_pass","isnotempty",""],
                      "AND",
                      ["isinactive", "is", "F"],
                      "AND",
                      ["custrecord_pi_config_status", "anyof", "1"]
                 ];

        var sc = [
                      search.createColumn({ name : 'custrecord_pi_config_key'   }),
                      search.createColumn({ name : 'custrecord_pi_config_email' }),
                      search.createColumn({ name : 'custrecord_pi_config_pass'  }),
                      search.createColumn({ name : 'custrecord_pi_config_contact'}),
                      search.createColumn({ name : 'custrecord_pi_config_contact_sync'}),
                      search.createColumn({ name : 'custrecord_pi_config_contact_inactives'}),
                      search.createColumn({ name : 'custrecord_pi_config_contact_search'}),
                      search.createColumn({ name : 'custrecord_pi_config_status'})
                 ];

        var configSearch = search.create({
            type : 'customrecord_pi_config',
            filters : sf,
            columns : sc
        });

        var configRS = configSearch.run().getRange({start : 0, end : 1000 });
        if(configRS)
        {
            if(configRS.length != 0)
            {
                var email         = configRS[0].getValue({ name : 'custrecord_pi_config_email' });
                var pass          = configRS[0].getValue({ name : 'custrecord_pi_config_pass' });
                var user_key      = configRS[0].getValue({ name : 'custrecord_pi_config_key'});
                var contactSync   = configRS[0].getValue({ name : 'custrecord_pi_config_contact'});
                var syncAll       = configRS[0].getValue({ name : 'custrecord_pi_config_contact_sync'});
                var syncInactives = configRS[0].getValue({ name : 'custrecord_pi_config_contact_inactives'});
                var contactSearch = configRS[0].getValue({ name : 'custrecord_pi_config_contact_search'});
                var isEnabled     = configRS[0].getValue({ name : 'custrecord_pi_config_status'});
                var validRecord = false;
                var existingQueueRecord = true;



                if(email && pass && user_key && contactSync == true && contactSearch && isEnabled == 1)
                {
                    var contacts = search.load({ id : contactSearch});
                    var contactRS = contacts.run().getRange({ start: 0, end : 1000});
                    var result = syncNewProspectSearch(contactRS, validRecord, email, user_key, pass);
                }
                else if (email && pass && user_key && contactSync == true && syncAll == true && isEnabled == 1)
                {
                    var sf = [
                	          	["custrecord_pi_queue_sync_status","anyof","1"],
                                "AND",
                                ["custrecord_pi_queue_rectype", "anyof", "1"]
                	         ];

                	var sc = [
                	          	search.createColumn({ name : 'internalid'	}),
                	          	search.createColumn({ name : 'custrecord_pi_queue_recid' }),
                	          	search.createColumn({ name : 'custrecord_pi_queue_type' }),
                	          	search.createColumn({ name : 'custrecord_pi_queue_sync_status' }),
                	          	search.createColumn({ name : 'custrecord_pi_queue_sync_log' })
                	         ];

                	var queueSearch = search.create
                	({
                		type : 'customrecord_pi_queue',
                		filters : sf,
                		columns : sc
                	});

                	var queueSearchRS = queueSearch.run().getRange({ start : 0, end : 1000 });
                    var results = syncNewProspect(queueSearchRS, validRecord, email, user_key, pass);
                }
                else if(email && pass & user_key && contactSync == true  && existingQueueRecord == true && isEnabled == 1)
                {
                    var sf = [
                	          	["custrecord_pi_queue_sync_status","anyof","1"],
                                "AND",
                                ["custrecord_pi_queue_rectype", "anyof", "1"]
                	         ];

                	var sc = [
                	          	search.createColumn({
                	          		name : 'internalid'
                	          	}),
                	          	search.createColumn({
                	          		name : 'custrecord_pi_queue_recid'
                	          	}),
                	          	search.createColumn({
                	          		name : 'custrecord_pi_queue_type'
                	          	}),
                	          	search.createColumn({
                	          		name : 'custrecord_pi_queue_sync_status'
                	          	}),
                	          	search.createColumn({
                	          		name : 'custrecord_pi_queue_sync_log'
                	          	})
                	         ];

                	var queueSearch = search.create
                	({
                		type : 'customrecord_pi_queue',
                		filters : sf,
                		columns : sc
                	});

                	var queueSearchRS = queueSearch.run().getRange({ start : 0, end : 1000 });
                    if(queueSearchRS)
                    {
                        for(var i = 0; i < queueSearchRS.length; i+=1)
                        {
                            var prospectRecID   = queueSearchRS[i].getValue({ name : 'custrecord_pi_queue_recid' });
                            var queueSyncStatus = queueSearchRS[i].getText({ name : 'custrecord_pi_queue_sync_status' });

                            if(queueSyncStatus == 'PENDING')
                            {
                                var prospectRecord = record.load({
                                    type : record.Type.CONTACT,
                                    id : prospectRecID,
                                    isDynamic : true
                                });

                                var isValid = syncExistingProspect(prospectRecord, validRecord, email, user_key, pardotURL, pass);
                                if(isValid == false)
                                {
                                    var queueRecord = record.load({
                                        type : 'customrecord_pi_queue',
                                        id : queueRecID,
                                        isDynamic : true
                                    });

                                    queueRecord.setText({
                                        fieldId : 'custrecord_pi_queue_sync_status',
                                        text : 'ERROR',
                                    });
                                    queueRecord.setValue({
                                        fieldId : 'custrecord_pi_queue_sync_log',
                                        value : syncLog += ' STAGE 1 > ERROR > FAILED TO UPDATE PROSPECT RECORD.'
                                    });

                                    queueRecord.save();
                                }
                                else
                                {
                                    //IF CONTACT RECORD DOES HAVE AN EMAIL ADDRESS, THE REQUEST IS SUBMITTED TO PARDOT AND THE URL FOR THE PROSPECT RECORD IS GENERATED AND RETURNED.
                                    //GETS TODAYS DATE TIME FOR TIME OF COMPLETEION
                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });


                                    var dt = pardotLib.dateParser(timeStamp);

                                    // UPDATES THE QUEUE RECORD TO AVOID DUPLICATE PROCESSING OF THE SAME RECORD.
                                    var queueRecord = record.load({
                                        type : 'customrecord_pi_queue',
                                        id : queueRecID,
                                        isDynamic : true
                                    });

                                    queueRecord.setText({
                                        fieldId : 'custrecord_pi_queue_sync_status',
                                        text : 'COMPLETED',
                                    });
                                    queueRecord.setValue({
                                        fieldId : 'custrecord_pi_queue_sync_log',
                                        value : syncLog += isValid[1]
                                    });
                                    queueRecord.setValue({
                                        fieldId : 'custrecord_pi_queue_completed',
                                        value : dt
                                    });

                                    queueRecord.save();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    function syncNewProspect(queueSearchRS, validRecord, email, user_key, pass)
    {
    	var value;
        var createSuccess = 0;
        var createFail = 0;
        var numOfRecords = queueSearchRS.length;

    	// DO A PROSPECT FIELD SEARCH AND ONLY THE FIELDS WITH A VALUE FOR NS FIELD ID
    	var sf = [
			      		["isinactive","is","F"],
			      		"AND",
			      		["custrecord_pi_nsfieldid_p", "isnotempty", ""]
		      	 ];

		var sc = [
				      	search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
				      	search.createColumn({ name : 'custrecord_pi_custom_p'        }),
				      	search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     }),
				      	search.createColumn({ name : 'custrecord_pi_sync_priority_p' })
		      	 ];

		var pfieldsSearch = search.create({
			type    : 'customrecord_pi_prospects',
			filters : sf,
			columns : sc,
		});

		var pfieldsRS = pfieldsSearch.run().getRange({
			start : 0,
			end : 1000
		});

		// MAKE THE PARDOT CONNECTION AND FETCH THE API_KEY
			value = 'login';
		var connectionResponse = pardotLib.login(value, email, pass, user_key);
		var responseBody       = JSON.parse(connectionResponse.body);
		var apiKey             = responseBody.api_key;

        for(var i = 0; i < queueSearchRS.length; i+=1)
        {
            var prospectRec = record.load({
                type: record.Type.CONTACT,
                id : queueSearchRS[i].getValue({ name : 'custrecord_pi_queue_recid'})
            });
    		//BEING THE GENERATION OF THE REQUEST PAYLOAD.
    		var payload = 'user_key=' + user_key + '&api_key=' + apiKey + '&';

            // BUILDS THE PAYLOAD STRING WITH THE FIELD IDS RETURNED FROM THE PROSPECT FIELD SEARCH AND THE VALUES RETURNED FROM THE CONTACT RECORD THAT IS PASSED INTO THE FUNCTION.
            for(var y = 0; y < pfieldsRS.length; y+=1)
            {
                if(pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) == 'company')
                {
                    var companyname = search.lookupFields({
                        type : search.Type.CUSTOMER,
                        id : prospectRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'})}),
                        columns : 'entityid'
                    });
                    var name = companyname.entityid;
                    payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(name) + '&';
                    continue;
                }

                if(pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) == 'contactsource')
                {
                    var val = pardotLib.marketingCampaign();
                    for(var key in val)
                    {
                        if(key === prospectRec.getValue({fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'})}))
                        {
                            var src = val[key];
                            payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(src) + '&';
                            break;
                        }
                    }
                    continue;
                }

                if(prospectRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) }))
                {
                    payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(prospectRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) })) + '&';
                }
            }

    		// APPEND PAYLOAD FORMATTING OUTPUT.
    		payload += 'format=json';

            var queueRecord = record.load({
                type : 'customrecord_pi_queue',
                id : queueSearchRS[i].getValue({ name : 'internalid' })
            });

    		// LOOK IN THE PAYLOAD STRING IF IT DOESN'T FIND EMAIL IT IS NOT A VALID PAYLOAD AS EMAIL ADDRESS IS REQUIRED AS APART OF THE PAYLOAD.
    		if(payload.search('email') == -1)
    		{
                var hasEmail = false;
    			validRecord = false;
    			createFail+=1;
                continue;
    		}
    		else
    		{
    			// IF THE PAYLOAD IS VALID, SEND THE REQUEST TO PARDOT AND FORMAT THE RESPONSE TO A USABLE VALUES.
    	    		value = 'createprospect'
    	    	var cProspectResponse  = pardotLib.createProspect(value, apiKey, user_key, payload);
    	    	var cProspectResponseBody = JSON.parse(cProspectResponse.body);
                var cProspectsRBody = cProspectResponseBody['@attributes'];

                if(cProspectsRBody.stat == 'ok')
                {
        	    	//GETS THE PROSPECT ID RETURNED FROM PARDOT
        	    	var cProspectID = JSON.stringify(cProspectResponseBody.prospect.id);
        	    	var prospectURL = 'http://pi.pardot.com/prospect/read?id=' + cProspectID;
                    createSuccess+=1;

                    //UPDATE QUEUE RECORD
                    queueRecord.setText({
                        fieldId : 'custrecord_pi_queue_sync_status',
                        text : 'COMPLETED',
                    });

                    var timeStamp = format.format({
                        value: new Date(),
                        type: format.Type.DATETIMETZ
                    });

                    var dt = pardotLib.dateParser(timeStamp);

                    queueRecord.setValue({
                        fieldId : 'custrecord_pi_queue_completed',
                        value : dt
                    });

                    queueRecord.setValue({
                        fieldId : 'custrecord_pi_queue_sync_log',
                        value : ' COMPLETED > PROSECT SUCCESSFULLY CREATED IN PARDOT.'
                    })

                    queueRecord.save();

        	    	// CHECKS TO SEE IF THE PROSPECT ID IS NOT EMPTY.
        	    	if(cProspectID)
        	    	{
        	    		validRecord = true;
                        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                        if(remainingUsage < 50 )
                        {
                            var reschedule = task.create({
                                taskType : task.TaskType.SCHEDULED_SCRIPT
                            });

                            reschedule.scriptId = runtime.getCurrentScript().id;
                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                            reschedule.submit();
                            //break;
                        }
        	    	}
                }
                else
                {

                    var errCode = cProspectsRBody.err_code;
                    var errmsg = pardotLib.errorCodeSwitcher(errCode);
                    validRecord = false;
                    if(validRecord == false)
                    {
                        value = 'readprospects';
                        var readProspects = pardotLib.retrieveProspects(value, apiKey, user_key, payload);
                        var readProspectsBody = JSON.parse(readProspects.body);
                        var readProspectsAtt = readProspectsBody['@attributes'];

                        if(readProspectsAtt.stat == 'ok')
                        {
                            var prospectId = JSON.stringify(readProspectsBody.prospect.id);
                            var prospectURL =  'http://pi.pardot.com/prospect/read?id=' + prospectId;

                            if(prospectId)
                            {
                                createSuccess+=1;
                            }
                        }
                        else
                        {
                            var errCode = readProspectsAtt.err_code;
                            var errmsg = pardotLib.errorCodeSwitcher(errCode);
                            validRecord = false;
                            createFail+=1;

                            queueRecord.setText({
                                fieldId : 'custrecord_pi_queue_sync_status',
                                text : 'ERROR',
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotLib.dateParser(timeStamp);

                            queueRecord.setValue({
                                fieldId : 'custrecord_pi_queue_completed',
                                value : dt
                            });

                            queueRecord.setValue({
                                fieldId : 'custrecord_pi_queue_sync_log',
                                value : ' ERROR > PROSPECT NOT CREATED SUCCESSFULLY > REASON > ' + errmsg
                            });

                            queueRecord.save();
                        }

                    }
                }
            }

		}
    }

    function syncNewProspectSearch(resultSet, validRecord, email, user_key, pass)
    {
        var createSuccess = 0;
        var createFail = 0;
        // DO A PROSPECT FIELD SEARCH AND ONLY THE FIELDS WITH A VALUE FOR NS FIELD ID
        var sf = [
                        ["isinactive","is","F"],
                        "AND",
                        ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                 ];

        var sc = [
                        search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                        search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                        search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     }),
                        search.createColumn({ name : 'custrecord_pi_sync_priority_p' })
                 ];

        var pfieldsSearch = search.create({
            type    : 'customrecord_pi_prospects',
            filters : sf,
            columns : sc,
        });

        var pfieldsRS = pfieldsSearch.run().getRange({
            start : 0,
            end : 1000
        });

        // MAKE THE PARDOT CONNECTION AND FETCH THE API_KEY
            value = 'login';
        var connectionResponse = pardotLib.login(value, email, pass, user_key);
        var responseBody       = JSON.parse(connectionResponse.body);
        var apiKey             = responseBody.api_key;


        for(var i =0; i<resultSet.length; i+=1)
        {
            var contactRec = record.load({
                type : record.Type.CONTACT,
                id : resultSet[i].getValue({ name : 'internalid'})
            });
            //BEING THE GENERATION OF THE REQUEST PAYLOAD.
            var payload = 'user_key=' + user_key + '&api_key=' + apiKey + '&';

            // BUILDS THE PAYLOAD STRING WITH THE FIELD IDS RETURNED FROM THE PROSPECT FIELD SEARCH AND THE VALUES RETURNED FROM THE CONTACT RECORD THAT IS PASSED INTO THE FUNCTION.
            for(var y = 0; y < pfieldsRS.length; y+=1)
            {
                if(pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) == 'company')
                {
                    var companyname = search.lookupFields({
                        type : search.Type.CUSTOMER,
                        id : contactRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'})}),
                        columns : 'entityid'
                    });
                    var name = companyname.entityid;
                    payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(name) + '&';
                    continue;
                }

                 if(pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) == 'contactsource')
                 {
                    var val = pardotLib.marketingCampaign();
                    for(var key in val)
                    {
                        if(key === contactRec.getValue({fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'})}))
                        {
                            var src = val[key];
                            payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(src) + '&';
                            break;
                        }

                    }
                    continue;
                 }

                if(contactRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) }))
                {
                    payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(contactRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) })) + '&';
                }
            }

            var queueRecord = record.load({
                type : 'customrecord_pi_queue',
                id : queueSearchRS[i].getValue({ name : 'internalid' })
            });

            if(y == pfieldsRS.length)
            {
                // APPEND PAYLOAD FORMATTING OUTPUT.
                payload += 'format=json';
                if(payload.search('email') == -1)
        		{
                    var isEmail = true;
        			validRecord = false;
        			createFail+=1;

                    queueRecord.setText({
                        fieldId : 'custrecord_pi_queue_sync_status',
                        text : 'ERROR',
                    });

                    var timeStamp = format.format({
                        value: new Date(),
                        type: format.Type.DATETIMETZ
                    });

                    var dt = pardotLib.dateParser(timeStamp);

                    queueRecord.setValue({
                        fieldId : 'custrecord_pi_queue_completed',
                        value : dt
                    });

                    queueRecord.setValue({
                        fieldId : 'custrecord_pi_queue_sync_log',
                        value : ' ERROR > PROSPECT NOT CREATED SUCCESSFULLY > REASON > PROSPECT DOESNT HAVE AN EMAIL ADDRESS.'
                    });

                    queueRecord.save();
                    continue;
        		}
        		else
        		{
        			// IF THE PAYLOAD IS VALID, SEND THE REQUEST TO PARDOT AND FORMAT THE RESPONSE TO A USABLE VALUES.
        	    		value = 'createprospect'
        	    	var cProspectResponse  = pardotLib.createProspect(value, apiKey, user_key, payload);
        	    	var cProspectResponseBody = JSON.parse(cProspectResponse.body);
                    var cProspectsRBody = cProspectResponseBody['@attributes'];

                    if(cProspectsRBody.stat == 'ok')
                    {
            	    	//GETS THE PROSPECT ID RETURNED FROM PARDOT
            	    	var cProspectID = JSON.stringify(cProspectResponseBody.prospect.id);
            	    	var prospectURL = 'http://pi.pardot.com/prospect/read?id=' + cProspectID;



                        contactRec.setValue({
                            fieldId : 'custentitypi_url',
                            value : prospectURL
                        });

                        contactRec.save();
                        createSuccess+=1;

                        queueRecord.setText({
                            fieldId : 'custrecord_pi_queue_sync_status',
                            text : 'COMPLETED',
                        });

                        var timeStamp = format.format({
                            value: new Date(),
                            type: format.Type.DATETIMETZ
                        });

                        var dt = pardotLib.dateParser(timeStamp);

                        queueRecord.setValue({
                            fieldId : 'custrecord_pi_queue_completed',
                            value : dt
                        });

                        queueRecord.setValue({
                            fieldId : 'custrecord_pi_queue_sync_log',
                            value : ' COMPLETED > PROSPECT SUCCESSFULLY CREATED IN PARDOT '
                        });

                        queueRecord.save();

            	    	// CHECKS TO SEE IF THE PROSPECT ID IS NOT EMPTY.
            	    	if(cProspectID)
            	    	{
            	    		validRecord = true;
                            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                            if(remainingUsage < 50 )
                            {
                                var reschedule = task.create({
                                    taskType : task.TaskType.SCHEDULED_SCRIPT
                                });

                                reschedule.scriptId = runtime.getCurrentScript().id;
                                reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                reschedule.submit();
                                //break;
                            }
            	    	}
                    }
                    else
                    {
                        var errCode = cProspectsRBody.err_code;
                        var errmsg = pardotLib.errorCodeSwitcher(errCode);
                        validRecord = false;
                        if(validRecord == false)
                        {
                            value = 'readprospects';
                            var readProspects = pardotLib.retrieveProspects(value, apiKey, user_key, payload);
                            var readProspectsBody = JSON.parse(readProspects.body);
                            var readProspectsAtt = readProspectsBody['@attributes'];

                            if(readProspectsAtt.stat == 'ok')
                            {
                                var prospectId = JSON.stringify(readProspectsBody.prospect.id);
                                var prospectURL =  'http://pi.pardot.com/prospect/read?id=' + prospectId;

                                if(prospectId)
                                {
                                    validRecord = true;
                                    contactRec.setValue({
                                        fieldId : 'custentitypi_url',
                                        value : prospectURL
                                    });

                                    contactRec.save();
                                    createSuccess+=1;
                                }
                            }
                            else
                            {
                                var errCode = readProspectsAtt.err_code;
                                var errmsg = pardotLib.errorCodeSwitcher(errCode);
                                validRecord = false;

                                queueRecord.setText({
                                    fieldId : 'custrecord_pi_queue_sync_status',
                                    text : 'ERROR',
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                queueRecord.setValue({
                                    fieldId : 'custrecord_pi_queue_completed',
                                    value : dt
                                });

                                queueRecord.setValue({
                                    fieldId : 'custrecord_pi_queue_sync_log',
                                    value : ' ERROR > PROSPECT NOT CREATED SUCCESSFULLY > REASON > ' + errmsg
                                });

                                queueRecord.save();
                            }

                        }
                    }
        		}
            }
        }
        return [true, createSuccess, createFail, resultSet.length];

    }

    function syncExistingProspect(prospectRec, validRecord, email, user_key, pardotURL, pass)
    {
    	var URL = pardotURL.split('=');
    	if(URL)
    	{
    		var prospectID = URL[1];
        	var value;

        	// DO A PROSPECT FIELD SEARCH AND ONLY THE FIELDS WITH A VALUE FOR NS FIELD ID
        	var sf = [
    			      		["isinactive","is","F"],
    			      		"AND",
    			      		["custrecord_pi_nsfieldid_p", "isnotempty", ""]
    		      	 ];

    		var sc = [
    				      	search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
    				      	search.createColumn({ name : 'custrecord_pi_custom_p'        }),
    				      	search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     }),
    				      	search.createColumn({ name : 'custrecord_pi_sync_priority_p' })
    		      	 ];

    		var pfieldsSearch = search.create({
    			type    : 'customrecord_pi_prospects',
    			filters : sf,
    			columns : sc,
    		});

    		var pfieldsRS = pfieldsSearch.run().getRange({
    			start : 0,
    			end : 1000
    		});

    		// MAKE THE PARDOT CONNECTION AND FETCH THE API_KEY
    			value = 'login';
    		var connectionResponse = pardotLib.login(value, email, pass, user_key);
    		var responseBody       = JSON.parse(connectionResponse.body);
    		var apiKey             = responseBody.api_key;

    		//BEING THE GENERATION OF THE REQUEST PAYLOAD.
    		var payload = 'user_key=' + user_key + '&api_key=' + apiKey + '&';

            // BUILDS THE PAYLOAD STRING WITH THE FIELD IDS RETURNED FROM THE PROSPECT FIELD SEARCH AND THE VALUES RETURNED FROM THE CONTACT RECORD THAT IS PASSED INTO THE FUNCTION.
    		for(var y = 0; y < pfieldsRS.length; y+=1)
    		{
                if(pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) == 'company')
                {
                    var companyname = search.lookupFields({
                        type : search.Type.CUSTOMER,
                        id : prospectRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'})}),
                        columns : 'entityid'
                    });
                    var name = companyname.entityid;
                    payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(name) + '&';
                    continue;
                }

                 if(pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) == 'contactsource')
                 {
                    var val = pardotLib.marketingCampaign();
                    for(var key in val)
                    {
                        if(key === prospectRec.getValue({fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'})}))
                        {
                            var src = val[key];
                            payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(src) + '&';
                            break;
                        }

                    }
                    continue;
                 }

    			if(prospectRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) }))
    			{
    				payload += pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p' }) + '=' + encodeURIComponent(prospectRec.getValue({ fieldId : pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) })) + '&';
    			}
    		}

    		// APPEND PAYLOAD FORMATTING OUTPUT.
    		payload += 'id=' + prospectID + '&format=json';

    		// LOOK IN THE PAYLOAD STRING IF IT DOESN'T FIND EMAIL IT IS NOT A VALID PAYLOAD AS EMAIL ADDRESS IS REQUIRED AS APART OF THE PAYLOAD.
    		if(payload.search('email') == -1)
    		{
    			validRecord = false;
    			return validRecord;
    		}
    		else
    		{
    			// IF THE PAYLOAD IS VALID, SEND THE REQUEST TO PARDOT AND FORMAT THE RESPONSE TO A USABLE VALUES.
    	    		value = 'updateprospect';
    	    	var uProspectResponse  = pardotLib.updateProspect(value, apiKey, user_key, payload);
    	    	var uProspectResponseBody = JSON.parse(uProspectResponse.body);
    	    	var uProspectServerBody = uProspectResponseBody['@attributes'];

    	    	if(uProspectServerBody.stat == 'ok')
    	    	{
    	    		var syncLog = ' STAGE 1 > COMPLETED > PROSPECT RECORD SUCCESSFULLY UPDATED.';
    	    		validRecord = true;
                    var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                    if(remainingUsage < 50 )
                    {
                        var reschedule = task.create({
                            taskType : task.TaskType.SCHEDULED_SCRIPT
                        });

                        reschedule.scriptId = runtime.getCurrentScript().id;
                        reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                        reschedule.submit();
                        //break;
                    }

    	    		return [validRecord, syncLog];
    	    	}
    	    	else
    	    	{
                    var errCode = uProspectServerBody.err_code;
                    var errmsg = pardotLib.errorCodeSwitcher(errCode);
    	    		validRecord = false;
    	    		return [validRecord, errmsg];
    	    	}
    		}
    	}
    	else
    	{
    		validRecord = false;
    		return validRecord;
    	}


    }

    return {
        execute: execute
    };

});
