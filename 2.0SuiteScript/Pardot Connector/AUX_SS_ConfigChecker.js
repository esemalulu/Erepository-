/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', './AUX_pardot_lib', 'N/record', 'N/format'],

function(search, pardotLib, record, format) {

    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext)
    {
       var isExists = false;
        if(isExists == false)
        {
            isExists = prospectFieldsRecordGenerator(isExists);
            isExists = false;
            isExists = prospectAccountFieldsRecordGenerator(isExists);
            isExists = false;

        }
    }

    function prospectFieldsRecordGenerator(isExists)
    {
        var adminEmail, adminPass, apiUserKey, syncContacts, syncInactiveContacts, syncAllContacts, contactCriteria, value, apiverion;
       var searchFilter = [
                               ["isinactive", "is", "F"],
                               "AND",
                               ["custrecord_pi_config_key", "isnotempty", ""],
                               "AND",
                               ["custrecord_pi_config_email", "isnotempty", ""],
                               "AND",
                               ["custrecord_pi_config_pass", "isnotempty", ""],
                               "AND",
                               ["custrecord_pi_config_status", "anyof", "1"]
                          ];

       var searchColumns = [
                               search.createColumn({ name: 'custrecord_pi_config_email' }),
                               search.createColumn({ name: 'custrecord_pi_config_pass' }),
                               search.createColumn({ name: 'custrecord_pi_config_key' }),
                               search.createColumn({ name: 'custrecord_pi_config_contact' }),
                               search.createColumn({ name: 'custrecord_pi_config_contact_inactives' }),
                               search.createColumn({ name: 'custrecord_pi_config_contact_sync' }),
                               search.createColumn({ name: 'custrecord_pi_config_contact_search' }),
                               search.createColumn({ name: 'custrecord_pi_config_apiversion'})
                          ];

       var configSearch = search.create
       ({
           type: 'customrecord_pi_config',
           filters: searchFilter,
           columns: searchColumns
       });

       var configResult = configSearch.run().getRange({
           start: 0,
           end: 1000
       });

       for(var i = 0; i < configResult.length; i+=1)
       {
           adminEmail           = configResult[i].getValue({ name: 'custrecord_pi_config_email'});
           adminPass            = configResult[i].getValue({ name: 'custrecord_pi_config_pass' });
           apiUserKey           = configResult[i].getValue({ name: 'custrecord_pi_config_key'  });
           syncContacts         = configResult[i].getValue({ name: 'custrecord_pi_config_contact'});
           syncInactiveContacts = configResult[i].getValue({ name: 'custrecord_pi_config_contact_inactive'});
           syncAllContacts      = configResult[i].getValue({ name: 'custrecord_pi_config_contact_sync'});
           contactCriteria      = configResult[i].getValue({ name: 'custrecord_pi_config_contact_search'});
            apiversion          = configResult[i].getValue({ name: 'custrecord_pi_config_apiversion'});
       }

       var pass                 = pardotLib.decodeAdminPassword(adminPass);
           value                = "login";
       var connectionResponse   = pardotLib.login(value, adminEmail, pass, apiUserKey, apiversion);
       var responseBody         = JSON.parse(connectionResponse.body);
       var apiKey               = responseBody.api_key;
           value                = "custom";
       var customFieldsResponse = pardotLib.retrieveCustomFields(apiKey, apiUserKey, value, apiversion);
       var cResp                = JSON.parse(customFieldsResponse.body);
       var cFieldsJSON          = JSON.stringify(cResp.result.customField);
       var cFields              = JSON.parse(cFieldsJSON);


       for(var i = 0; i<cFields.length; i+=1)
       {
           var timestamp = cFields[i].updated_at;
           var date = pardotLib.dateParser(timestamp);

           var prospectFields = record.create
           ({
               type: 'customrecord_pi_prospects',
               isDynamic: true
           });

           prospectFields.setValue
           ({
               fieldId: 'custrecord_pi_name_p',
               value: cFields[i].name
           });

           prospectFields.setValue
            ({
               fieldId: 'custrecord_pi_fieldid_p',
               value: cFields[i].field_id
            });

           prospectFields.setValue
            ({
               fieldId: 'custrecord_pi_nsfieldid_p',
               value: cFields[i].crm_id
            });

           prospectFields.setValue
            ({
               fieldId: 'custrecord_pi_type_p' ,
               value: pardotLib.fieldTypeSelection(cFields[i].type)
            });

           prospectFields.setValue
            ({
               fieldId: 'custrecord_pi_updated_p',
               value: date
            });

           prospectFields.setValue
            ({
               fieldId: 'custrecord_pi_custom_p' ,
               value: true
            });

           prospectFields.setValue
            ({
               fieldId: 'custrecord_pi_sync_priority_p',
               value: ''
            });

            var recID = prospectFields.save
            ({
               enableSourcing: false,
               ignoreMandatoryFields: false
            });
       }
        isExists = true;
        return isExists
    }

    function prospectAccountFieldsRecordGenerator(isExists)
    {
        var adminEmail, adminPass, apiUserKey, syncContacts, syncInactiveContacts, syncAllContacts, contactCriteria, value, apiversion;
       var searchFilter = [
                               ["isinactive", "is", "F"],
                               "AND",
                               ["custrecord_pi_config_key", "isnotempty", ""],
                               "AND",
                               ["custrecord_pi_config_email", "isnotempty", ""],
                               "AND",
                               ["custrecord_pi_config_pass", "isnotempty", ""],
                               "AND",
                               ["custrecord_pi_config_status", "anyof", "1"]
                          ];

       var searchColumns = [
                               search.createColumn({ name: 'custrecord_pi_config_email' }),
                               search.createColumn({ name: 'custrecord_pi_config_pass' }),
                               search.createColumn({ name: 'custrecord_pi_config_key' }),
                               search.createColumn({ name: 'custrecord_pi_config_cust' }),
                               search.createColumn({ name: 'custrecord_pi_config_cust_sync_inactives' }),
                               search.createColumn({ name: 'custrecord_pi_config_cust_sync' }),
                               search.createColumn({ name: 'custrecord_pi_config_cust_search' }),
                               search.createColumn({ name: 'custrecord_pi_config_apiversion'})
                          ];

       var configSearch = search.create
       ({
           type: 'customrecord_pi_config',
           filters: searchFilter,
           columns: searchColumns
       });

       var configResult = configSearch.run().getRange({ start: 0, end: 1000 });
       for(var i = 0; i < configResult.length; i+=1)
       {
            adminEmail           = configResult[i].getValue({ name: 'custrecord_pi_config_email'});
            adminPass            = configResult[i].getValue({ name: 'custrecord_pi_config_pass' });
            apiUserKey           = configResult[i].getValue({ name: 'custrecord_pi_config_key'  });
            syncContacts         = configResult[i].getValue({ name: 'custrecord_pi_config_cust'});
            syncInactiveContacts = configResult[i].getValue({ name: 'custrecord_pi_config_cust_sync_inactives'});
            syncAllContacts      = configResult[i].getValue({ name: 'custrecord_pi_config_cust_sync'});
            contactCriteria      = configResult[i].getValue({ name: 'custrecord_pi_config_cust_search'});
            apiversion           = configResult[i].getValue({ name: 'custrecord_pi_config_apiversion'});
       }

        var pass                 = pardotLib.decodeAdminPassword(adminPass);
            value                = "login";
        var connectionResponse   = pardotLib.login(value, adminEmail, pass, apiUserKey, apiversion);
        var responseBody         = JSON.parse(connectionResponse.body);
        var apiKey               = responseBody.api_key;
            value                = "custom";
        var customFieldsResponse = pardotLib.retrieveCustomFields(apiKey, apiUserKey, value, apiversion);
        var cResp                = JSON.parse(customFieldsResponse.body);
        var cFieldsJSON          = JSON.stringify(cResp.result.customField);
        var cFields              = JSON.parse(cFieldsJSON);

        for(var i = 0; i<cFields.length; i+=1)
       {
           var timestamp = cFields[i].updated_at;
           var date = pardotLib.dateParser(timestamp);

           var prospectAccountFields = record.create
           ({
               type: 'customrecord_pi_prospect_accounts',
               isDynamic: true
           });

           prospectAccountFields.setValue
           ({
               fieldId: 'custrecord_pi_name_pa',
               value: cFields[i].name
           });

           prospectAccountFields.setValue
            ({
               fieldId: 'custrecord_pi_fieldid_pa',
               value: cFields[i].field_id
            });

           prospectAccountFields.setValue
            ({
               fieldId: 'custrecord_pi_nsfieldid_pa',
               value: cFields[i].crm_id
            });

           prospectAccountFields.setValue
            ({
               fieldId: 'custrecord_pi_type_pa' ,
               value: pardotLib.fieldTypeSelection(cFields[i].type)
            });

           prospectAccountFields.setValue
            ({
               fieldId: 'custrecord_pi_updated_pa',
               value: date
            });

           prospectAccountFields.setValue
            ({
               fieldId: 'custrecord_pi_custom_pa' ,
               value: true
            });

           prospectAccountFields.setValue
            ({
               fieldId: 'custrecord_pi_sync_priority_pa',
               value: ''
            });

            var recID = prospectAccountFields.save
            ({
               enableSourcing: false,
               ignoreMandatoryFields: false
            });
       }
        isExists = true;
        return isExists;
    }

    return {
        execute: execute
    };

});
