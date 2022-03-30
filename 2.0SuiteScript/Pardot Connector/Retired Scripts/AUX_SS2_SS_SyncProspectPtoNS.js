/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'SuiteScripts/AUX_pardot_lib', 'N/record', 'N/runtime', 'N/task', 'N/format'],

function(search, pardotLib, record, runtime, task, format) {

    function execute(scriptContext)
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
                      search.createColumn({ name : 'custrecord_pi_config_contact_sync'}),
                      search.createColumn({ name : 'custrecord_pi_config_contact_inactives'}),
                      search.createColumn({ name : 'custrecord_pi_config_contact_search'}),
                      search.createColumn({ name : 'custrecord_pi_config_apiversion'})
                 ];

        var configSearch = search.create({
            type : 'customrecord_pi_config',
            filters : sf,
            columns : sc
        });

        var configRS = configSearch.run().getRange({start : 0, end : 1000 });
        if(configRS.length != 0)
        {
            var user_key          = configRS[0].getValue({ name : 'custrecord_pi_config_key'});
            var email             = configRS[0].getValue({ name : 'custrecord_pi_config_email'});
            var pass              = pardotLib.decodeAdminPassword(configRS[0].getValue({ name : 'custrecord_pi_config_pass' }));
            var apiversion        = configRS[0].getValue({ name : 'custrecord_pi_config_apiversion'});
            var result            = false;

            var results = syncNewProspects(result, email, pass, user_key, apiversion);
            if(results)
            {
                if(results[1] != true)
                {
                    var queueRecord = record.create({
                        type : 'customrecord_pi_queue',
                        isDynamic : true
                    });

                    var timeStamp = format.format({
                        value: new Date(),
                        type: format.Type.DATETIMETZ
                    });

                    var dt = pardotLib.dateParser(timeStamp);

                    var syncLog = 'QUEUE RECORD CREATED > NEW PROSPECT FOUND IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > FAILED DURING RECORD CREATION > ERROR RESPONSE > ' + results[0];

                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'ERROR'});
                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                    queueRecord.save();
                }
            }

            var results = syncExistingProspects(result, email, pass, user_key, apiversion)
            if(results)
            {
                if(results != true)
                {
                    var queueRecord = record.create({
                        type : 'customrecord_pi_queue',
                        isDynamic : true
                    });

                    var timeStamp = format.format({
                        value: new Date(),
                        type: format.Type.DATETIMETZ
                    });

                    var dt = pardotLib.dateParser(timeStamp);

                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED SYNC TO NETSUITE > ERROR > FAILED DURING RECORD UPDATE > ERROR RESPONSE > ' + results[0];

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

    function syncNewProspects(result, email, pass, user_key, apiversion)
    {
        try
        {
            var value = "login";
            var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
            var respBody = JSON.parse(connectionResponse.body);
            var api_key = respBody.api_key;

            var date = new Date();
            //GENERATE DATE FORMAT ACCEPTED BY PARDOT
            var executionDate = date.getFullYear() + '-' + pardotLib.month(date) + '-' + pardotLib.day(date) + ' ' + date.getHours() + ':' + pardotLib.minutes(date)+ ':' + pardotLib.seconds(date);

            // GENERATE REQUEST TO PULL UPDATED RECORDS FROM PARDOT.
            var payload = "api_key=" + api_key + "&user_key=" + user_key + "&assigned=true&created_after=" + executionDate + "&format=json";

            value = "prospects";
            var newProspects = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
            var newProspectsBody = JSON.parse(newProspects.body);

            var numOfProspects = newProspectsBody.result.prospect;
            if(numOfProspects)
            {
                if(numOfProspects.length != 0)
                {
                    log.debug(newProspectsBody.result.total_results);
                    log.debug('NUMBER OF NEW PROSPECT TO CREATE IN NETSUITE', newProspectsBody.result.total_results);
                    if(numOfProspects.length > 1)
                    {
                        top:for(var i = 0; i < numOfProspects.length; i+=1)
                        {
                            var prospectValues = numOfProspects[i];

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

                            var pfieldsRS = pfieldsSearch.run().getRange({
                                 start : 0,
                                 end : 1000
                            });

                            var values = {};

                            for(var y  = 0; y < pfieldsRS.length; y+=1)
                            {
                                var value = pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p'});
                                if(prospectValues[value])
                                {
                                    values[pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                }
                            }

                            var contactRec = record.create({
                                type: record.Type.CONTACT,
                                isDynamic : true,
                            });

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
                                    var custSearch = search.global({ keywords : 'cu:' + values[key]});
                                    if(!custSearch)
                                    {
                                        generateLeadAccount(prospectValues);
                                    }
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

                            contactRec.setValue({
                                fieldId : 'custentitypi_url',
                                value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id
                            });

                            var contactid = contactRec.save();

                            var percentage = (i * 100) / numOfProspects.length;
                            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                            if(remainingUsage < 50 )
                            {
                                var reschedule = task.create({
                                    taskType : task.TaskType.SCHEDULED_SCRIPT
                                });

                                reschedule.scriptId = runtime.getCurrentScript().id;
                                reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                reschedule.submit();
                                break top;
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

                            var syncLog = 'QUEUE RECORD CREATED > NEW PROSPECT FOUND IN PARDOT > ATTEMPTED SYNC TO NETSUITE > PROSPECT RECORD CREATED IN NETSUITE.';

                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : contactid.toString()});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_completed', value : dt});

                            queueRecord.save();


                        }
                        var temp = 'MULTIPLE RECORDS CREATED.'
                        result = true;
                        return [temp, result];
                    }
                    // IF ONLY ONE PROSPECT IS RETURNED PROCESS THE LOGIC BELOW
                    else if(numOfProspects)
                    {
                        var prospectValues = numOfProspects;

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

                        var pfieldsRS = pfieldsSearch.run().getRange({
                             start : 0,
                             end : 1000
                        });

                        var values = {};

                        for(var y  = 0; y < pfieldsRS.length; y+=1)
                        {
                            var value = pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p'});
                            if(prospectValues[value])
                            {
                                values[pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                            }
                        }

                        var contactRec = record.create({
                            type: record.Type.CONTACT,
                            isDynamic : true,
                        });

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
                                var custSearch = search.global({ keywords : 'cu:' + values[key]});
                                if(!custSearch)
                                {
                                    // CALL FUNCTION TO GENERATE LEAD
                                    // TODO : SEND RECORD TO function
                                    // TODO : PROCESS LEAD CREATIONS WITH VALUES FROM PARDOT
                                }
                            }
                            else if (key == 'custentitypi_last_activity')
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : pardotLib.dateParser(values[key])
                                });
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
                            else if (key == 'custentitypi_created_date')
                            {
                                contactRec.setValue({
                                    fieldId : key,
                                    value : pardotLib.dateParser(values[key])
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

                        contactRec.setValue({
                            fieldId : 'custentitypi_url',
                            value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id
                        });

                        var contactid = contactRec.save();

                        var queueRecord = record.create({
                            type : 'customrecord_pi_queue',
                            isDynamic : true
                        });

                        var timeStamp = format.format({
                            value: new Date(),
                            type: format.Type.DATETIMETZ
                        });

                        var dt = pardotLib.dateParser(timeStamp);

                        var syncLog = 'QUEUE RECORD CREATED > NEW PROSPECT FOUND IN PARDOT > ATTEMPTED SYNC TO NETSUITE > PROSPECT RECORD CREATED IN NETSUITE.';

                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : contactid.toString()});
                        queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                        queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                        queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                        queueRecord.setValue({fieldId : 'custrecord_pi_queue_completed', value : dt});

                        queueRecord.save();

                        var temp = 'RECORD CREATED';
                        result = true;
                        return [temp, result];

                    }
                    else
                    {
                        var temp = 'NO NEW RECORDS.'
                        result = true;
                        return [temp, result];
                    }
                }
                var temp = 'NO NEW RECORDS.'
                result = true;
                return [temp, result];
            }
        }
        catch (e)
        {
            var result = false;
            var error = e.message;
            return [error, result];
        }

    }

    function syncExistingProspects(result, email, pass, user_key, apiversion)
    {
        var value = "login";
        var connectionResponse = pardotLib.login(value, email, pass, user_key, apiversion);
        var respBody           = JSON.parse(connectionResponse.body);
        var api_key            = respBody.api_key;

        //GENERATE JAVASCRIPT DATE OBJECT
        var date = new Date();

        //GENERATE DATE FORMAT ACCEPTED BY PARDOT
        var executionDate = date.getFullYear() + '-' + pardotLib.month(date) + '-' + pardotLib.day(date) + ' ' + date.getHours() + ':' + pardotLib.minutes(date) + ':' + pardotLib.seconds(date);

        // GENERATE REQUEST TO PULL UPDATED RECORDS FROM PARDOT.
        var payload = "api_key=" + api_key + "&user_key=" + user_key + "&assigned=true&updated_after=" + encodeURIComponent(executionDate) + "&format=json";


        // SEND THE REQUEST TO RETRIEVE UPDATED RECORDS FROM PARDOT.
        value = "prospects";
        var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
        var updateResponseBody = JSON.parse(updateResponse.body);

        // ARRAY OF PROSPECT OBJECTS.
        var updateProspects = updateResponseBody.result.prospect;
        if(updateProspects)
        {
            if(updateProspects.length != 0)
            {
                if(updateProspects.length > 1)
                {
                    log.debug('NUMBER OF PROSPECTS TO UPDATE IN NETSUITE', updateResponseBody.result.total_results);
                    top:for(var i = 0; i < updateProspects.length; i+=1)
                    {
                        var nsRecId = updateProspects[i].crm_contact_fid;
                        if(nsRecId)
                        {
                            var prospectValues = updateProspects[i];
                            // GET PARDOT MASTER FIELDS FROM PROSPECT FIELD CONFIGURATION.
                            // DO A PROSPECT FIELD SEARCH AND ONLY THE FIELDS WITH A VALUE FOR NS FIELD ID
                            var sf = [
                                            ["isinactive","is","F"],
                                            "AND",
                                            ["custrecord_pi_nsfieldid_p", "isnotempty", ""],
                                            "AND",
                                            ["custrecord_pi_sync_priority_p","anyof", "2"]
                                     ];

                            var sc = [
                                          search.createColumn({ name : 'internalid' }),
                                          search.createColumn({ name : 'custrecord_pi_sync_priority_p'}),
                                          search.createColumn({ name : 'custrecord_pi_nsfieldid_p'}),
                                          search.createColumn({ name : 'custrecord_pi_fieldid_p'})
                                     ];

                            var PMPFS = search.create({
                                type: 'customrecord_pi_prospects',
                                filters: sf,
                                columns: sc
                            });

                            var pmpfsRS = PMPFS.run().getRange({
                                start : 0,
                                end : 1000
                            });
                            try
                            {
                                var contactRec = record.load({
                                    type: record.Type.CONTACT,
                                    id : nsRecId
                                });

                                // BUILDS OBJECT WITH VALUES FROM NETSUITE
                                var nsValues = {};
                                for(var y = 0; y < pmpfsRS.length; y+=1)
                                {
                                    nsValues[pmpfsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = contactRec.getValue({ fieldId : pmpfsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) });
                                }

                                // BUILDS OBJECTS WITH VALUES FROM PARDOT.
                                var pValues = {};
                                for(var x = 0; x < pmpfsRS.length; x+=1)
                                {
                                    var value = pmpfsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'})
                                    pValues[pmpfsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'})] = prospectValues[value];
                                }

                                for(var j = 0; j < Object.keys(nsValues).length && Object.keys(pValues).length; j+=1)
                                {
                                    var v1 = pmpfsRS[j].getValue({ name : 'custrecord_pi_nsfieldid_p'});
                                    var v2 = pmpfsRS[j].getValue({ name : 'custrecord_pi_fieldid_p'})
                                    var isEqual = nsValues[v1] === prospectValues[v2];

                                    if(isEqual == false)
                                    {
                                        if(v1 == 'contactsource')
                                        {
                                            var val = pardotLib.marketingCampaign();
                                            var id;
                                            for(var k in val){
                                                if(val[k] === prospectValues[v2])
                                                {
                                                    id = k;
                                                }
                                            }
                                            contactRec.setValue({ fieldId : v1, value : id });
                                        }
                                        else
                                        {
                                            contactRec.setValue({ fieldId : v1, value : prospectValues[v2]});
                                        }

                                    }
                                }

                                var contactId = contactRec.save();
                                var percentage = (i * 100) / updateProspects.length;
                                runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                if(remainingUsage < 50 )
                                {
                                    var reschedule = task.create({
                                        taskType : task.TaskType.SCHEDULED_SCRIPT
                                    });

                                    reschedule.scriptId = runtime.getCurrentScript().id;
                                    reschedule.deploymentId = runtime.getCurrentScript().deploymentId;

                                    reschedule.submit();
                                    break top;
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

                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED UPDATE IN NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY UPDATED IN NETSUITE.';

                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : contactId.toString()});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_completed', value :dt});

                                queueRecord.save();
                            }
                            catch (e)
                            {
                                var errorMsg = e.message;
                                var fields = errorMsg.split(':');
                                var fieldname = fields[1];
                                if(fieldname.search('contactsource') > -1)
                                {
                                    var queueRecord = record.create({
                                        type : 'customrecord_pi_queue',
                                        isDynamic : true
                                    });

                                    var timeStamp = format.format({
                                        value: new Date(),
                                        type: format.Type.DATETIMETZ
                                    });

                                    var dt = pardotLib.dateParser(timeStamp);

                                    var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED UPDATE IN NETSUITE > ERROR > INVALID VALUE FOR SOURCE FIELD IN PARDOT. VALUE MUST BE SPELT EXACTLY LIKE THE VALUES INSIDE OF NETSUITE > CRM LISTS.';

                                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : nsRecId.toString()});
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
                            var prospectValues = updateProspects[i];

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

                            var pfieldsRS = pfieldsSearch.run().getRange({
                                 start : 0,
                                 end : 1000
                            });

                            var values = {};

                            for(var y  = 0; y < pfieldsRS.length; y+=1)
                            {
                                var value = pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p'});
                                if(prospectValues[value])
                                {
                                    values[pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                                }
                            }

                            var contactRec = record.create({
                                type: record.Type.CONTACT,
                                isDynamic : true,
                            });

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
                                    var custSearch = search.global({ keywords : 'cu:' + values[key]});
                                    if(!custSearch)
                                    {
                                        generateLeadAccount(prospectValues);
                                    }
                                }
                                else if (key == 'custentitypi_last_activity')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
                                    });
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
                                else if (key == 'custentitypi_do_not_email')
                                {
                                    if(values[key] == 1)
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : true
                                        });
                                    }
                                    else
                                    {
                                        contactRec.setValue({
                                            fieldId : key,
                                            value : false
                                        });
                                    }
                                }
                                else if (key == 'custentitypi_created_date')
                                {
                                    contactRec.setValue({
                                        fieldId : key,
                                        value : pardotLib.dateParser(values[key])
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

                            contactRec.setValue({
                                fieldId : 'custentitypi_url',
                                value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id
                            });

                            var contactid = contactRec.save();

                            var queueRecord = record.create({
                                type : 'customrecord_pi_queue',
                                isDynamic : true
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotLib.dateParser(timeStamp);

                            var syncLog = 'QUEUE RECORD CREATED > NEW PROSPECT FOUND IN PARDOT > ATTEMPTED SYNC TO NETSUITE > PROSPECT RECORD CREATED IN NETSUITE.';

                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : contactid.toString()});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_completed', value : dt});

                            queueRecord.save();
                        }
                    }
                    var temp = 'RECORD CREATED';
                    result = true;
                    return [temp, result];
                }
                else if(updateProspects)
                {
                    var prospectValues = updateProspects;
                    var nsRecId = updateProspects.crm_contact_fid;
                    if(nsRecId)
                    {
                        // GET PARDOT MASTER FIELDS FROM PROSPECT FIELD CONFIGURATION.
                        // DO A PROSPECT FIELD SEARCH AND ONLY THE FIELDS WITH A VALUE FOR NS FIELD ID
                        var sf = [
                                        ["isinactive","is","F"],
                                        "AND",
                                        ["custrecord_pi_nsfieldid_p", "isnotempty", ""],
                                        "AND",
                                        ["custrecord_pi_sync_priority_p","anyof", "2"]
                                 ];

                        var sc = [
                                      search.createColumn({ name : 'internalid' }),
                                      search.createColumn({ name : 'custrecord_pi_sync_priority_p'}),
                                      search.createColumn({ name : 'custrecord_pi_nsfieldid_p'}),
                                      search.createColumn({ name : 'custrecord_pi_fieldid_p'})
                                 ];

                        var PMPFS = search.create({
                            type: 'customrecord_pi_prospects',
                            filters: sf,
                            columns: sc
                        });

                        var pmpfsRS = PMPFS.run().getRange({
                            start : 0,
                            end : 1000
                        });
                        try
                        {
                            var contactRec = record.load({
                                type: record.Type.CONTACT,
                                id : nsRecId
                            });

                            // BUILDS OBJECT WITH VALUES FROM NETSUITE
                            var nsValues = {};
                            for(var y = 0; y < pmpfsRS.length; y+=1)
                            {
                                nsValues[pmpfsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = contactRec.getValue({ fieldId : pmpfsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p'}) });
                            }

                            // BUILDS OBJECTS WITH VALUES FROM PARDOT.
                            var pValues = {};
                            for(var x = 0; x < pmpfsRS.length; x+=1)
                            {
                                var value = pmpfsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'})
                                pValues[pmpfsRS[x].getValue({ name : 'custrecord_pi_fieldid_p'})] = prospectValues[value];
                            }

                            for(var j = 0; j < Object.keys(nsValues).length && Object.keys(pValues).length; j+=1)
                            {
                                var v1 = pmpfsRS[j].getValue({ name : 'custrecord_pi_nsfieldid_p'});
                                var v2 = pmpfsRS[j].getValue({ name : 'custrecord_pi_fieldid_p'})
                                var isEqual = nsValues[v1] === prospectValues[v2];

                                if(isEqual == false)
                                {
                                    if(v1 == 'contactsource')
                                    {
                                        var val = pardotLib.marketingCampaign();
                                        var id;
                                        for(var k in val){
                                            if(val[k] === prospectValues[v2])
                                            {
                                                id = k;
                                            }
                                        }
                                        contactRec.setValue({ fieldId : v1, value : id });
                                    }
                                    else
                                    {
                                        contactRec.setValue({fieldId : v1, value : prospectValues[v2]});
                                    }

                                }
                            }

                            var contactId = contactRec.save();
                            var queueRecord = record.create({
                                type : 'customrecord_pi_queue',
                                isDynamic : true
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotLib.dateParser(timeStamp);

                            var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED UPDATE IN NETSUITE > COMPLETED > PROSPECT SUCCESSFULLY UPDATED IN NETSUITE.';

                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : contactId.toString()});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_completed', value :dt});

                            queueRecord.save();
                        }
                        catch (e)
                        {
                            var errorMsg = e.message;
                            var fields = errorMsg.split(':');
                            var fieldname = fields[1];

                            var queueRecord = record.create({
                                type : 'customrecord_pi_queue',
                                isDynamic : true
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotLib.dateParser(timeStamp);

                            if(fieldname.search('contactsource') > -1)
                            {
                                var syncLog = 'QUEUE RECORD CREATED > PROSPECT UPDATED IN PARDOT > ATTEMPTED UPDATE IN NETSUITE > ERROR > INVALID VALUE FOR SOURCE FIELD IN PARDOT. VALUE MUST BE SPELT EXACTLY LIKE THE VALUES INSIDE OF NETSUITE > CRM LISTS.';
                            }
                            else
                            {
                                var syncLog = 'QUEUE RECORD CREATE > PROSPECT UPDATED IN PARDOT > ATTEMPTED UPDATE IN NETSUITE > ERROR > UNABLE TO UPDATE RECORD > ERROR MESSAGE: ' + errorMsg;
                            }


                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : nsRecId.toString()});
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
                    var prospectValues = updateProspects;

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

                    var pfieldsRS = pfieldsSearch.run().getRange({
                         start : 0,
                         end : 1000
                    });

                    var values = {};

                    for(var y  = 0; y < pfieldsRS.length; y+=1)
                    {
                        var value = pfieldsRS[y].getValue({ name : 'custrecord_pi_fieldid_p'});
                        if(prospectValues[value])
                        {
                            values[pfieldsRS[y].getValue({ name : 'custrecord_pi_nsfieldid_p' })] = prospectValues[value];
                        }
                    }

                    var contactRec = record.create({
                        type: record.Type.CONTACT,
                        isDynamic : true,
                    });

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
                            var custSearch = search.global({ keywords : 'cu:' + values[key]});
                            if(!custSearch)
                            {
                                generateLeadAccount(prospectValues);
                            }
                        }
                        else if(key == 'email')
                        {
                            var conSearch = search.global({keywords : 'con:' + values[key]});
                            if(conSearch)
                            {
                                var id = conSearch[0].id;
                                var contactRec = record.load({ type : record.Type.CONTACT, id : id});
                                var pardotURL = contactRec.getValue({fieldId : 'custentitypi_url'});
                                var pID = pardotURL.split('=');
                                // PARDOT ID = pID[1];
                                // UPDATE CONTACT RECORD IN PARDOT
                                var payload = 'user_key=' + user_key + '&api_key=' + api_key + '&id=' + pID[1] + '&crm_contact_fid=' + id + '&format=json';
                                var value = 'updateprospect';
                                var updateResponse = pardotLib.updateProspect(value, api_key, user_key, payload, apiversion);
                                var updateResponseBody = JSON.parse(updateResponse.body);
                            }
                        }
                        else if (key == 'custentitypi_last_activity')
                        {
                            contactRec.setValue({
                                fieldId : key,
                                value : pardotLib.dateParser(values[key])
                            });
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
                        else if (key == 'custentitypi_created_date')
                        {
                            contactRec.setValue({
                                fieldId : key,
                                value : pardotLib.dateParser(values[key])
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

                    contactRec.setValue({
                        fieldId : 'custentitypi_url',
                        value : 'http://pi.pardot.com/prospect/read?id=' + prospectValues.id
                    });

                    var contactid = contactRec.save();

                    var queueRecord = record.create({
                        type : 'customrecord_pi_queue',
                        isDynamic : true
                    });

                    var timeStamp = format.format({
                        value: new Date(),
                        type: format.Type.DATETIMETZ
                    });

                    var dt = pardotLib.dateParser(timeStamp);

                    var syncLog = 'QUEUE RECORD CREATED > NEW PROSPECT FOUND IN PARDOT > ATTEMPTED SYNC TO NETSUITE > PROSPECT RECORD CREATED IN NETSUITE.';

                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : contactid.toString()});
                    queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                    queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'COMPLETED'});
                    queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_date', value : dt});
                    queueRecord.setValue({fieldId : 'custrecord_pi_queue_completed', value : dt});

                    queueRecord.save();

                }

                    var temp = 'RECORD CREATED';
                    result = true;
                    return [temp, result];
                }
                else
                {
                    var temp = 'NO NEW RECORDS.'
                    result = true;
                    return [temp, result];
                }
            }
        }
    }

    function generateLeadAccount()
    {

    }

    return {
        execute: execute
    };

});
