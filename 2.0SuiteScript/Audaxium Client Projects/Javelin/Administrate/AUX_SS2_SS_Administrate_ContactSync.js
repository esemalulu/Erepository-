/**
* @NApiVersion 2.x
* @NScriptType ScheduledScript
* @NModuleScope SameAccount
*/

define(['N/search', '/SuiteScripts/AUX_Adminstrate_Library', 'N/record', 'N/runtime', 'N/error', 'N/format', 'N/task'],
function(search, lib, record, runtime, error, format, task)
{
    function execute(scriptContext)
    {
        var username = runtime.getCurrentScript().getParameter({ name : 'custscript_aux_web_user_email1' });
        var password = runtime.getCurrentScript().getParameter({ name : 'custscript_aux_web_user_email_pass1'});

        var sf = [
            ["custentity_aux_administrate_sid","isempty",""],
            "AND",
            ["datecreated","onorafter","yesterday"],
            "AND",
            ["company.custentity_aux_administrate_sid","isnotempty",""]
        ];

        var sc = [
            search.createColumn({ name : 'firstname' }),
            search.createColumn({ name : 'lastname' }),
            search.createColumn({ name : 'custentity_aux_administrate_sid', join : 'company' }),
            search.createColumn({ name : 'email' }),
            search.createColumn({ name : 'internalid' }),
            search.createColumn({ name : 'phone' }),
            search.createColumn({ name : 'custentity13'}) //DEPARTMENT
        ];

        var contactSearch = search.create({
            type: record.Type.CONTACT,
            filters: sf,
            columns: sc
        });

        var CRS = contactSearch.run().getRange({ start : 0, end : 1000 });

        if(CRS)
        {
            log.debug('DEBUG', 'Number of New Contact Records: ' + CRS.length);
            syncNewContactsToADM(CRS, record, username, password, task);
        }

        var sf = [
            ["company.custentity_aux_administrate_sid","isnotempty",""],
            "AND",
            ["custentity_aux_administrate_sid", "isnotempty", ""],
            "AND",
            ["systemnotes.date","onorafter","yesterday"],
            "AND",
            ["systemnotes.field","anyof","ENTITY.SEMAIL","ENTITY.SFIRSTNAME","ENTITY.SPHONE","ENTITY.SLASTNAME","ENTITY.KPARENT"]
        ];

        var sc = [
            search.createColumn({ name : 'firstname' }),
            search.createColumn({ name : 'lastname' }),
            search.createColumn({ name : 'custentity_aux_administrate_sid', join : 'company' }),
            search.createColumn({ name : 'email' }),
            search.createColumn({ name : 'internalid' }),
            search.createColumn({ name : 'phone' }),
            search.createColumn({ name : 'custentity13'}) // DEPARTMENT
        ];

        var contactUpdateSearch = search.create({
            type : record.Type.CONTACT,
            filters : sf,
            columns : sc
        });

        var CURS = contactUpdateSearch.run().getRange({ start : 0, end : 1000 });

        if(CURS)
        {
            log.debug('DEBUG', 'Number of Contacts to be Updated: ' + CURS.length);
            updateContactsToADM(CURS, record, username, password, task);
        }

    }

    function syncNewContactsToADM(resultSet, record, username, password, task)
    {
        try
        {
            for(var i = 0; i < resultSet.length; i+=1)
            {
                var custRec = record.load({
                    type : record.Type.CONTACT,
                    id : resultSet[i].getValue({ name : 'internalid' })
                });

                var customFields = {};
                var contact = {};

                contact['first_name'] = custRec.getValue({ fieldId : 'firstname' });
                contact['last_name']  = custRec.getValue({ fieldId : 'lastname'  });
                contact['account_id'] = parseInt(custRec.getValue({ fieldId : 'custentity_aux_adm_accid_sb' }));
                contact['email']      = custRec.getValue({ fieldId : 'email' });
                contact['tel']        = custRec.getValue({ fieldId : 'phone' });
                contact['department'] = custRec.getValue({ fieldId : 'custentity13'});
                contact['custom_fields'] = customFields;
                customFields["field_8"] = custRec.id.toString();

                var apiPath = '';

                var auth     = lib.authorization(username, password);
                var section  = lib.sectionPath("crm");
                var recType  = lib.recordPath("contacts");

                apiPath = section + recType;
                var pushContactJSONResp = lib.processPostRequest(apiPath, auth, JSON.stringify(contact));
                if(pushContactJSONResp.code == 200)
                {
                    var respBody = JSON.parse(pushContactJSONResp.body);
                    var contactADMID = respBody.id;

                    custRec.setValue({fieldId : 'custentity_aux_administrate_sid', value: contactADMID });
                    custRec.save();

                }
                else
                {
                    log.debug('ERROR', JSON.stringify(pushContactJSONResp));
                }
                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                var percentage = (i * 100) / resultSet.length;
                runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
                if(remainingUsage < 50 )
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
        }
        catch(error)
        {
            log.debug('ERROR', 'ERROR OCCURED, ITERATION: ' + i + 'RECORD ID: ' + custRec.id);
        }
    }


    function updateContactsToADM(resultSet, record, username, password)
    {
        for(var i = 0; i < resultSet.length; i+=1)
        {
            var custRec = record.load({
                type : record.Type.CONTACT,
                id : resultSet[i].getValue({ name : 'internalid' })
            });

            var customFields = {};
            var contact = {};

            var accountId = custRec.getValue({ fieldId : 'custentity_aux_administrate_sid' });

            contact['first_name'] = custRec.getValue({ fieldId : 'firstname' });
            contact['last_name']  = custRec.getValue({ fieldId : 'lastname'  });
            contact['account_id'] = parseInt(custRec.getValue({ fieldId : 'custentity_aux_adm_accid_sb' }));
            contact['email']      = custRec.getValue({ fieldId : 'email' });
            contact['tel']        = custRec.getValue({ fieldId : 'phone' });
            contact['department'] = custRec.getValue({ fieldId : 'custentity13'});
            contact['custom_fields'] = customFields;
            customFields["field_8"] = custRec.id.toString();

            var apiPath = '';
            var auth = lib.authorization(username, password);
            var section = lib.sectionPath("crm");
            var recType = lib.recordPath("contacts");

            apiPath = section + recType;

            var updateContactJSONResp = lib.processPutRequest(apiPath, auth, JSON.stringify(contact), accountId);
            if(updateContactJSONResp.code != 200)
            {
                log.debug('ERROR UPDATING CONTACT', custRec.id);
                log.debug('ERROR ->', JSON.stringify(updateContactJSONResp));
            }


            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

            var percentage = (i * 100) / resultSet.length;
            runtime.getCurrentScript().percentComplete = percentage.toFixed(2);
            if(remainingUsage < 50 )
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
    }

    return {
        execute : execute
    };

});
