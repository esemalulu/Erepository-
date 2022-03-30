/**
* @NApiVersion 2.x
* @NScriptType ScheduledScript
* @NModuleScope SameAccount
*/
define(['N/record', 'N/format', './AUX_pardot_lib', 'N/search', 'N/runtime', 'N/task'],

    function(record, format, pardotLib, search, runtime, task)
    {
        function execute(scriptContext)
        {
            var createSuccess = 0, createFail = 0;
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
                search.createColumn({ name : 'custrecord_pi_config_cust'}),
                search.createColumn({ name : 'custrecord_pi_config_apiversion'})
            ];

            var configSearch = search.create({
                type : 'customrecord_pi_config',
                filters : sf,
                columns : sc
            });

            var configSearchRS = configSearch.run().getRange({ start : 0, end : 1000});
            if(configSearchRS)
            {
                var user_key     = configSearchRS[0].getValue({ name : 'custrecord_pi_config_key'});
                var adminEmail   = configSearchRS[0].getValue({ name : 'custrecord_pi_config_email'});
                var pass         = pardotLib.decodeAdminPassword(configSearchRS[0].getValue({ name : 'custrecord_pi_config_pass'}));
                var contactSync  = configSearchRS[0].getValue({ name : 'custrecord_pi_config_contact'});
                var custSync     = configSearchRS[0].getValue({ name : 'custrecord_pi_config_cust'});
                var apiversion   = configSearchRS[0].getValue({ name : 'custrecord_pi_config_apiversion'});

                if(user_key && adminEmail && pass && contactSync == true && custSync == true && apiversion)
                {
                    var sf = [
                                ["isinactive","is","F"],
                                "AND",
                                ["custentity_pi_pa_url","isnotempty",""],
                                "AND",
                                ["custentity_pi_pa_url","startswith","https://pi.pardot.com/prospectAccount/read/id/"],
                                "AND",
                                ["contact.custentitypi_url","isnotempty",""],
                                "AND",
                                ["contact.custentitypi_url","startswith","http://pi.pardot.com/prospect/read?id"],
                                "AND",
                                ["contact.custentity_pi_paurl","startswith","http://queued"],
                                "AND",
                                ["contact.custentity_pi_paurl","isnotempty",""],
                                "AND",
                                ["contact.email","isnotempty",""],
                            ];

                    var sc = [
                        search.createColumn({"name":"internalid","label":"Customer Internal ID","type":"select","sortdir":"NONE"}),
                        search.createColumn({"name":"internalid","join":"contact","label":"Contact Internal ID","type":"select","sortdir":"NONE"}),
                        search.createColumn({"name":"entityid","join":"contact","label":"Contact Name","type":"text","sortdir":"NONE"}),
                        search.createColumn({"name":"custentity_pi_pa_url","label":"Pardot Account URL","type":"url","sortdir":"NONE"}),
                        search.createColumn({"name":"custentitypi_url","join":"contact","label":"Pardot Link","type":"url","sortdir":"NONE"}),
                        search.createColumn({"name":"custentity_pi_paurl","join":"contact"}),
                        search.createColumn({"name":"email","join":"contact"}),
                    ];

                    var custSearch = search.create({
                        type : search.Type.CUSTOMER,
                        filters : sf,
                        columns : sc
                    });

                    var custSearchRS = custSearch.run().getRange({ start : 0, end : 1000});
                    if(custSearchRS)
                    {
                        for(var i = 0; i < custSearchRS.length; i+=1)
                        {
                            var custId     = custSearchRS[i].getValue({ name : 'internalid'});
                            var contactID  = custSearchRS[i].getValue({ name : 'internalid', join : 'contact'});
                            var paURL      = custSearchRS[i].getValue({ name : 'custentity_pi_pa_url'});
                            var pURL       = custSearchRS[i].getValue({ name : 'custentitypi_url', join : 'contact'});
                            var email      = custSearchRS[i].getValue({ name : 'email', join : 'contact'});

                            var pa = paURL.split('/id/');
                            var paID = pa[1];

                            var p = pURL.split('id=');
                            var pID = p[1];

                            //payload = api_key, user_key, email, prospect_account_id

                            var value = "login";
                            var loginResponse = pardotLib.login(value, adminEmail, pass, user_key, apiversion);
                            var loginRespBody = JSON.parse(loginResponse.body);
                            var api_key = loginRespBody.api_key;

                            var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + pID + '&prospect_account_id=' + paID + '&format=json';

                            value = "updateprospect";
                            var updateProspect = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                            var updateProsBody = JSON.parse(updateProspect.body);
                            var updatePBody = updateProsBody['@attributes'];

                            if(updatePBody.stat == "fail")
                            {
                                createFail+=1;
                                var errCode = updatePBody.err_code;
                                var errmsg = pardotLib.errorCodeSwitcher(errCode);
                                log.debug('ERROR', errmsg);
                            }
                            else
                            {
                                var contactRec = record.load({
                                    type : record.Type.CONTACT,
                                    id : contactID
                                });

                                contactRec.setText({ fieldId : 'custentity_pi_paurl', text : paURL});
                                contactRec.save();

                                createSuccess+=1;
                            }
                            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                            var percentage = (i * 100) / custSearchRS.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);

                            if(remainingUsage < 1000)
                            {
                                var reschedule = task.create({
                                    taskType : task.TaskType.SCHEDULED_SCRIPT
                                });

                                reschedule.scriptId = runtime.getCurrentScript().id;
                                reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                reschedule.submit();
                                break;
                            }
                        }
                        var queueRecord = record.create({
                            type : 'customrecord_pi_queue',
                            isDynamic : false
                        });

                        var timeStamp = format.format({
                            value: new Date(),
                            type: format.Type.DATETIMETZ
                        });

                        var dt = pardotLib.dateParser(timeStamp);

                        queueRecord.setText({ fieldId : 'custrecord_pi_queue_sync_status', text : 'COMPLETED' });
                        queueRecord.setValue({ fieldId : 'custrecord_pi_queue_date', value : dt});
                        queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                        queueRecord.setText({ fieldId : 'custrecord_pi_queue_sync_log', text : 'QUEUE RECORD CREATED > NUMBER OF PROSPECT ACCOUNT RECORDS UPDATED IN PARDOT : ' + custSearchRS.length + ' NUMBER OF PROSPECT ACCOUNTS SUCCESSFULLY UPDATE: ' + createSuccess + ' NUMBER OF PROSPECT ACCOUNTS NOT SUCCESSFULLY UPDATED : ' + createFail});
                        queueRecord.save();
                    }
                }
            }
        }



    return {
        execute: execute
    };

});
