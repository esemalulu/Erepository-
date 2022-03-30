/**
* @NApiVersion 2.x
* @NScriptType ScheduledScript
* @NModuleScope SameAccount
*/
define(['N/search', './AUX_pardot_lib', 'N/record', 'N/runtime', 'N/task', 'N/format'],

function(search, pardotLib, record, runtime, task, format) {

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
            search.createColumn({ name : 'custrecord_pi_config_status'}),
            search.createColumn({ name : 'custrecord_pi_config_apiversion'})
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
                var email                = configRS[0].getValue({ name : 'custrecord_pi_config_email' });
                var pass                 = pardotLib.decodeAdminPassword(configRS[0].getValue({ name : 'custrecord_pi_config_pass' }));
                var user_key             = configRS[0].getValue({ name : 'custrecord_pi_config_key'});
                var contactSync          = configRS[0].getValue({ name : 'custrecord_pi_config_contact'});
                var isEnabled            = configRS[0].getValue({ name : 'custrecord_pi_config_status'});
                var apiversion           = configRS[0].getValue({ name : 'custrecord_pi_config_apiversion'});

                if(email && pass && user_key && contactSync == true && isEnabled == 1 && apiversion)
                {
                    fetchProspects(email, pass, user_key, apiversion);
                }
            }
        }
    }

    function fetchProspects(email, pass, user_key, apiversion)
    {
        var value = "login";
        var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
        var respBody           = JSON.parse(connectionResponse.body);
        var api_key            = respBody.api_key;
        var newProspects = [];
        var oldProspects = [];

        //GENERATE JAVASCRIPT DATE OBJECT
        var date = new Date();

        //GENERATE DATE FORMAT ACCEPTED BY PARDOT
        var executionDate = date.getFullYear() + '-' + pardotLib.month(date) + '-' + pardotLib.day(date) + ' ' + date.getHours() + ':' + pardotLib.minutes(date) + ':' + pardotLib.seconds(date);

        // GENERATE REQUEST TO PULL UPDATED RECORDS FROM PARDOT.
        var payload = "api_key=" + api_key + "&user_key=" + user_key + "&assigned=true&updated_after=" + encodeURIComponent(executionDate) + "&format=json";

        // SEND THE REQUEST TO RETRIEVE UPDATED RECORDS FROM PARDOT.
        value = "prospects";
        var prospectResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
        var prospectResponseBody = JSON.parse(prospectResponse.body);

        if(prospectResponseBody)
        {
            var prospects = prospectResponseBody.result.prospect;
            if(prospects)
            {
                if(prospects.length != 0)
                {
                    if(prospects.length > 1)
                    {
                        for(var i = 0; i < prospects.length; i+=1)
                        {
                            var dateCreated = prospects[i].created_at;
                            var dateUpdated = prospects[i].updated_at;

                            if(dateCreated === dateUpdated)
                            {
                                newProspects.push(prospects[i]);
                            }
                            else
                            {
                                oldProspects.push(prospects[i]);
                            }
                        }
                    }
                    else
                    {
                        var dateCreated = prospects.created_at;
                        var dateUpdated = prospects.updated_at;

                        if(dateCreated === dateUpdated)
                        {
                            newProspects.push(prospects);
                        }
                        else
                        {
                            oldProspects.push(prospects);
                        }
                    }
                }
            }
        }
        if(newProspects.length != 0)
        {
            syncNewProspects(email, pass, user_key, apiversion, newProspects);
        }

        if(oldProspects.length != 0)
        {
            syncUpdatedProspects(email, pass, user_key, apiversion, oldProspects);
        }
    }

    function syncNewProspects(email, pass, user_key, apiversion, newProspects)
    {
        for(var i = 0; i < newProspects.length; i+=1)
        {

            var companyName = oldProspects[i].company;
            if(companyName)
            {
                var companySearch = search.global({ keywords : 'l:' + companyName});
                if(companySearch.length == 0)
                {
                    // CREATE LEAD AS COMPANY
                    var custRec = record.create({ type : record.Type.LEAD, isDynamic : false });

                    // SAVE LEAD RECORD
                    custRec.setValue({ fieldId : 'isperson', value : 'F'});
                    custRec.setValue({ fieldId : 'companyname', value : companyName });
                    custRec.setText({ fieldId : 'entitystatus', text : 'LEAD-New' });
                    custRec.setText({ fieldId : 'salesrep', text : oldProspects[i].assigned_to.user.first_name + ' ' + oldProspects[i].assigned_to.user.last_name});
                    var custID = custRec.save();

                    var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                    if(remainingUsage < 1000)
                    {
                        var reschedule = task.create({
                            taskType : task.TaskType.SCHEDULED_SCRIPT
                        });

                        reschedule.scriptId = runtime.getCurrentScript().id;
                        reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                        reschedule.submit();

                        var percentage = (i * 100) / oldProspects.length;
                        runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                        break;
                    }

                    var email = oldProspects[i].email;
                    var contactSearch = search.global({ keywords : 'c:' + email });
                    if(contactSearch.length == 0)
                    {
                        var contactRec = record.create({type : record.Type.CONTACT, isDynamic : false});
                        contactRec.setValue({fieldId : 'company', value : custID});

                        // UPDATE MAPPED FIELDS
                        var prospectValues = oldProspects[i];

                        var sf = [
                            ["isinactive","is","F"],
                            "AND",
                            ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                        ];

                        var sc = [
                            search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                            search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                            search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                        ];

                        var pfieldsSearch = search.create({
                            type    : 'customrecord_pi_prospects',
                            filters : sf,
                            columns : sc,
                        });

                        var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                        var values = {};

                        for(var x = 0; x < pfieldsRS.length; x+=1)
                        {
                            var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                            if(prospectValues[value])
                            {
                                values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                            }
                        }

                        for(var key in values)
                        {
                            if(key == 'custentitypi_score')
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : parseInt(values[key])
                                });
                            }
                            else if (key == 'company')
                            {
                                contactRec.setValue({ fieldId : key, value : custID});
                            }
                            else if (key == 'custentitypi_last_activity')
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : pardotLib.dateParser(values[key])
                                });
                            }
                            else if (key == 'custentitypi_created_date')
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : pardotLib.dateParser(values[key])
                                });
                            }
                            else if (key == 'custentitypi_do_not_email')
                            {
                                if(values[key] == 1)
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : true
                                    });
                                }
                                else {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : false
                                    });
                                }
                            }
                            else if(key == 'contactsource')
                            {
                                var val = pardotLib.marketingCampaign();
                                var id;
                                for(var k in val){
                                    if(val[k] === values[key])
                                    {
                                        id = k;
                                    }
                                }
                                contactRec.setValue({
                                    fieldId : key,
                                    value : id
                                });
                            }
                            else
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : values[key]
                                });
                            }
                        }

                        contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                        var prospectId = prospectValues.id;
                        var contactid = contactRec.save();
                        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                        if(remainingUsage < 1000)
                        {
                            var reschedule = task.create({
                                taskType : task.TaskType.SCHEDULED_SCRIPT
                            });

                            reschedule.scriptId = runtime.getCurrentScript().id;
                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                            reschedule.submit();

                            var percentage = (i * 100) / oldProspects.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                            break;
                        }

                        var value = "login";
                        var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                        var respBody = JSON.parse(connectionResponse.body);
                        var api_key = respBody.api_key;

                        value = 'updateprospect';
                        var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                        var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                        var updateResponseBody = JSON.parse(updateResponse.body);
                        if(updateResponse.code == 200)
                        {
                            //QUEUE RECORD HERE WITH ERROR
                            var queueRecord = record.create({
                                type : 'customrecord_pi_queue',
                                isDynamic : true
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotLib.dateParser(timeStamp);

                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                            queueRecord.save();
                        }
                        else
                        {
                            var errCode = updateResponse.err_code;
                            var errmsg = pardotLib.errorCodeSwitcher(errCode);

                            //QUEUE RECORD HERE WITH ERROR
                            var queueRecord = record.create({
                                type : 'customrecord_pi_queue',
                                isDynamic : true
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotLib.dateParser(timeStamp);

                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                            queueRecord.save();
                        }
                    }
                    else
                    {
                        if(contactSearch.length > 1)
                        {
                            for(var x = 0; x < contactSearch.length; x+=1)
                            {
                                var contactRecId = contactSearch[x].id;
                                var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                contactRec.setValue({fieldId : 'company', value : custID});

                                // UPDATE MAPPED FIELDS
                                var prospectValues = oldProspects[i];

                                var sf = [
                                    ["isinactive","is","F"],
                                    "AND",
                                    ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                ];

                                var sc = [
                                    search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                    search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                    search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                ];

                                var pfieldsSearch = search.create({
                                    type    : 'customrecord_pi_prospects',
                                    filters : sf,
                                    columns : sc,
                                });

                                var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                var values = {};

                                for(var x = 0; x < pfieldsRS.length; x+=1)
                                {
                                    var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                    if(prospectValues[value])
                                    {
                                        values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                    }
                                }

                                for(var key in values)
                                {
                                    if(key == 'custentitypi_score')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : parseInt(values[key])
                                        });
                                    }
                                    else if (key == 'company')
                                    {
                                        contactRec.setValue({ fieldId : key, value : custID});
                                    }
                                    else if (key == 'custentitypi_last_activity')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_created_date')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_do_not_email')
                                    {
                                        if(values[key] == 1)
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : true
                                            });
                                        }
                                        else {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : false
                                            });
                                        }
                                    }
                                    else if(key == 'contactsource')
                                    {
                                        var val = pardotLib.marketingCampaign();
                                        var id;
                                        for(var k in val){
                                            if(val[k] === values[key])
                                            {
                                                id = k;
                                            }
                                        }
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : id
                                        });
                                    }
                                    else
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : values[key]
                                        });
                                    }
                                }

                                contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                var prospectId = prospectValues.id;
                                var contactid = contactRec.save();
                                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                if(remainingUsage < 1000)
                                {
                                    var reschedule = task.create({
                                        taskType : task.TaskType.SCHEDULED_SCRIPT
                                    });

                                    reschedule.scriptId = runtime.getCurrentScript().id;
                                    reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                    reschedule.submit();

                                    var percentage = (i * 100) / oldProspects.length;
                                    runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                    break;
                                }


                                var value = "login";
                                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                var respBody = JSON.parse(connectionResponse.body);
                                var api_key = respBody.api_key;

                                value = 'updateprospect';
                                var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                var updateResponseBody = JSON.parse(updateResponse.body);
                                if(updateResponse.code == 200)
                                {
                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                    queueRecord.save();
                                }
                                else
                                {
                                    var errCode = updateResponse.err_code;
                                    var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.save();
                                }
                            }
                        }
                        else
                        {
                            var contactRecId = contactSearch[0].id;
                            var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                            contactRec.setValue({fieldId : 'company', value : custID});

                            // UPDATE MAPPED FIELDS
                            var prospectValues = oldProspects[i];

                            var sf = [
                                ["isinactive","is","F"],
                                "AND",
                                ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                            ];

                            var sc = [
                                search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                            ];

                            var pfieldsSearch = search.create({
                                type    : 'customrecord_pi_prospects',
                                filters : sf,
                                columns : sc,
                            });

                            var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                            var values = {};

                            for(var x = 0; x < pfieldsRS.length; x+=1)
                            {
                                var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                if(prospectValues[value])
                                {
                                    values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                }
                            }

                            for(var key in values)
                            {
                                if(key == 'custentitypi_score')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : parseInt(values[key])
                                    });
                                }
                                else if (key == 'company')
                                {
                                    contactRec.setValue({ fieldId : key, value : custID});
                                }
                                else if (key == 'custentitypi_last_activity')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
                                }
                                else if (key == 'custentitypi_created_date')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
                                }
                                else if (key == 'custentitypi_do_not_email')
                                {
                                    if(values[key] == 1)
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : true
                                        });
                                    }
                                    else {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : false
                                        });
                                    }
                                }
                                else if(key == 'contactsource')
                                {
                                    var val = pardotLib.marketingCampaign();
                                    var id;
                                    for(var k in val){
                                        if(val[k] === values[key])
                                        {
                                            id = k;
                                        }
                                    }
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : id
                                    });
                                }
                                else
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : values[key]
                                    });
                                }
                            }

                            contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                            var prospectId = prospectValues.id;
                            var contactid = contactRec.save();
                            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                            if(remainingUsage < 1000)
                            {
                                var reschedule = task.create({
                                    taskType : task.TaskType.SCHEDULED_SCRIPT
                                });

                                reschedule.scriptId = runtime.getCurrentScript().id;
                                reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                reschedule.submit();

                                var percentage = (i * 100) / oldProspects.length;
                                runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                break;
                            }

                            var value = "login";
                            var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                            var respBody = JSON.parse(connectionResponse.body);
                            var api_key = respBody.api_key;

                            value = 'updateprospect';
                            var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                            var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                            var updateResponseBody = JSON.parse(updateResponse.body);
                            if(updateResponse.code == 200)
                            {
                                //QUEUE RECORD HERE WITH ERROR
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                queueRecord.save();
                            }
                            else
                            {
                                var errCode = updateResponse.err_code;
                                var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                //QUEUE RECORD HERE WITH ERROR
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.save();
                            }
                        }
                    }
                }
                else
                {
                    if(companySearch.length > 1)
                    {
                        for(var y = 0; y < companySearch.length; y+=1)
                        {
                            var custID = companySearch[y].id;
                            var prospectEmail = oldProspects[i].email;

                            var contactSearch = search.global({ keywords : 'c:' + prospectEmail });
                            if(contactSearch.length == 0)
                            {
                                var contactRec = record.create({type : record.Type.CONTACT, isDynamic : false});
                                contactRec.setValue({fieldId : 'company', value : custID});

                                // UPDATE MAPPED FIELDS
                                var prospectValues = oldProspects[i];

                                var sf = [
                                    ["isinactive","is","F"],
                                    "AND",
                                    ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                ];

                                var sc = [
                                    search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                    search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                    search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                ];

                                var pfieldsSearch = search.create({
                                    type    : 'customrecord_pi_prospects',
                                    filters : sf,
                                    columns : sc,
                                });

                                var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                var values = {};

                                for(var x = 0; x < pfieldsRS.length; x+=1)
                                {
                                    var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                    if(prospectValues[value])
                                    {
                                        values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                    }
                                }

                                for(var key in values)
                                {
                                    if(key == 'custentitypi_score')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : parseInt(values[key])
                                        });
                                    }
                                    else if (key == 'company')
                                    {
                                        contactRec.setValue({ fieldId : key, value : custID});
                                    }
                                    else if (key == 'custentitypi_last_activity')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_created_date')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_do_not_email')
                                    {
                                        if(values[key] == 1)
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : true
                                            });
                                        }
                                        else {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : false
                                            });
                                        }
                                    }
                                    else if(key == 'contactsource')
                                    {
                                        var val = pardotLib.marketingCampaign();
                                        var id;
                                        for(var k in val){
                                            if(val[k] === values[key])
                                            {
                                                id = k;
                                            }
                                        }
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : id
                                        });
                                    }
                                    else
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : values[key]
                                        });
                                    }
                                }

                                contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                var prospectId = prospectValues.id;
                                var contactid = contactRec.save();
                                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                if(remainingUsage < 1000)
                                {
                                    var reschedule = task.create({
                                        taskType : task.TaskType.SCHEDULED_SCRIPT
                                    });

                                    reschedule.scriptId = runtime.getCurrentScript().id;
                                    reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                    reschedule.submit();

                                    var percentage = (i * 100) / oldProspects.length;
                                    runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                    break;
                                }

                                var value = "login";
                                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                var respBody = JSON.parse(connectionResponse.body);
                                var api_key = respBody.api_key;

                                value = 'updateprospect';
                                var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                var updateResponseBody = JSON.parse(updateResponse.body);
                                if(updateResponse.code == 200)
                                {
                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                    queueRecord.save();
                                }
                                else
                                {
                                    var errCode = updateResponse.err_code;
                                    var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.save();
                                }
                            }
                            else
                            {
                                if(contactSearch.length > 1)
                                {
                                    for(var x = 0; x < contactSearch.length; x+=1)
                                    {
                                        var contactRecId = contactSearch[x].id;
                                        var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                        contactRec.setValue({fieldId : 'company', value : custID});

                                        // UPDATE MAPPED FIELDS
                                        var prospectValues = oldProspects[i];

                                        var sf = [
                                            ["isinactive","is","F"],
                                            "AND",
                                            ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                        ];

                                        var sc = [
                                            search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                            search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                            search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                        ];

                                        var pfieldsSearch = search.create({
                                            type    : 'customrecord_pi_prospects',
                                            filters : sf,
                                            columns : sc,
                                        });

                                        var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                        var values = {};

                                        for(var x = 0; x < pfieldsRS.length; x+=1)
                                        {
                                            var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                            if(prospectValues[value])
                                            {
                                                values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                            }
                                        }

                                        for(var key in values)
                                        {
                                            if(key == 'custentitypi_score')
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : parseInt(values[key])
                                                });
                                            }
                                            else if (key == 'company')
                                            {
                                                contactRec.setValue({ fieldId : key, value : custID});
                                            }
                                            else if (key == 'custentitypi_last_activity')
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : pardotLib.dateParser(values[key])
                                                });
                                            }
                                            else if (key == 'custentitypi_created_date')
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : pardotLib.dateParser(values[key])
                                                });
                                            }
                                            else if (key == 'custentitypi_do_not_email')
                                            {
                                                if(values[key] == 1)
                                                {
                                                    contactRec.setValue({
                                                        fieldId : key,
                                                        value : true
                                                    });
                                                }
                                                else {
                                                    contactRec.setValue({
                                                        fieldId : key,
                                                        value : false
                                                    });
                                                }
                                            }
                                            else if(key == 'contactsource')
                                            {
                                                var val = pardotLib.marketingCampaign();
                                                var id;
                                                for(var k in val){
                                                    if(val[k] === values[key])
                                                    {
                                                        id = k;
                                                    }
                                                }
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : id
                                                });
                                            }
                                            else
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : values[key]
                                                });
                                            }
                                        }

                                        contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                        var prospectId = prospectValues.id;
                                        var contactid = contactRec.save();
                                        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                        if(remainingUsage < 1000)
                                        {
                                            var reschedule = task.create({
                                                taskType : task.TaskType.SCHEDULED_SCRIPT
                                            });

                                            reschedule.scriptId = runtime.getCurrentScript().id;
                                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                            reschedule.submit();

                                            var percentage = (i * 100) / oldProspects.length;
                                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                            break;
                                        }

                                        var value = "login";
                                        var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                        var respBody = JSON.parse(connectionResponse.body);
                                        var api_key = respBody.api_key;

                                        value = 'updateprospect';
                                        var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                        var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                        var updateResponseBody = JSON.parse(updateResponse.body);
                                        if(updateResponse.code == 200)
                                        {
                                            //QUEUE RECORD HERE WITH ERROR
                                            var queueRecord = record.create({
                                                type : 'customrecord_pi_queue',
                                                isDynamic : true
                                            });

                                            var timeStamp = format.format({
                                                value: new Date(),
                                                type: format.Type.DATETIMETZ
                                            });

                                            var dt = pardotLib.dateParser(timeStamp);

                                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                            queueRecord.save();
                                        }
                                        else
                                        {
                                            var errCode = updateResponse.err_code;
                                            var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                            //QUEUE RECORD HERE WITH ERROR
                                            var queueRecord = record.create({
                                                type : 'customrecord_pi_queue',
                                                isDynamic : true
                                            });

                                            var timeStamp = format.format({
                                                value: new Date(),
                                                type: format.Type.DATETIMETZ
                                            });

                                            var dt = pardotLib.dateParser(timeStamp);

                                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                            queueRecord.save();
                                        }
                                    }
                                }
                                else
                                {
                                    var contactRecId = contactSearch[0].id;
                                    var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                    contactRec.setValue({fieldId : 'company', value : custID});

                                    // UPDATE MAPPED FIELDS
                                    var prospectValues = oldProspects[i];

                                    var sf = [
                                        ["isinactive","is","F"],
                                        "AND",
                                        ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                    ];

                                    var sc = [
                                        search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                        search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                        search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                    ];

                                    var pfieldsSearch = search.create({
                                        type    : 'customrecord_pi_prospects',
                                        filters : sf,
                                        columns : sc,
                                    });

                                    var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                    var values = {};

                                    for(var x = 0; x < pfieldsRS.length; x+=1)
                                    {
                                        var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                        if(prospectValues[value])
                                        {
                                            values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                        }
                                    }

                                    for(var key in values)
                                    {
                                        if(key == 'custentitypi_score')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : parseInt(values[key])
                                            });
                                        }
                                        else if (key == 'company')
                                        {
                                            contactRec.setValue({ fieldId : key, value : custID});
                                        }
                                        else if (key == 'custentitypi_last_activity')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : pardotLib.dateParser(values[key])
                                            });
                                        }
                                        else if (key == 'custentitypi_created_date')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : pardotLib.dateParser(values[key])
                                            });
                                        }
                                        else if (key == 'custentitypi_do_not_email')
                                        {
                                            if(values[key] == 1)
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : true
                                                });
                                            }
                                            else {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : false
                                                });
                                            }
                                        }
                                        else if(key == 'contactsource')
                                        {
                                            var val = pardotLib.marketingCampaign();
                                            var id;
                                            for(var k in val){
                                                if(val[k] === values[key])
                                                {
                                                    id = k;
                                                }
                                            }
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : id
                                            });
                                        }
                                        else
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : values[key]
                                            });
                                        }
                                    }

                                    contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                    var prospectId = prospectValues.id;
                                    var contactid = contactRec.save();
                                    var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                    if(remainingUsage < 1000)
                                    {
                                        var reschedule = task.create({
                                            taskType : task.TaskType.SCHEDULED_SCRIPT
                                        });

                                        reschedule.scriptId = runtime.getCurrentScript().id;
                                        reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                        reschedule.submit();

                                        var percentage = (i * 100) / oldProspects.length;
                                        runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                        break;
                                    }

                                    var value = "login";
                                    var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                    var respBody = JSON.parse(connectionResponse.body);
                                    var api_key = respBody.api_key;

                                    value = 'updateprospect';
                                    var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                    var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                    var updateResponseBody = JSON.parse(updateResponse.body);
                                    if(updateResponse.code == 200)
                                    {
                                        //QUEUE RECORD HERE WITH ERROR
                                        var queueRecord = record.create({
                                            type : 'customrecord_pi_queue',
                                            isDynamic : true
                                        });

                                        var timeStamp = format.format({
                                            value: new Date(),
                                            type: format.Type.DATETIMETZ
                                        });

                                        var dt = pardotLib.dateParser(timeStamp);

                                        var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                        queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                        queueRecord.save();
                                    }
                                    else
                                    {
                                        var errCode = updateResponse.err_code;
                                        var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                        //QUEUE RECORD HERE WITH ERROR
                                        var queueRecord = record.create({
                                            type : 'customrecord_pi_queue',
                                            isDynamic : true
                                        });

                                        var timeStamp = format.format({
                                            value: new Date(),
                                            type: format.Type.DATETIMETZ
                                        });

                                        var dt = pardotLib.dateParser(timeStamp);

                                        var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                        queueRecord.save();
                                    }
                                }
                            }

                        }
                    }
                    else
                    {
                        var custID = companySearch[0].id;
                        var prospectEmail = oldProspects[i].email;

                        var contactSearch = search.global({ keywords : 'c:' +prospectEmail });
                        if(contactSearch.length == 0)
                        {
                            var contactRec = record.create({type : record.Type.CONTACT, isDynamic : false});
                            contactRec.setValue({fieldId : 'company', value : custID});

                            // UPDATE MAPPED FIELDS
                            var prospectValues = oldProspects[i];

                            var sf = [
                                ["isinactive","is","F"],
                                "AND",
                                ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                            ];

                            var sc = [
                                search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                            ];

                            var pfieldsSearch = search.create({
                                type    : 'customrecord_pi_prospects',
                                filters : sf,
                                columns : sc,
                            });

                            var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                            var values = {};

                            for(var x = 0; x < pfieldsRS.length; x+=1)
                            {
                                var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                if(prospectValues[value])
                                {
                                    values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                }
                            }

                            for(var key in values)
                            {
                                if(key == 'custentitypi_score')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : parseInt(values[key])
                                    });
                                }
                                else if (key == 'company')
                                {
                                    contactRec.setValue({ fieldId : key, value : custID});
                                }
                                else if (key == 'custentitypi_last_activity')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
                                }
                                else if (key == 'custentitypi_created_date')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
                                }
                                else if (key == 'custentitypi_do_not_email')
                                {
                                    if(values[key] == 1)
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : true
                                        });
                                    }
                                    else {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : false
                                        });
                                    }
                                }
                                else if(key == 'contactsource')
                                {
                                    var val = pardotLib.marketingCampaign();
                                    var id;
                                    for(var k in val){
                                        if(val[k] === values[key])
                                        {
                                            id = k;
                                        }
                                    }
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : id
                                    });
                                }
                                else
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : values[key]
                                    });
                                }
                            }

                            contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                            var prospectId = prospectValues.id;
                            var contactid = contactRec.save();
                            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                            if(remainingUsage < 1000)
                            {
                                var reschedule = task.create({
                                    taskType : task.TaskType.SCHEDULED_SCRIPT
                                });

                                reschedule.scriptId = runtime.getCurrentScript().id;
                                reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                reschedule.submit();

                                var percentage = (i * 100) / oldProspects.length;
                                runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                break;
                            }

                            var value = "login";
                            var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                            var respBody = JSON.parse(connectionResponse.body);
                            var api_key = respBody.api_key;

                            value = 'updateprospect';
                            var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                            var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                            var updateResponseBody = JSON.parse(updateResponse.body);
                            if(updateResponse.code == 200)
                            {
                                //QUEUE RECORD HERE WITH ERROR
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                queueRecord.save();
                            }
                            else
                            {
                                var errCode = updateResponse.err_code;
                                var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                //QUEUE RECORD HERE WITH ERROR
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.save();
                            }
                        }
                        else
                        {
                            if(contactSearch.length > 1)
                            {
                                for(var b = 0; b < contactSearch.length; b+=1)
                                {
                                    var contactRecId = contactSearch[b].id;
                                    var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                    contactRec.setValue({fieldId : 'company', value : custID});

                                    // UPDATE MAPPED FIELDS
                                    var prospectValues = oldProspects[i];

                                    var sf = [
                                        ["isinactive","is","F"],
                                        "AND",
                                        ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                    ];

                                    var sc = [
                                        search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                        search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                        search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                    ];

                                    var pfieldsSearch = search.create({
                                        type    : 'customrecord_pi_prospects',
                                        filters : sf,
                                        columns : sc,
                                    });

                                    var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                    var values = {};

                                    for(var x = 0; x < pfieldsRS.length; x+=1)
                                    {
                                        var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                        if(prospectValues[value])
                                        {
                                            values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                        }
                                    }

                                    for(var key in values)
                                    {
                                        if(key == 'custentitypi_score')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : parseInt(values[key])
                                            });
                                        }
                                        else if (key == 'company')
                                        {
                                            contactRec.setValue({ fieldId : key, value : custID});
                                        }
                                        else if (key == 'custentitypi_last_activity')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : pardotLib.dateParser(values[key])
                                            });
                                        }
                                        else if (key == 'custentitypi_created_date')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : pardotLib.dateParser(values[key])
                                            });
                                        }
                                        else if (key == 'custentitypi_do_not_email')
                                        {
                                            if(values[key] == 1)
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : true
                                                });
                                            }
                                            else {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : false
                                                });
                                            }
                                        }
                                        else if(key == 'contactsource')
                                        {
                                            var val = pardotLib.marketingCampaign();
                                            var id;
                                            for(var k in val){
                                                if(val[k] === values[key])
                                                {
                                                    id = k;
                                                }
                                            }
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : id
                                            });
                                        }
                                        else
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : values[key]
                                            });
                                        }
                                    }

                                    contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                    var prospectId = prospectValues.id;
                                    var contactid = contactRec.save();
                                    var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                    if(remainingUsage < 1000)
                                    {
                                        var reschedule = task.create({
                                            taskType : task.TaskType.SCHEDULED_SCRIPT
                                        });

                                        reschedule.scriptId = runtime.getCurrentScript().id;
                                        reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                        reschedule.submit();

                                        var percentage = (i * 100) / oldProspects.length;
                                        runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                        break;
                                    }

                                    var value = "login";
                                    var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                    var respBody = JSON.parse(connectionResponse.body);
                                    var api_key = respBody.api_key;

                                    value = 'updateprospect';
                                    var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                    var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                    var updateResponseBody = JSON.parse(updateResponse.body);
                                    if(updateResponse.code == 200)
                                    {
                                        //QUEUE RECORD HERE WITH ERROR
                                        var queueRecord = record.create({
                                            type : 'customrecord_pi_queue',
                                            isDynamic : true
                                        });

                                        var timeStamp = format.format({
                                            value: new Date(),
                                            type: format.Type.DATETIMETZ
                                        });

                                        var dt = pardotLib.dateParser(timeStamp);

                                        var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                        queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                        queueRecord.save();
                                    }
                                    else
                                    {
                                        var errCode = updateResponse.err_code;
                                        var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                        //QUEUE RECORD HERE WITH ERROR
                                        var queueRecord = record.create({
                                            type : 'customrecord_pi_queue',
                                            isDynamic : true
                                        });

                                        var timeStamp = format.format({
                                            value: new Date(),
                                            type: format.Type.DATETIMETZ
                                        });

                                        var dt = pardotLib.dateParser(timeStamp);

                                        var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                        queueRecord.save();
                                    }
                                }
                            }
                            else
                            {
                                var contactRecId = contactSearch[0].id;
                                var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                contactRec.setValue({fieldId : 'company', value : custID});

                                // UPDATE MAPPED FIELDS
                                var prospectValues = oldProspects[i];

                                var sf = [
                                    ["isinactive","is","F"],
                                    "AND",
                                    ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                ];

                                var sc = [
                                    search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                    search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                    search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                ];

                                var pfieldsSearch = search.create({
                                    type    : 'customrecord_pi_prospects',
                                    filters : sf,
                                    columns : sc,
                                });

                                var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                var values = {};

                                for(var x = 0; x < pfieldsRS.length; x+=1)
                                {
                                    var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                    if(prospectValues[value])
                                    {
                                        values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                    }
                                }

                                for(var key in values)
                                {
                                    if(key == 'custentitypi_score')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : parseInt(values[key])
                                        });
                                    }
                                    else if (key == 'company')
                                    {
                                        contactRec.setValue({ fieldId : key, value : custID});
                                    }
                                    else if (key == 'custentitypi_last_activity')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_created_date')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_do_not_email')
                                    {
                                        if(values[key] == 1)
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : true
                                            });
                                        }
                                        else {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : false
                                            });
                                        }
                                    }
                                    else if(key == 'contactsource')
                                    {
                                        var val = pardotLib.marketingCampaign();
                                        var id;
                                        for(var k in val){
                                            if(val[k] === values[key])
                                            {
                                                id = k;
                                            }
                                        }
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : id
                                        });
                                    }
                                    else
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : values[key]
                                        });
                                    }
                                }

                                contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                var prospectId = prospectValues.id;
                                var contactid = contactRec.save();
                                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                if(remainingUsage < 1000)
                                {
                                    var reschedule = task.create({
                                        taskType : task.TaskType.SCHEDULED_SCRIPT
                                    });

                                    reschedule.scriptId = runtime.getCurrentScript().id;
                                    reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                    reschedule.submit();

                                    var percentage = (i * 100) / oldProspects.length;
                                    runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                    break;
                                }

                                var value = "login";
                                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                var respBody = JSON.parse(connectionResponse.body);
                                var api_key = respBody.api_key;

                                value = 'updateprospect';
                                var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                var updateResponseBody = JSON.parse(updateResponse.body);
                                if(updateResponse.code == 200)
                                {
                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                    queueRecord.save();
                                }
                                else
                                {
                                    var errCode = updateResponse.err_code;
                                    var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.save();
                                }
                            }
                        }
                    }
                }
            }
            else
            {
                //QUEUE RECORD HERE WITH ERROR
                var queueRecord = record.create({
                    type : 'customrecord_pi_queue',
                    isDynamic : true
                });

                var timeStamp = format.format({
                    value: new Date(),
                    type: format.Type.DATETIMETZ
                });

                var dt = pardotLib.dateParser(timeStamp);

                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > PROSPECT IN PARDOT DOES NOT BELONG TO ANY COMPANY. POSSIBLE GARBAGE PROSPECT RECORD. ACTION REQUIRED.';

                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                queueRecord.save();
            }
        }
    }

    function syncUpdatedProspects(email, pass, user_key, apiversion, oldProspects)
    {
        for(var i = 0; i < oldProspects.length; i+=1)
        {
            var companyName = oldProspects[i].company;
            if(companyName)
            {
                var companySearch = search.global({ keywords : 'l:' + companyName});
                if(companySearch.length == 0)
                {
                    // CREATE LEAD AS COMPANY
                    var custRec = record.create({ type : record.Type.LEAD, isDynamic : false });

                    // SAVE LEAD RECORD
                    custRec.setValue({ fieldId : 'isperson', value : 'F'});
                    custRec.setValue({ fieldId : 'companyname', value : companyName });
                    custRec.setText({ fieldId : 'entitystatus', text : 'LEAD-New' });
                    custRec.setText({ fieldId : 'salesrep', text : oldProspects[i].assigned_to.user.first_name + ' ' + oldProspects[i].assigned_to.user.last_name});
                    var custID = custRec.save();

                    var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                    if(remainingUsage < 1000)
                    {
                        var reschedule = task.create({
                            taskType : task.TaskType.SCHEDULED_SCRIPT
                        });

                        reschedule.scriptId = runtime.getCurrentScript().id;
                        reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                        reschedule.submit();

                        var percentage = (i * 100) / oldProspects.length;
                        runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                        break;
                    }

                    var email = oldProspects[i].email;
                    var contactSearch = search.global({ keywords : 'c:' + email });
                    if(contactSearch.length == 0)
                    {
                        var contactRec = record.create({type : record.Type.CONTACT, isDynamic : false});
                        contactRec.setValue({fieldId : 'company', value : custID});

                        // UPDATE MAPPED FIELDS
                        var prospectValues = oldProspects[i];

                        var sf = [
                            ["isinactive","is","F"],
                            "AND",
                            ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                        ];

                        var sc = [
                            search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                            search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                            search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                        ];

                        var pfieldsSearch = search.create({
                            type    : 'customrecord_pi_prospects',
                            filters : sf,
                            columns : sc,
                        });

                        var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                        var values = {};

                        for(var x = 0; x < pfieldsRS.length; x+=1)
                        {
                            var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                            if(prospectValues[value])
                            {
                                values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                            }
                        }

                        for(var key in values)
                        {
                            if(key == 'custentitypi_score')
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : parseInt(values[key])
                                });
                            }
                            else if (key == 'company')
                            {
                                contactRec.setValue({ fieldId : key, value : custID});
                            }
                            else if (key == 'custentitypi_last_activity')
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : pardotLib.dateParser(values[key])
                                });
                            }
                            else if (key == 'custentitypi_created_date')
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : pardotLib.dateParser(values[key])
                                });
                            }
                            else if (key == 'custentitypi_do_not_email')
                            {
                                if(values[key] == 1)
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : true
                                    });
                                }
                                else {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : false
                                    });
                                }
                            }
                            else if(key == 'contactsource')
                            {
                                var val = pardotLib.marketingCampaign();
                                var id;
                                for(var k in val){
                                    if(val[k] === values[key])
                                    {
                                        id = k;
                                    }
                                }
                                contactRec.setValue({
                                    fieldId : key,
                                    value : id
                                });
                            }
                            else
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : values[key]
                                });
                            }
                        }

                        contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                        var prospectId = prospectValues.id;
                        var contactid = contactRec.save();
                        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                        if(remainingUsage < 1000)
                        {
                            var reschedule = task.create({
                                taskType : task.TaskType.SCHEDULED_SCRIPT
                            });

                            reschedule.scriptId = runtime.getCurrentScript().id;
                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                            reschedule.submit();

                            var percentage = (i * 100) / oldProspects.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                            break;
                        }

                        var value = "login";
                        var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                        var respBody = JSON.parse(connectionResponse.body);
                        var api_key = respBody.api_key;

                        value = 'updateprospect';
                        var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                        var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                        var updateResponseBody = JSON.parse(updateResponse.body);
                        if(updateResponse.code == 200)
                        {
                            //QUEUE RECORD HERE WITH ERROR
                            var queueRecord = record.create({
                                type : 'customrecord_pi_queue',
                                isDynamic : true
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotLib.dateParser(timeStamp);

                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                            queueRecord.save();
                        }
                        else
                        {
                            var errCode = updateResponse.err_code;
                            var errmsg = pardotLib.errorCodeSwitcher(errCode);

                            //QUEUE RECORD HERE WITH ERROR
                            var queueRecord = record.create({
                                type : 'customrecord_pi_queue',
                                isDynamic : true
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotLib.dateParser(timeStamp);

                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                            queueRecord.save();
                        }
                    }
                    else
                    {
                        if(contactSearch.length > 1)
                        {
                            for(var x = 0; x < contactSearch.length; x+=1)
                            {
                                var contactRecId = contactSearch[x].id;
                                var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                contactRec.setValue({fieldId : 'company', value : custID});

                                // UPDATE MAPPED FIELDS
                                var prospectValues = oldProspects[i];

                                var sf = [
                                    ["isinactive","is","F"],
                                    "AND",
                                    ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                ];

                                var sc = [
                                    search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                    search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                    search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                ];

                                var pfieldsSearch = search.create({
                                    type    : 'customrecord_pi_prospects',
                                    filters : sf,
                                    columns : sc,
                                });

                                var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                var values = {};

                                for(var x = 0; x < pfieldsRS.length; x+=1)
                                {
                                    var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                    if(prospectValues[value])
                                    {
                                        values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                    }
                                }

                                for(var key in values)
                                {
                                    if(key == 'custentitypi_score')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : parseInt(values[key])
                                        });
                                    }
                                    else if (key == 'company')
                                    {
                                        contactRec.setValue({ fieldId : key, value : custID});
                                    }
                                    else if (key == 'custentitypi_last_activity')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_created_date')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_do_not_email')
                                    {
                                        if(values[key] == 1)
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : true
                                            });
                                        }
                                        else {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : false
                                            });
                                        }
                                    }
                                    else if(key == 'contactsource')
                                    {
                                        var val = pardotLib.marketingCampaign();
                                        var id;
                                        for(var k in val){
                                            if(val[k] === values[key])
                                            {
                                                id = k;
                                            }
                                        }
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : id
                                        });
                                    }
                                    else
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : values[key]
                                        });
                                    }
                                }

                                contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                var prospectId = prospectValues.id;
                                var contactid = contactRec.save();
                                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                if(remainingUsage < 1000)
                                {
                                    var reschedule = task.create({
                                        taskType : task.TaskType.SCHEDULED_SCRIPT
                                    });

                                    reschedule.scriptId = runtime.getCurrentScript().id;
                                    reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                    reschedule.submit();

                                    var percentage = (i * 100) / oldProspects.length;
                                    runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                    break;
                                }


                                var value = "login";
                                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                var respBody = JSON.parse(connectionResponse.body);
                                var api_key = respBody.api_key;

                                value = 'updateprospect';
                                var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                var updateResponseBody = JSON.parse(updateResponse.body);
                                if(updateResponse.code == 200)
                                {
                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                    queueRecord.save();
                                }
                                else
                                {
                                    var errCode = updateResponse.err_code;
                                    var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.save();
                                }
                            }
                        }
                        else
                        {
                            var contactRecId = contactSearch[0].id;
                            var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                            contactRec.setValue({fieldId : 'company', value : custID});

                            // UPDATE MAPPED FIELDS
                            var prospectValues = oldProspects[i];

                            var sf = [
                                ["isinactive","is","F"],
                                "AND",
                                ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                            ];

                            var sc = [
                                search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                            ];

                            var pfieldsSearch = search.create({
                                type    : 'customrecord_pi_prospects',
                                filters : sf,
                                columns : sc,
                            });

                            var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                            var values = {};

                            for(var x = 0; x < pfieldsRS.length; x+=1)
                            {
                                var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                if(prospectValues[value])
                                {
                                    values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                }
                            }

                            for(var key in values)
                            {
                                if(key == 'custentitypi_score')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : parseInt(values[key])
                                    });
                                }
                                else if (key == 'company')
                                {
                                    contactRec.setValue({ fieldId : key, value : custID});
                                }
                                else if (key == 'custentitypi_last_activity')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
                                }
                                else if (key == 'custentitypi_created_date')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
                                }
                                else if (key == 'custentitypi_do_not_email')
                                {
                                    if(values[key] == 1)
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : true
                                        });
                                    }
                                    else {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : false
                                        });
                                    }
                                }
                                else if(key == 'contactsource')
                                {
                                    var val = pardotLib.marketingCampaign();
                                    var id;
                                    for(var k in val){
                                        if(val[k] === values[key])
                                        {
                                            id = k;
                                        }
                                    }
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : id
                                    });
                                }
                                else
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : values[key]
                                    });
                                }
                            }

                            contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                            var prospectId = prospectValues.id;
                            var contactid = contactRec.save();
                            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                            if(remainingUsage < 1000)
                            {
                                var reschedule = task.create({
                                    taskType : task.TaskType.SCHEDULED_SCRIPT
                                });

                                reschedule.scriptId = runtime.getCurrentScript().id;
                                reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                reschedule.submit();

                                var percentage = (i * 100) / oldProspects.length;
                                runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                break;
                            }

                            var value = "login";
                            var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                            var respBody = JSON.parse(connectionResponse.body);
                            var api_key = respBody.api_key;

                            value = 'updateprospect';
                            var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                            var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                            var updateResponseBody = JSON.parse(updateResponse.body);
                            if(updateResponse.code == 200)
                            {
                                //QUEUE RECORD HERE WITH ERROR
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                queueRecord.save();
                            }
                            else
                            {
                                var errCode = updateResponse.err_code;
                                var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                //QUEUE RECORD HERE WITH ERROR
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.save();
                            }
                        }
                    }
                }
                else
                {
                    if(companySearch.length > 1)
                    {
                        for(var y = 0; y < companySearch.length; y+=1)
                        {
                            var custID = companySearch[y].id;
                            var prospectEmail = oldProspects[i].email;

                            var contactSearch = search.global({ keywords : 'c:' + prospectEmail });
                            if(contactSearch.length == 0)
                            {
                                var contactRec = record.create({type : record.Type.CONTACT, isDynamic : false});
                                contactRec.setValue({fieldId : 'company', value : custID});

                                // UPDATE MAPPED FIELDS
                                var prospectValues = oldProspects[i];

                                var sf = [
                                    ["isinactive","is","F"],
                                    "AND",
                                    ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                ];

                                var sc = [
                                    search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                    search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                    search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                ];

                                var pfieldsSearch = search.create({
                                    type    : 'customrecord_pi_prospects',
                                    filters : sf,
                                    columns : sc,
                                });

                                var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                var values = {};

                                for(var x = 0; x < pfieldsRS.length; x+=1)
                                {
                                    var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                    if(prospectValues[value])
                                    {
                                        values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                    }
                                }

                                for(var key in values)
                                {
                                    if(key == 'custentitypi_score')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : parseInt(values[key])
                                        });
                                    }
                                    else if (key == 'company')
                                    {
                                        contactRec.setValue({ fieldId : key, value : custID});
                                    }
                                    else if (key == 'custentitypi_last_activity')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_created_date')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_do_not_email')
                                    {
                                        if(values[key] == 1)
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : true
                                            });
                                        }
                                        else {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : false
                                            });
                                        }
                                    }
                                    else if(key == 'contactsource')
                                    {
                                        var val = pardotLib.marketingCampaign();
                                        var id;
                                        for(var k in val){
                                            if(val[k] === values[key])
                                            {
                                                id = k;
                                            }
                                        }
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : id
                                        });
                                    }
                                    else
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : values[key]
                                        });
                                    }
                                }

                                contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                var prospectId = prospectValues.id;
                                var contactid = contactRec.save();
                                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                if(remainingUsage < 1000)
                                {
                                    var reschedule = task.create({
                                        taskType : task.TaskType.SCHEDULED_SCRIPT
                                    });

                                    reschedule.scriptId = runtime.getCurrentScript().id;
                                    reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                    reschedule.submit();

                                    var percentage = (i * 100) / oldProspects.length;
                                    runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                    break;
                                }

                                var value = "login";
                                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                var respBody = JSON.parse(connectionResponse.body);
                                var api_key = respBody.api_key;

                                value = 'updateprospect';
                                var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                var updateResponseBody = JSON.parse(updateResponse.body);
                                if(updateResponse.code == 200)
                                {
                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                    queueRecord.save();
                                }
                                else
                                {
                                    var errCode = updateResponse.err_code;
                                    var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.save();
                                }
                            }
                            else
                            {
                                if(contactSearch.length > 1)
                                {
                                    for(var x = 0; x < contactSearch.length; x+=1)
                                    {
                                        var contactRecId = contactSearch[x].id;
                                        var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                        contactRec.setValue({fieldId : 'company', value : custID});

                                        // UPDATE MAPPED FIELDS
                                        var prospectValues = oldProspects[i];

                                        var sf = [
                                            ["isinactive","is","F"],
                                            "AND",
                                            ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                        ];

                                        var sc = [
                                            search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                            search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                            search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                        ];

                                        var pfieldsSearch = search.create({
                                            type    : 'customrecord_pi_prospects',
                                            filters : sf,
                                            columns : sc,
                                        });

                                        var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                        var values = {};

                                        for(var x = 0; x < pfieldsRS.length; x+=1)
                                        {
                                            var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                            if(prospectValues[value])
                                            {
                                                values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                            }
                                        }

                                        for(var key in values)
                                        {
                                            if(key == 'custentitypi_score')
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : parseInt(values[key])
                                                });
                                            }
                                            else if (key == 'company')
                                            {
                                                contactRec.setValue({ fieldId : key, value : custID});
                                            }
                                            else if (key == 'custentitypi_last_activity')
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : pardotLib.dateParser(values[key])
                                                });
                                            }
                                            else if (key == 'custentitypi_created_date')
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : pardotLib.dateParser(values[key])
                                                });
                                            }
                                            else if (key == 'custentitypi_do_not_email')
                                            {
                                                if(values[key] == 1)
                                                {
                                                    contactRec.setValue({
                                                        fieldId : key,
                                                        value : true
                                                    });
                                                }
                                                else {
                                                    contactRec.setValue({
                                                        fieldId : key,
                                                        value : false
                                                    });
                                                }
                                            }
                                            else if(key == 'contactsource')
                                            {
                                                var val = pardotLib.marketingCampaign();
                                                var id;
                                                for(var k in val){
                                                    if(val[k] === values[key])
                                                    {
                                                        id = k;
                                                    }
                                                }
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : id
                                                });
                                            }
                                            else
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : values[key]
                                                });
                                            }
                                        }

                                        contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                        var prospectId = prospectValues.id;
                                        var contactid = contactRec.save();
                                        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                        if(remainingUsage < 1000)
                                        {
                                            var reschedule = task.create({
                                                taskType : task.TaskType.SCHEDULED_SCRIPT
                                            });

                                            reschedule.scriptId = runtime.getCurrentScript().id;
                                            reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                            reschedule.submit();

                                            var percentage = (i * 100) / oldProspects.length;
                                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                            break;
                                        }

                                        var value = "login";
                                        var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                        var respBody = JSON.parse(connectionResponse.body);
                                        var api_key = respBody.api_key;

                                        value = 'updateprospect';
                                        var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                        var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                        var updateResponseBody = JSON.parse(updateResponse.body);
                                        if(updateResponse.code == 200)
                                        {
                                            //QUEUE RECORD HERE WITH ERROR
                                            var queueRecord = record.create({
                                                type : 'customrecord_pi_queue',
                                                isDynamic : true
                                            });

                                            var timeStamp = format.format({
                                                value: new Date(),
                                                type: format.Type.DATETIMETZ
                                            });

                                            var dt = pardotLib.dateParser(timeStamp);

                                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                            queueRecord.save();
                                        }
                                        else
                                        {
                                            var errCode = updateResponse.err_code;
                                            var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                            //QUEUE RECORD HERE WITH ERROR
                                            var queueRecord = record.create({
                                                type : 'customrecord_pi_queue',
                                                isDynamic : true
                                            });

                                            var timeStamp = format.format({
                                                value: new Date(),
                                                type: format.Type.DATETIMETZ
                                            });

                                            var dt = pardotLib.dateParser(timeStamp);

                                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                            queueRecord.save();
                                        }
                                    }
                                }
                                else
                                {
                                    var contactRecId = contactSearch[0].id;
                                    var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                    contactRec.setValue({fieldId : 'company', value : custID});

                                    // UPDATE MAPPED FIELDS
                                    var prospectValues = oldProspects[i];

                                    var sf = [
                                        ["isinactive","is","F"],
                                        "AND",
                                        ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                    ];

                                    var sc = [
                                        search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                        search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                        search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                    ];

                                    var pfieldsSearch = search.create({
                                        type    : 'customrecord_pi_prospects',
                                        filters : sf,
                                        columns : sc,
                                    });

                                    var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                    var values = {};

                                    for(var x = 0; x < pfieldsRS.length; x+=1)
                                    {
                                        var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                        if(prospectValues[value])
                                        {
                                            values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                        }
                                    }

                                    for(var key in values)
                                    {
                                        if(key == 'custentitypi_score')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : parseInt(values[key])
                                            });
                                        }
                                        else if (key == 'company')
                                        {
                                            contactRec.setValue({ fieldId : key, value : custID});
                                        }
                                        else if (key == 'custentitypi_last_activity')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : pardotLib.dateParser(values[key])
                                            });
                                        }
                                        else if (key == 'custentitypi_created_date')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : pardotLib.dateParser(values[key])
                                            });
                                        }
                                        else if (key == 'custentitypi_do_not_email')
                                        {
                                            if(values[key] == 1)
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : true
                                                });
                                            }
                                            else {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : false
                                                });
                                            }
                                        }
                                        else if(key == 'contactsource')
                                        {
                                            var val = pardotLib.marketingCampaign();
                                            var id;
                                            for(var k in val){
                                                if(val[k] === values[key])
                                                {
                                                    id = k;
                                                }
                                            }
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : id
                                            });
                                        }
                                        else
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : values[key]
                                            });
                                        }
                                    }

                                    contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                    var prospectId = prospectValues.id;
                                    var contactid = contactRec.save();
                                    var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                    if(remainingUsage < 1000)
                                    {
                                        var reschedule = task.create({
                                            taskType : task.TaskType.SCHEDULED_SCRIPT
                                        });

                                        reschedule.scriptId = runtime.getCurrentScript().id;
                                        reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                        reschedule.submit();

                                        var percentage = (i * 100) / oldProspects.length;
                                        runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                        break;
                                    }

                                    var value = "login";
                                    var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                    var respBody = JSON.parse(connectionResponse.body);
                                    var api_key = respBody.api_key;

                                    value = 'updateprospect';
                                    var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                    var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                    var updateResponseBody = JSON.parse(updateResponse.body);
                                    if(updateResponse.code == 200)
                                    {
                                        //QUEUE RECORD HERE WITH ERROR
                                        var queueRecord = record.create({
                                            type : 'customrecord_pi_queue',
                                            isDynamic : true
                                        });

                                        var timeStamp = format.format({
                                            value: new Date(),
                                            type: format.Type.DATETIMETZ
                                        });

                                        var dt = pardotLib.dateParser(timeStamp);

                                        var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                        queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                        queueRecord.save();
                                    }
                                    else
                                    {
                                        var errCode = updateResponse.err_code;
                                        var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                        //QUEUE RECORD HERE WITH ERROR
                                        var queueRecord = record.create({
                                            type : 'customrecord_pi_queue',
                                            isDynamic : true
                                        });

                                        var timeStamp = format.format({
                                            value: new Date(),
                                            type: format.Type.DATETIMETZ
                                        });

                                        var dt = pardotLib.dateParser(timeStamp);

                                        var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                        queueRecord.save();
                                    }
                                }
                            }

                        }
                    }
                    else
                    {
                        var custID = companySearch[0].id;
                        var prospectEmail = oldProspects[i].email;

                        var contactSearch = search.global({ keywords : 'c:' + prospectEmail });
                        if(contactSearch.length == 0)
                        {
                            var contactRec = record.create({type : record.Type.CONTACT, isDynamic : false});
                            contactRec.setValue({fieldId : 'company', value : custID});

                            // UPDATE MAPPED FIELDS
                            var prospectValues = oldProspects[i];

                            var sf = [
                                ["isinactive","is","F"],
                                "AND",
                                ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                            ];

                            var sc = [
                                search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                            ];

                            var pfieldsSearch = search.create({
                                type    : 'customrecord_pi_prospects',
                                filters : sf,
                                columns : sc,
                            });

                            var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                            var values = {};

                            for(var x = 0; x < pfieldsRS.length; x+=1)
                            {
                                var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                if(prospectValues[value])
                                {
                                    values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                }
                            }

                            for(var key in values)
                            {
                                if(key == 'custentitypi_score')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : parseInt(values[key])
                                    });
                                }
                                else if (key == 'company')
                                {
                                    contactRec.setValue({ fieldId : key, value : custID});
                                }
                                else if (key == 'custentitypi_last_activity')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
                                }
                                else if (key == 'custentitypi_created_date')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
                                }
                                else if (key == 'custentitypi_do_not_email')
                                {
                                    if(values[key] == 1)
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : true
                                        });
                                    }
                                    else {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : false
                                        });
                                    }
                                }
                                else if(key == 'contactsource')
                                {
                                    var val = pardotLib.marketingCampaign();
                                    var id;
                                    for(var k in val){
                                        if(val[k] === values[key])
                                        {
                                            id = k;
                                        }
                                    }
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : id
                                    });
                                }
                                else
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : values[key]
                                    });
                                }
                            }

                            contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                            var prospectId = prospectValues.id;
                            var contactid = contactRec.save();
                            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                            if(remainingUsage < 1000)
                            {
                                var reschedule = task.create({
                                    taskType : task.TaskType.SCHEDULED_SCRIPT
                                });

                                reschedule.scriptId = runtime.getCurrentScript().id;
                                reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                reschedule.submit();

                                var percentage = (i * 100) / oldProspects.length;
                                runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                break;
                            }

                            var value = "login";
                            var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                            var respBody = JSON.parse(connectionResponse.body);
                            var api_key = respBody.api_key;

                            value = 'updateprospect';
                            var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                            var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                            var updateResponseBody = JSON.parse(updateResponse.body);
                            if(updateResponse.code == 200)
                            {
                                //QUEUE RECORD HERE WITH ERROR
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                queueRecord.save();
                            }
                            else
                            {
                                var errCode = updateResponse.err_code;
                                var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                //QUEUE RECORD HERE WITH ERROR
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotLib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.save();
                            }
                        }
                        else
                        {
                            if(contactSearch.length > 1)
                            {
                                for(var b = 0; b < contactSearch.length; b+=1)
                                {
                                    var contactRecId = contactSearch[b].id;
                                    var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                    contactRec.setValue({fieldId : 'company', value : custID});

                                    // UPDATE MAPPED FIELDS
                                    var prospectValues = oldProspects[i];

                                    var sf = [
                                        ["isinactive","is","F"],
                                        "AND",
                                        ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                    ];

                                    var sc = [
                                        search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                        search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                        search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                    ];

                                    var pfieldsSearch = search.create({
                                        type    : 'customrecord_pi_prospects',
                                        filters : sf,
                                        columns : sc,
                                    });

                                    var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                    var values = {};

                                    for(var x = 0; x < pfieldsRS.length; x+=1)
                                    {
                                        var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                        if(prospectValues[value])
                                        {
                                            values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                        }
                                    }

                                    for(var key in values)
                                    {
                                        if(key == 'custentitypi_score')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : parseInt(values[key])
                                            });
                                        }
                                        else if (key == 'company')
                                        {
                                            contactRec.setValue({ fieldId : key, value : custID});
                                        }
                                        else if (key == 'custentitypi_last_activity')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : pardotLib.dateParser(values[key])
                                            });
                                        }
                                        else if (key == 'custentitypi_created_date')
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : pardotLib.dateParser(values[key])
                                            });
                                        }
                                        else if (key == 'custentitypi_do_not_email')
                                        {
                                            if(values[key] == 1)
                                            {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : true
                                                });
                                            }
                                            else {
                                                contactRec.setValue({
                                                    fieldId : key,
                                                    value : false
                                                });
                                            }
                                        }
                                        else if(key == 'contactsource')
                                        {
                                            var val = pardotLib.marketingCampaign();
                                            var id;
                                            for(var k in val){
                                                if(val[k] === values[key])
                                                {
                                                    id = k;
                                                }
                                            }
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : id
                                            });
                                        }
                                        else
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : values[key]
                                            });
                                        }
                                    }

                                    contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                    var prospectId = prospectValues.id;
                                    var contactid = contactRec.save();
                                    var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                    if(remainingUsage < 1000)
                                    {
                                        var reschedule = task.create({
                                            taskType : task.TaskType.SCHEDULED_SCRIPT
                                        });

                                        reschedule.scriptId = runtime.getCurrentScript().id;
                                        reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                        reschedule.submit();

                                        var percentage = (i * 100) / oldProspects.length;
                                        runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                        break;
                                    }

                                    var value = "login";
                                    var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                    var respBody = JSON.parse(connectionResponse.body);
                                    var api_key = respBody.api_key;

                                    value = 'updateprospect';
                                    var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                    var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                    var updateResponseBody = JSON.parse(updateResponse.body);
                                    if(updateResponse.code == 200)
                                    {
                                        //QUEUE RECORD HERE WITH ERROR
                                        var queueRecord = record.create({
                                            type : 'customrecord_pi_queue',
                                            isDynamic : true
                                        });

                                        var timeStamp = format.format({
                                            value: new Date(),
                                            type: format.Type.DATETIMETZ
                                        });

                                        var dt = pardotLib.dateParser(timeStamp);

                                        var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                        queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                        queueRecord.save();
                                    }
                                    else
                                    {
                                        var errCode = updateResponse.err_code;
                                        var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                        //QUEUE RECORD HERE WITH ERROR
                                        var queueRecord = record.create({
                                            type : 'customrecord_pi_queue',
                                            isDynamic : true
                                        });

                                        var timeStamp = format.format({
                                            value: new Date(),
                                            type: format.Type.DATETIMETZ
                                        });

                                        var dt = pardotLib.dateParser(timeStamp);

                                        var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                        queueRecord.save();
                                    }
                                }
                            }
                            else
                            {
                                var contactRecId = contactSearch[0].id;
                                var contactRec = record.load({type : record.Type.CONTACT, id : contactRecId});
                                contactRec.setValue({fieldId : 'company', value : custID});

                                // UPDATE MAPPED FIELDS
                                var prospectValues = oldProspects[i];

                                var sf = [
                                    ["isinactive","is","F"],
                                    "AND",
                                    ["custrecord_pi_nsfieldid_p", "isnotempty", ""]
                                ];

                                var sc = [
                                    search.createColumn({ name : 'custrecord_pi_fieldid_p'       }),
                                    search.createColumn({ name : 'custrecord_pi_custom_p'        }),
                                    search.createColumn({ name : 'custrecord_pi_nsfieldid_p'     })
                                ];

                                var pfieldsSearch = search.create({
                                    type    : 'customrecord_pi_prospects',
                                    filters : sf,
                                    columns : sc,
                                });

                                var pfieldsRS = pfieldsSearch.run().getRange({ start : 0, end : 1000 });

                                var values = {};

                                for(var x = 0; x < pfieldsRS.length; x+=1)
                                {
                                    var value = pfieldsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'});
                                    if(prospectValues[value])
                                    {
                                        values[pfieldsRS[x].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                    }
                                }

                                for(var key in values)
                                {
                                    if(key == 'custentitypi_score')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : parseInt(values[key])
                                        });
                                    }
                                    else if (key == 'company')
                                    {
                                        contactRec.setValue({ fieldId : key, value : custID});
                                    }
                                    else if (key == 'custentitypi_last_activity')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_created_date')
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : pardotLib.dateParser(values[key])
                                        });
                                    }
                                    else if (key == 'custentitypi_do_not_email')
                                    {
                                        if(values[key] == 1)
                                        {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : true
                                            });
                                        }
                                        else {
                                            contactRec.setValue({
                                                fieldId : key,
                                                value : false
                                            });
                                        }
                                    }
                                    else if(key == 'contactsource')
                                    {
                                        var val = pardotLib.marketingCampaign();
                                        var id;
                                        for(var k in val){
                                            if(val[k] === values[key])
                                            {
                                                id = k;
                                            }
                                        }
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : id
                                        });
                                    }
                                    else
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : values[key]
                                        });
                                    }
                                }

                                contactRec.setValue({ fieldId : 'custentitypi_url', value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id });
                                var prospectId = prospectValues.id;
                                var contactid = contactRec.save();
                                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                if(remainingUsage < 1000)
                                {
                                    var reschedule = task.create({
                                        taskType : task.TaskType.SCHEDULED_SCRIPT
                                    });

                                    reschedule.scriptId = runtime.getCurrentScript().id;
                                    reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                    reschedule.submit();

                                    var percentage = (i * 100) / oldProspects.length;
                                    runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                    break;
                                }

                                var value = "login";
                                var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
                                var respBody = JSON.parse(connectionResponse.body);
                                var api_key = respBody.api_key;

                                value = 'updateprospect';
                                var payload = 'api_key=' + api_key + '&user_key=' + user_key + '&id=' + prospectId + '&crm_lead_fid=' + custID + '&crm_contact_fid=' + contactid + '&format=json';
                                var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                var updateResponseBody = JSON.parse(updateResponse.body);
                                if(updateResponse.code == 200)
                                {
                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY CREATED IN NETSUITE.';

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.setValue({ fieldId : 'custrecord_pi_queue_completed', value : dt});
                                    queueRecord.save();
                                }
                                else
                                {
                                    var errCode = updateResponse.err_code;
                                    var errmsg = pardotLib.errorCodeSwitcher(errCode);

                                    //QUEUE RECORD HERE WITH ERROR
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > REASON FOR FAILURE:' + errmsg;

                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                    queueRecord.save();
                                }
                            }
                        }
                    }
                }
            }
            else
            {
                //QUEUE RECORD HERE WITH ERROR
                var queueRecord = record.create({
                    type : 'customrecord_pi_queue',
                    isDynamic : true
                });

                var timeStamp = format.format({
                    value: new Date(),
                    type: format.Type.DATETIMETZ
                });

                var dt = pardotLib.dateParser(timeStamp);

                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > PROSPECT IN PARDOT DOES NOT BELONG TO ANY COMPANY. POSSIBLE GARBAGE PROSPECT RECORD. ACTION REQUIRED.';

                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                queueRecord.save();
            }
        }
    }

    return {
        execute: execute
    };

});
