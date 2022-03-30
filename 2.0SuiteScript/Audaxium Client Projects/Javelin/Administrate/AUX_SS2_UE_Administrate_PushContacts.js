/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', '/SuiteScripts/AUX_Adminstrate_Library', 'N/record'],

function(runtime, lib, record) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext)
    {
        var contactRec = record.load({
            type : record.Type.CONTACT,
            id : scriptContext.newRecord.id
        });

        var username  = runtime.getCurrentScript().getParameter({ name :  'custscript_aux_web_user_email3' });
        var password  = runtime.getCurrentScript().getParameter({ name : 'custscript_aux_web_user_email_pass3' });
        var sync      = contactRec.getValue({ fieldId : 'custentity_aux_cx_synctoadm' });

        var isNew = false;
        var accountId  = contactRec.getValue({ fieldId : 'custentity_aux_adm_accid_sb' });
        var contactId  = contactRec.getValue({ fieldId : 'custentity_aux_administrate_sid' });

        if(accountId && contactId)
        {
            isNew = false;
            if(isNew == false && sync == true)
            {
                var customFields = {};
                var contact = {};

                contact['first_name'] = contactRec.getValue({ fieldId : 'firstname' });
                contact['last_name']  = contactRec.getValue({ fieldId : 'lastname'  });
                contact['account_id'] = parseInt(contactRec.getValue({ fieldId : 'custentity_aux_adm_accid_sb' }));
                contact['email']      = contactRec.getValue({ fieldId : 'email' });
                contact['tel']        = contactRec.getValue({ fieldId : 'phone' });
                contact['department'] = contactRec.getValue({ fieldId : 'custentity13'});
                contact['custom_fields'] = customFields;
                customFields["field_8"] = contactRec.id.toString();

                var apiPath = '';
                var auth = lib.authorization(username, password);
                var section = lib.sectionPath("crm");
                var recType = lib.recordPath("contacts");

                apiPath = section + recType;

                var updateContactJSONResp = lib.processPutRequest(apiPath, auth, JSON.stringify(contact), contactId);
                if(updateContactJSONResp.code != 200)
                {
                    log.debug('ERROR UPDATING CONTACT', contactRec.id);
                    log.debug('ERROR ->', JSON.stringify(updateContactJSONResp));
                }
            }
        }
        else if (accountId && !contactId)
        {
            isNew = true;
            if(isNew == true && sync == true)
            {
                var customFields = {};
                var contact = {};

                contact['first_name'] = contactRec.getValue({ fieldId : 'firstname' });
                contact['last_name']  = contactRec.getValue({ fieldId : 'lastname'  });
                contact['account_id'] = parseInt(contactRec.getValue({ fieldId : 'custentity_aux_adm_accid_sb' }));
                contact['email']      = contactRec.getValue({ fieldId : 'email' });
                contact['tel']        = contactRec.getValue({ fieldId : 'phone' });
                contact['department'] = contactRec.getValue({ fieldId : 'custentity13'});
                contact['custom_fields'] = customFields;
                customFields["field_8"] = contactRec.id.toString();

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

                    contactRec.setValue({fieldId : 'custentity_aux_administrate_sid', value: contactADMID });
                    contactRec.save();

                }
                else
                {
                    log.debug('ERROR', JSON.stringify(pushContactJSONResp));
                }
            }
        }
        else if (!accountId && !contactId )
        {
            log.debug('ERROR', 'ACCOUNT DOESNT EXIST IN ADMINISTRATE. PLEASE SUBMIT ACCONT TO ADMINISTRATE FIRST');
        }
    }

    return {
        afterSubmit: afterSubmit
    };

});
