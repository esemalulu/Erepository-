/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', './AUX_pardot_lib', 'N/format', 'N/runtime', 'N/task'],

function(search, record, pardotLib, format, runtime, task) {

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
                      search.createColumn({ name : 'custrecord_pi_config_cust_search'}),
                      search.createColumn({ name : 'custrecord_pi_config_apiversion'}),
                      search.createColumn({ name : 'custrecord_pi_config_status'}),
                      search.createColumn({ name : 'custrecord_pi_config_cust_search_up'}),
                      search.createColumn({ name : 'custrecord_pi_config_cust_sync_inactives'}),
                      search.createColumn({ name : 'custrecord_pi_config_cust_sync'}),
                      search.createColumn({ name : 'custrecord_pi_config_cust'})
                 ];

        var configSearch = search.create({
            type : 'customrecord_pi_config',
            filters : sf,
            columns : sc,
        });

        var configSearchRS = configSearch.run().getRange({ start : 0, end : 1000 });
        if(configSearchRS)
        {
            var user_key                 = configSearchRS[0].getValue({ name : 'custrecord_pi_config_key'});
            var email                    = configSearchRS[0].getValue({ name : 'custrecord_pi_config_email'});
            var pass                     = pardotLib.decodeAdminPassword(configSearchRS[0].getValue({ name : 'custrecord_pi_config_pass'}));
            var newCustSearchID          = configSearchRS[0].getValue({ name : 'custrecord_pi_config_cust_search'});
            var custSync                 = configSearchRS[0].getValue({ name : 'custrecord_pi_config_cust' });
            var updateCustSearchID       = configSearchRS[0].getValue({ name : 'custrecord_pi_config_cust_search_up'});
            var apiversion               = configSearchRS[0].getValue({ name : 'custrecord_pi_config_apiversion'});
            var connectionStatus         = configSearchRS[0].getValue({ name : 'custrecord_pi_config_status'});
            var custSyncAll              = configSearchRS[0].getValue({ name : 'custrecord_pi_config_cust_sync'});
            var custSyncInactives        = configSearchRS[0].getValue({ name : 'custrecord_pi_config_cust_sync_inactives'});

            if(user_key && email && pass && custSync == true && custSyncAll == true && connectionStatus == '1')
            {
                syncAllAccounts(user_key, email, pass, apiversion);
            }
            else if(user_key && email && pass && custSync == true && newCustSearchID && updateCustSearchID && connectionStatus == '1')
            {
                syncAccountsWithSearches(user_key, email, pass, apiversion, newCustSearchID, updateCustSearchID);
            }
            else if(user_key && email && pass && custSync == true && custSyncInactives == true && connectionStatus == '1')
            {
                syncAccountsWithInactives(user_key, email, pass, apiversion);
            }
        }
    }

    function syncAllAccounts(user_key, email, pass, apiversion)
    {
        var createNewAccountSuccess = 0 , createNewAccountFail = 0;
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

        //GENERATE JAVASCRIPT DATE OBJECT
        var date = new Date();

        //GENERATE DATE FORMAT ACCEPTED BY PARDOT
        var executionDate = ' ' + date.getHours() + ':' + pardotLib.minutes(date);

        var executionDT = format.format({
            value : date,
            type : format.Type.DATE
        });

        executionDT += executionDate;

        var sf = [
                    ["datecreated","onorafter", executionDT],
                    "AND",
                    ["custentity_pi_pa_url","isnotempty",""],
                    "AND",
                    ["custentity_pi_pa_url","startswith","http://queued"],
                    "AND",
                    ["isinactive","is","F"]
                ];

        var sc = [
                    search.createColumn({ name : 'internalid' }),
                    search.createColumn({ name : 'custentity_pi_pa_url' })
                ]

        var custSearch = search.create({
            type : search.Type.CUSTOMER,
            filters : sf,
            columns : sc
        });


        var sf = [
                    ["isinactive","is","F"],
                    "AND",
                    ["custrecord_pi_nsfieldid_pa","isnotempty",""],
                    "AND",
                    ["custrecord_pi_syncp_pa","anyof","1"]
                ];

        var sc = [
            search.createColumn({ name : 'custrecord_pi_fieldid_pa'}),
            search.createColumn({ name : 'custrecord_pi_nsfieldid_pa'})
        ];

        var pafields = search.create({
            type : 'customrecord_pi_prospect_accounts',
            filters : sf,
            columns : sc
        });

        var pafieldsRS = pafields.run().getRange({start : 0, end : 1000});

        var custSearchRS = custSearch.run().getRange({ start : 0, end : 1000 });
        if(custSearchRS)
        {
            for(var i = 0; i < custSearchRS.length; i+=1)
            {
                var custId = custSearchRS[i].getValue({ name : 'internalid' });
                var acctURL = custSearchRS[i].getValue({ name : 'custentity_pi_pa_url' });
                value = 'login';
                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                var responseBody       = JSON.parse(connectionResponse.body);
                var apiKey             = responseBody.api_key;
                var rep;
                var payload = 'user_key=' + user_key + '&api_key=' + apiKey + '&';
                var custRec = record.load({
                    type : record.Type.CUSTOMER,
                    id : custId
                });

                rep = custRec.getText({ fieldId : 'salesrep'});
                for(var y = 0; y < pafieldsRS.length; y+=1)
                {
                    if((pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'}).search('shipping') > -1) || (pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'}).search('billing') > -1 ))
                    {
                        var numOfLines = custRec.getLineCount({ sublistId: 'addressbook'});
                        numlines:if(numOfLines)
                        {
                            for(var x = 0; x < numOfLines; x+=1)
                            {
                                var addressSubrecord = custRec.getSublistSubrecord({
                                    sublistId: 'addressbook',
                                    fieldId: 'addressbookaddress',
                                    line : x
                                });

                                // DEFAULT SHIPPING AND BILLING LOGIC WITH DEFAULT ADDRESS SET.
                                var defaultShipping = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultshipping', line: x});
                                var defaultBilling  = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultbilling', line: x});

                                if(addressSubrecord.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})}))
                                {
                                    if(payload.search(pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'})) == -1)
                                    {
                                        payload += pafieldsRS[y].getValue({name : 'custrecord_pi_fieldid_pa'}) + '=' + encodeURIComponent(addressSubrecord.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})})) + '&';
                                        break numlines;
                                    }
                                }
                            }
                            continue;
                        }
                    }
                    else if (custRec.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})}))
                    {
                        if(payload.search(pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'})) == -1)
                        {
                            payload += pafieldsRS[y].getValue({name : 'custrecord_pi_fieldid_pa'}) + '=' + encodeURIComponent(custRec.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})})) + '&';
                            continue;
                        }
                    }
                }
                if( y == pafieldsRS.length)
                {
                    payload += 'format=json';
                    value = 'createprospectaccount';
                    var createResponse = pardotLib.createProspect(value, apiKey, user_key, payload, apiversion);
                    var createBody = JSON.parse(createResponse.body);
                    var createResult = createBody.prospectAccount;
                    if(createResult)
                    {
                        remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                        if(createResponse.code == 200)
                        {
                            createNewAccountSuccess+=1;
                            var id = createResult.id;
                            custRec.setValue({
                                fieldId : 'custentity_pi_pa_url',
                                value : 'https://pi.pardot.com/prospectAccount/read/id/' + id
                            });

                            custRec.save();
                            assignAccount(user_key, apiKey, id, rep, apiversion);
                        }
                        else
                        {
                            createNewAccountFail+=1;
                            var resp = createBody['@attributes'];
                            var errCode = resp.err_code;
                            var errmsg = pardotLib.errorCodeSwitcher(errCode);
                            log.debug('RECORD ID THAT WASN"T CREATED SUCCESSFULLY', custId);
                            log.debug('ERROR DURING ACCOUNT CREATION', errmsg);
                        }

                        if(remainingUsage < 1000)
                        {
                            var reschedule = task.create({
                                taskType : task.TaskType.SCHEDULED_SCRIPT
                            });

                            reschedule.scriptId = runtime.getCurrentScript().id;
                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                            reschedule.submit();

                            var percentage = (i * 100) / custSearchRS.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                            break;
                        }
                    }
                }
            }

            var queueRecord = record.create({
                type : 'customrecord_pi_queue',
                isDynamic : true
            });


            var timeStamp = format.format({
                value: new Date(),
                type: format.Type.DATETIMETZ
            });

            var dt = pardotLib.dateParser(timeStamp);

            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_rectype', value : '2' });
            queueRecord.setText({ fieldId : 'custrecord_pi_queue_type', text : 'NORMAL' });
            queueRecord.setText({ fieldId : 'custrecord_pi_queue_sync_status', text : 'COMPLETED' });
            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_date', value : dt });
            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt });
            queueRecord.setText({
                fieldId : 'custrecord_pi_queue_sync_log',
                text : 'QUEUE RECORD CREATED > PENDING > NUMBER OF NEW ACCOUNTS: ' + custSearchRS.length + ' > NUMBER OF NEW ACCOUNTS CREATED SUCCESSFULLY: ' + createNewAccountSuccess + ' > NUMBER OF NEW ACCOUNTS NOT CREATED SUCCESSFULLY: ' + createNewAccountFail
            });

            queueRecord.save();
        }

        var updateAccountSuccess = 0 , updateAccountFail = 0;
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

        //GENERATE JAVASCRIPT DATE OBJECT
        var date = new Date();

        //GENERATE DATE FORMAT ACCEPTED BY PARDOT
        var executionDate = ' ' + date.getHours() + ':' + pardotLib.minutes(date);

        var executionDT = format.format({
            value : date,
            type : format.Type.DATE
        });

        executionDT += executionDate;

        var sf = [
                    ["lastmodifieddate","onorafter", executionDT],
                    "AND",
                    ["custentity_pi_pa_url","isnotempty",""],
                    "AND",
                    ["custentity_pi_pa_url","doesnotcontain","http://queued"],
                    "AND",
                    ["isinactive","is","F"]
                ];

        var sc = [
                    search.createColumn({ name : 'internalid' }),
                    search.createColumn({ name : 'custentity_pi_pa_url' })
                ]

        var custSearch = search.create({
            type : search.Type.CUSTOMER,
            filters : sf,
            columns : sc
        });

        var sf = [
                    ["isinactive","is","F"],
                    "AND",
                    ["custrecord_pi_nsfieldid_pa","isnotempty",""],
                    "AND",
                    ["custrecord_pi_syncp_pa","anyof","1"]
                ];

        var sc = [
            search.createColumn({ name : 'custrecord_pi_fieldid_pa'}),
            search.createColumn({ name : 'custrecord_pi_nsfieldid_pa'})
        ];

        var pafields = search.create({
            type : 'customrecord_pi_prospect_accounts',
            filters : sf,
            columns : sc
        });

        var pafieldsRS = pafields.run().getRange({start : 0, end : 1000});

        var custSearchRS = custSearch.run().getRange({ start : 0, end : 1000 });
        if(custSearchRS)
        {
            for(var i = 0; i < custSearchRS.length; i+=1)
            {
                var custId = custSearchRS[i].getValue({ name : 'internalid' });
                var acctURL = custSearchRS[i].getValue({ name : 'custentity_pi_pa_url' });
                value = 'login';
                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                var responseBody       = JSON.parse(connectionResponse.body);
                var apiKey             = responseBody.api_key;
                var rep;
                var payload = 'user_key=' + user_key + '&api_key=' + apiKey + '&';
                var custRec = record.load({
                    type : record.Type.CUSTOMER,
                    id : custId
                });

                rep = custRec.getText({ fieldId : 'salesrep'});
                for(var y = 0; y < pafieldsRS.length; y+=1)
                {
                    if((pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'}).search('shipping') > -1) || (pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'}).search('billing') > -1 ))
                    {
                        var numOfLines = custRec.getLineCount({ sublistId: 'addressbook'});
                        numlines:if(numOfLines)
                        {
                            for(var x = 0; x < numOfLines; x+=1)
                            {
                                var addressSubrecord = custRec.getSublistSubrecord({
                                    sublistId: 'addressbook',
                                    fieldId: 'addressbookaddress',
                                    line : x
                                });

                                // DEFAULT SHIPPING AND BILLING LOGIC WITH DEFAULT ADDRESS SET.
                                var defaultShipping = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultshipping', line: x});
                                var defaultBilling  = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultbilling', line: x});

                                if(addressSubrecord.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})}))
                                {
                                    if(payload.search(pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'})) == -1)
                                    {
                                        payload += pafieldsRS[y].getValue({name : 'custrecord_pi_fieldid_pa'}) + '=' + encodeURIComponent(addressSubrecord.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})})) + '&';
                                        break numlines;
                                    }
                                }
                            }
                            continue;
                        }
                    }
                    else if (custRec.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})}))
                    {
                        if(payload.search(pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'})) == -1)
                        {
                            payload += pafieldsRS[y].getValue({name : 'custrecord_pi_fieldid_pa'}) + '=' + encodeURIComponent(custRec.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})})) + '&';
                            continue;
                        }
                    }
                }
                if( y == pafieldsRS.length)
                {
                    var url = acctURL.split('/id/');
                    var id = url[1];
                    payload += 'id='+id+'&format=json';
                    value = 'updateprospectaccount';
                    var updateResponse = pardotLib.createProspect(value, apiKey, user_key, payload, apiversion);
                    var updateResponseBody = JSON.parse(updateResponse.body);
                    var updateResult = updateResponseBody.prospectAccount;
                    if(updateResult)
                    {
                        remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                        if(updateResponse.code == 200)
                        {
                            updateAccountSuccess+=1;
                            var id = updateResult.id;
                            custRec.setValue({
                                fieldId : 'custentity_pi_pa_url',
                                value : 'https://pi.pardot.com/prospectAccount/read/id/' + id
                            });

                            custRec.save();
                            assignAccount(user_key, apiKey, id, rep, apiversion);
                        }
                        else
                        {
                            updateAccountFail+=1;
                            var resp = updateResult['@attributes'];
                            var errCode = resp.err_code;
                            var errmsg = pardotLib.errorCodeSwitcher(errCode);
                            log.debug('RECORD ID THAT WASN"T CREATED SUCCESSFULLY', custId);
                            log.debug('ERROR DURING ACCOUNT CREATION', errmsg);
                        }

                        if(remainingUsage < 1000)
                        {
                            var reschedule = task.create({
                                taskType : task.TaskType.SCHEDULED_SCRIPT
                            });

                            reschedule.scriptId = runtime.getCurrentScript().id;
                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                            reschedule.submit();

                            var percentage = (i * 100) / custSearchRS.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                            break;
                        }
                    }
                }
            }
            var queueRecord = record.create({
                type : 'customrecord_pi_queue',
                isDynamic : true
            });


            var timeStamp = format.format({
                value: new Date(),
                type: format.Type.DATETIMETZ
            });

            var dt = pardotLib.dateParser(timeStamp);

            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_rectype', value : '2' });
            queueRecord.setText({ fieldId : 'custrecord_pi_queue_type', text : 'NORMAL' });
            queueRecord.setText({ fieldId : 'custrecord_pi_queue_sync_status', text : 'COMPLETED' });
            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_date', value : dt });
            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt });
            queueRecord.setText({
                fieldId : 'custrecord_pi_queue_sync_log',
                text : 'QUEUE RECORD CREATED > PENDING > NUMBER OF UPDATED ACCOUNTS: ' + custSearchRS.length + ' > NUMBER OF ACCOUNTS SUCCESSFULLY UPDATED: ' + updateAccountSuccess + ' > NUMBER OF ACCOUNTS NOT SUCCESSFULLY UPDATED: ' + updateAccountFail
            });

            queueRecord.save();
        }
    }

    function syncAccountsWithSearches(user_key, email, pass, apiversion, newCustSearchID, updateCustSearchID)
    {
        // NEW
        var custSearchNew = search.load({ id : newCustSearchID });

        var createNewAccountSuccess = 0 , createNewAccountFail = 0;
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

        /*//GENERATE JAVASCRIPT DATE OBJECT
        var date = new Date();

        //GENERATE DATE FORMAT ACCEPTED BY PARDOT
        var executionDate = ' ' + date.getHours() + ':' + pardotLib.minutes(date);

        var executionDT = format.format({
            value : date,
            type : format.Type.DATE
        });

        executionDT += executionDate;*/

        var searchFilters = custSearchNew.filterExpression;
        //searchFilters.push("AND");
        //searchFilters.push(["datecreated","onorafter", executionDT]);

        var searchColumns = [
            search.createColumn({ name : 'internalid'}),
            search.createColumn({ name : 'custentity_pi_pa_url'})

        ];

        var customerSearch = search.create({
            type : record.Type.CUSTOMER,
            filters: searchFilters,
            columns : searchColumns
        });

        var sf = [
                    ["isinactive","is","F"],
                    "AND",
                    ["custrecord_pi_nsfieldid_pa","isnotempty",""],
                    "AND",
                    ["custrecord_pi_syncp_pa","anyof","1"]
                ];

        var sc = [
            search.createColumn({ name : 'custrecord_pi_fieldid_pa'}),
            search.createColumn({ name : 'custrecord_pi_nsfieldid_pa'})
        ];

        var pafields = search.create({
            type : 'customrecord_pi_prospect_accounts',
            filters : sf,
            columns : sc
        });

        var pafieldsRS = pafields.run().getRange({start : 0, end : 1000});

        var custSearchRS = customerSearch.run().getRange({ start : 0, end : 1000});
        if(custSearchRS)
        {
            for(var i = 0; i < custSearchRS.length; i+=1)
            {
                var custId = custSearchRS[i].getValue({ name : 'internalid' });
                var acctURL = custSearchRS[i].getValue({ name : 'custentity_pi_pa_url' });
                value = 'login';
                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                var responseBody       = JSON.parse(connectionResponse.body);
                var apiKey             = responseBody.api_key;
                var rep;
                var payload = 'user_key=' + user_key + '&api_key=' + apiKey + '&';
                var custRec = record.load({
                    type : record.Type.CUSTOMER,
                    id : custId
                });

                rep = custRec.getText({ fieldId : 'salesrep'});
                for(var y = 0; y < pafieldsRS.length; y+=1)
                {
                    if((pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'}).search('shipping') > -1) || (pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'}).search('billing') > -1 ))
                    {
                        var numOfLines = custRec.getLineCount({ sublistId: 'addressbook'});
                        numlines:if(numOfLines)
                        {
                            for(var x = 0; x < numOfLines; x+=1)
                            {
                                var addressSubrecord = custRec.getSublistSubrecord({
                                    sublistId: 'addressbook',
                                    fieldId: 'addressbookaddress',
                                    line : x
                                });

                                // DEFAULT SHIPPING AND BILLING LOGIC WITH DEFAULT ADDRESS SET.
                                var defaultShipping = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultshipping', line: x});
                                var defaultBilling  = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultbilling', line: x});

                                if(addressSubrecord.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})}))
                                {
                                    if(payload.search(pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'})) == -1)
                                    {
                                        payload += pafieldsRS[y].getValue({name : 'custrecord_pi_fieldid_pa'}) + '=' + encodeURIComponent(addressSubrecord.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})})) + '&';
                                        break numlines;
                                    }
                                }
                            }
                            continue;
                        }
                    }
                    else if (custRec.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})}))
                    {
                        if(payload.search(pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'})) == -1)
                        {
                            payload += pafieldsRS[y].getValue({name : 'custrecord_pi_fieldid_pa'}) + '=' + encodeURIComponent(custRec.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})})) + '&';
                            continue;
                        }
                    }
                }
                if( y == pafieldsRS.length)
                {
                    payload += 'format=json';
                    value = 'createprospectaccount';
                    var createResponse = pardotLib.createProspect(value, apiKey, user_key, payload, apiversion);
                    var createBody = JSON.parse(createResponse.body);
                    var createResult = createBody.prospectAccount;
                    if(createResult)
                    {
                        remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                        if(createResponse.code == 200)
                        {
                            createNewAccountSuccess+=1;
                            var id = createResult.id;
                            custRec.setValue({
                                fieldId : 'custentity_pi_pa_url',
                                value : 'https://pi.pardot.com/prospectAccount/read/id/' + id
                            });

                            custRec.save();
                            assignAccount(user_key, apiKey, id, rep, apiversion)
                        }
                        else
                        {
                            createNewAccountFail+=1;
                            var resp = createBody['@attributes'];
                            var errCode = resp.err_code;
                            var errmsg = pardotLib.errorCodeSwitcher(errCode);
                            log.debug('RECORD ID THAT WASN"T CREATED SUCCESSFULLY', custId);
                            log.debug('ERROR DURING ACCOUNT CREATION', errmsg);
                        }

                        if(remainingUsage < 1000)
                        {
                            var reschedule = task.create({
                                taskType : task.TaskType.SCHEDULED_SCRIPT
                            });

                            reschedule.scriptId = runtime.getCurrentScript().id;
                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                            reschedule.submit();

                            var percentage = (i * 100) / custSearchRS.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                            break;
                        }
                    }
                }
            }

            var queueRecord = record.create({
                type : 'customrecord_pi_queue',
                isDynamic : true
            });


            var timeStamp = format.format({
                value: new Date(),
                type: format.Type.DATETIMETZ
            });

            var dt = pardotLib.dateParser(timeStamp);

            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_rectype', value : '2' });
            queueRecord.setText({ fieldId : 'custrecord_pi_queue_type', text : 'NORMAL' });
            queueRecord.setText({ fieldId : 'custrecord_pi_queue_sync_status', text : 'COMPLETED' });
            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_date', value : dt });
            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt });
            queueRecord.setText({
                fieldId : 'custrecord_pi_queue_sync_log',
                text : 'QUEUE RECORD CREATED > PENDING > NUMBER OF NEW ACCOUNTS: ' + custSearchRS.length + ' > NUMBER OF NEW ACCOUNTS CREATED SUCCESSFULLY: ' + createNewAccountSuccess + ' > NUMBER OF NEW ACCOUNTS NOT CREATED SUCCESSFULLY: ' + createNewAccountFail
            });

            queueRecord.save();
        }

        //UPDATE

        var custSearchUpdate = search.load({ id : updateCustSearchID });

        var updateAccountSuccess = 0 , updateAccountFail = 0;
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

        //GENERATE JAVASCRIPT DATE OBJECT
        var date = new Date();

        //GENERATE DATE FORMAT ACCEPTED BY PARDOT
        var executionDate = ' ' + date.getHours() + ':' + pardotLib.minutes(date);

        var executionDT = format.format({
            value : date,
            type : format.Type.DATE
        });

        executionDT += executionDate;

        var searchFilters = custSearchUpdate.filterExpression;
        searchFilters.push("AND");
        searchFilters.push(["lastmodifieddate","onorafter", executionDT]);

        var searchColumns = [
            search.createColumn({ name : 'internalid'}),
            search.createColumn({ name : 'custentity_pi_pa_url'})
        ];

        var customerSearch = search.create({
            type : record.Type.CUSTOMER,
            filters: searchFilters,
            columns : searchColumns
        });

        var sf = [
                    ["isinactive","is","F"],
                    "AND",
                    ["custrecord_pi_nsfieldid_pa","isnotempty",""],
                    "AND",
                    ["custrecord_pi_syncp_pa","anyof","1"]
                ];

        var sc = [
            search.createColumn({ name : 'custrecord_pi_fieldid_pa'}),
            search.createColumn({ name : 'custrecord_pi_nsfieldid_pa'})
        ];

        var pafields = search.create({
            type : 'customrecord_pi_prospect_accounts',
            filters : sf,
            columns : sc
        });

        var pafieldsRS = pafields.run().getRange({start : 0, end : 1000});

        var custSearchRS = customerSearch.run().getRange({ start : 0, end : 1000});
        if(custSearchRS)
        {
            for(var i = 0; i < custSearchRS.length; i+=1)
            {
                var custId = custSearchRS[i].getValue({ name : 'internalid' });
                var acctURL = custSearchRS[i].getValue({ name : 'custentity_pi_pa_url' });
                value = 'login';
                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                var responseBody       = JSON.parse(connectionResponse.body);
                var apiKey             = responseBody.api_key;
                var rep;
                var payload = 'user_key=' + user_key + '&api_key=' + apiKey + '&';
                var custRec = record.load({
                    type : record.Type.CUSTOMER,
                    id : custId
                });

                rep = custRec.getText({ fieldId : 'salesrep'});
                for(var y = 0; y < pafieldsRS.length; y+=1)
                {
                    if((pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'}).search('shipping') > -1) || (pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'}).search('billing') > -1 ))
                    {
                        var numOfLines = custRec.getLineCount({ sublistId: 'addressbook'});
                        numlines:if(numOfLines)
                        {
                            for(var x = 0; x < numOfLines; x+=1)
                            {
                                var addressSubrecord = custRec.getSublistSubrecord({
                                    sublistId: 'addressbook',
                                    fieldId: 'addressbookaddress',
                                    line : x
                                });

                                // DEFAULT SHIPPING AND BILLING LOGIC WITH DEFAULT ADDRESS SET.
                                var defaultShipping = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultshipping', line: x});
                                var defaultBilling  = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultbilling', line: x});

                                if(addressSubrecord.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})}))
                                {
                                    if(payload.search(pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'})) == -1)
                                    {
                                        payload += pafieldsRS[y].getValue({name : 'custrecord_pi_fieldid_pa'}) + '=' + encodeURIComponent(addressSubrecord.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})})) + '&';
                                        break numlines;
                                    }
                                }
                            }
                            continue;
                        }
                    }
                    else if (custRec.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})}))
                    {
                        if(payload.search(pafieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_pa'})) == -1)
                        {
                            payload += pafieldsRS[y].getValue({name : 'custrecord_pi_fieldid_pa'}) + '=' + encodeURIComponent(custRec.getValue({fieldId : pafieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_pa'})})) + '&';
                            continue;
                        }
                    }
                }
                if(y == pafieldsRS.length)
                {
                    var url = acctURL.split('/id/');
                    var id = url[1];
                    payload += 'id='+id+'&format=json';
                    value = 'updateprospectaccount';
                    var updateResponse = pardotLib.createProspect(value, apiKey, user_key, payload, apiversion);
                    var updateResponseBody = JSON.parse(updateResponse.body);
                    var updateResult = updateResponseBody.prospectAccount;
                    if(updateResult)
                    {
                        remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                        if(updateResponse.code == 200)
                        {
                            updateAccountSuccess+=1;
                            var id = updateResult.id;
                            custRec.setValue({
                                fieldId : 'custentity_pi_pa_url',
                                value : 'https://pi.pardot.com/prospectAccount/read/id/' + id
                            });

                            custRec.save();
                            assignAccount(user_key, apiKey, id, rep, apiversion);

                        }
                        else
                        {
                            updateAccountFail+=1;
                            var resp = updateResult['@attributes'];
                            var errCode = resp.err_code;
                            var errmsg = pardotLib.errorCodeSwitcher(errCode);
                            log.debug('RECORD ID THAT WASN"T CREATED SUCCESSFULLY', custId);
                            log.debug('ERROR DURING ACCOUNT CREATION', errmsg);
                        }

                        if(remainingUsage < 1000)
                        {
                            var reschedule = task.create({
                                taskType : task.TaskType.SCHEDULED_SCRIPT
                            });

                            reschedule.scriptId = runtime.getCurrentScript().id;
                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                            reschedule.submit();

                            var percentage = (i * 100) / custSearchRS.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                            break;
                        }
                    }
                }
            }
            var queueRecord = record.create({
                type : 'customrecord_pi_queue',
                isDynamic : true
            });


            var timeStamp = format.format({
                value: new Date(),
                type: format.Type.DATETIMETZ
            });

            var dt = pardotLib.dateParser(timeStamp);

            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_rectype', value : '2' });
            queueRecord.setText({ fieldId : 'custrecord_pi_queue_type', text : 'NORMAL' });
            queueRecord.setText({ fieldId : 'custrecord_pi_queue_sync_status', text : 'COMPLETED' });
            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_date', value : dt });
            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt });
            queueRecord.setText({
                fieldId : 'custrecord_pi_queue_sync_log',
                text : 'QUEUE RECORD CREATED > PENDING > NUMBER OF UPDATED ACCOUNTS: ' + custSearchRS.length + ' > NUMBER OF ACCOUNTS SUCCESSFULLY UPDATED: ' + updateAccountSuccess + ' > NUMBER OF ACCOUNTS NOT SUCCESSFULLY UPDATED: ' + updateAccountFail
            });

            queueRecord.save();
        }
    }

    function syncAccountsWithInactives(user_key, email, pass, apiversion)
    {

    }

    function assignAccount(user_key, api_key, id, rep, apiversion)
    {
        try
        {
            var val = pardotLib.users(rep, user_key, api_key, apiversion);
            var assigned_to;
            for(var key in val)
            {
                if(val[key] == rep)
                {
                    assigned_to = key;
                    break;
                }
                else
                {
                    assigned_to = 'UNKNOWN';
                }
            }

            var value = 'assignprospectaccount';
            var payload = 'user_key=' + user_key + '&api_key=' + api_key + '&id=' + id + '&user_id=' + assigned_to + '&format=json';
            var assignResponse = pardotLib.assignAccount(value, api_key, user_key, payload, apiversion);
            var assignRespBody = JSON.parse(assignResponse.body);
        }
        catch (err)
        {
            log.debug('ERROR', err.message);
        }
    }

    return {
        execute: execute
    };

});
