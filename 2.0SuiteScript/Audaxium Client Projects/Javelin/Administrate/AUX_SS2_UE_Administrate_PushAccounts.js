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
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */

    function afterSubmit(scriptContext)
    {
        var isNew = false;
        var username  = runtime.getCurrentScript().getParameter({ name :  'custscript_aux_web_user_email2' });
        var password  = runtime.getCurrentScript().getParameter({ name : 'custscript_aux_web_user_email_pass2' });


        var custRec = record.load({
            type : record.Type.CUSTOMER,
            id : scriptContext.newRecord.id
        });

        var pushAccount = custRec.getValue({ fieldId : 'custentity_aux_cx_synctoadm' });
        var admId       = custRec.getValue({ fieldId : 'custentity_aux_administrate_id' });
        var sadmId      = custRec.getValue({ fieldId : 'custentity_aux_administrate_sid' });

        if(sadmId)
        {
            isNew = false;
            if(pushAccount == true)
            {
                if(isNew == false)
                {
                    var accountId = custRec.getValue({ fieldId : 'custentity_aux_administrate_sid' });
                    // var accountId  = custRec.getValue({ fieldId : 'custentity_aux_administrate_id' });

                    var account = {};
                    var customField = {};
                        account["name"]                         = custRec.getValue({ fieldId: 'companyname'});

                    var numOfLines = custRec.getLineCount({ sublistId: 'addressbook'});
                    for (var y = 0; y < numOfLines; y+=1)
                    {
                        var addressSubrecord = custRec.getSublistSubrecord({
                            sublistId: 'addressbook',
                            fieldId: 'addressbookaddress',
                            line : y
                        });

                        // DEFAULT SHIPPING AND BILLING LOGIC WITH DEFAULT ADDRESS SET.
                        var defaultShipping = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultshipping', line: y});
                        var defaultBilling  = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultbilling', line: y});

                        if(defaultShipping == true)
                        {
                            account["shipping_address_street"]         = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["shipping_address_unit"]           = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["shipping_address_town"]           = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["shipping_address_postcode"]       = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["shipping_address_country_id"]     = addressSubrecord.getValue({ fieldId: 'country'    });
                        }

                        if (defaultBilling == true)
                        {
                            account["billing_address_street"]          = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["billing_address_unit"]            = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["billing_address_town"]            = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["billing_address_postcode"]        = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["billing_address_country_id"]      = addressSubrecord.getValue({ fieldId: 'country'    });
                            account["address_street"]                  = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["address_unit"]                    = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["address_town"]                    = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["address_postcode"]                = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["address_country_id"]              = addressSubrecord.getValue({ fieldId: 'country'    });
                        }

                        if(defaultBilling == true && defaultShipping == true)
                        {
                            account["shipping_address_street"]         = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["shipping_address_unit"]           = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["shipping_address_town"]           = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["shipping_address_postcode"]       = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["shipping_address_country_id"]     = addressSubrecord.getValue({ fieldId: 'country'    });
                            account["billing_address_street"]          = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["billing_address_unit"]            = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["billing_address_town"]            = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["billing_address_postcode"]        = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["billing_address_country_id"]      = addressSubrecord.getValue({ fieldId: 'country'    });
                            account["address_street"]                  = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["address_unit"]                    = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["address_town"]                    = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["address_postcode"]                = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["address_country_id"]              = addressSubrecord.getValue({ fieldId: 'country'    });
                        }
                    }

                    account["tel"]                          = custRec.getValue({ fieldId: 'phone'      });
                    customField["field_6"]                  = custRec.id.toString();
                    customField["field_7"]                  = custRec.getText({ fieldId: 'entitystatus '});
                    account["is_customer"]                  = true;
                    account["custom_fields"]                = customField;
                    account["company_id"]                   = 1;

                    var apiPath = '';

                    var auth = lib.authorization(username, password);
                    var section = lib.sectionPath("crm");
                    var recType = lib.recordPath("accounts");

                    apiPath = section + recType;

                    var accountPushResp = lib.processPutRequest(apiPath, auth, JSON.stringify(account), accountId);
                    if(accountPushResp.code != 200)
                    {
                        log.debug('ERROR UPDATING ADMINISTRATE RECORD', JSON.stringify(accountPushResp));
                    }

                }
            }
        }
        else
        {
            isNew = true;
            if(pushAccount == true)
            {
                if(isNew == true)
                {
                    var account = {};
                    var customField = {};
                        account["name"]                         = custRec.getValue({ fieldId: 'companyname'});


                    var numOfLines = custRec.getLineCount({ sublistId: 'addressbook'});
                    for (var y = 0; y < numOfLines; y+=1)
                    {
                        var addressSubrecord = custRec.getSublistSubrecord({
                            sublistId: 'addressbook',
                            fieldId: 'addressbookaddress',
                            line : y
                        });

                        // DEFAULT SHIPPING AND BILLING LOGIC WITH DEFAULT ADDRESS SET.
                        var defaultShipping = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultshipping', line: y});
                        var defaultBilling  = custRec.getSublistValue({ sublistId:'addressbook', fieldId: 'defaultbilling', line: y});

                        if(defaultShipping == true)
                        {
                            account["shipping_address_street"]         = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["shipping_address_unit"]           = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["shipping_address_town"]           = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["shipping_address_postcode"]       = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["shipping_address_country_id"]     = addressSubrecord.getValue({ fieldId: 'country'    });
                        }

                        if (defaultBilling == true)
                        {
                            account["billing_address_street"]          = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["billing_address_unit"]            = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["billing_address_town"]            = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["billing_address_postcode"]        = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["billing_address_country_id"]      = addressSubrecord.getValue({ fieldId: 'country'    });
                            account["address_street"]                  = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["address_unit"]                    = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["address_town"]                    = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["address_postcode"]                = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["address_country_id"]              = addressSubrecord.getValue({ fieldId: 'country'    });
                        }

                        if(defaultBilling == true && defaultShipping == true)
                        {
                            account["shipping_address_street"]         = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["shipping_address_unit"]           = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["shipping_address_town"]           = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["shipping_address_postcode"]       = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["shipping_address_country_id"]     = addressSubrecord.getValue({ fieldId: 'country'    });
                            account["billing_address_street"]          = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["billing_address_unit"]            = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["billing_address_town"]            = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["billing_address_postcode"]        = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["billing_address_country_id"]      = addressSubrecord.getValue({ fieldId: 'country'    });
                            account["address_street"]                  = addressSubrecord.getValue({ fieldId: 'addr1'      });
                            account["address_unit"]                    = addressSubrecord.getValue({ fieldId: 'addr2'      });
                            account["address_town"]                    = addressSubrecord.getValue({ fieldId: 'city'       });
                            account["address_postcode"]                = addressSubrecord.getValue({ fieldId: 'zip'        });
                            account["address_country_id"]              = addressSubrecord.getValue({ fieldId: 'country'    });
                        }
                    }

                    account["tel"]                          = custRec.getValue({ fieldId: 'phone'      });
                    customField["field_6"]                  = custRec.id.toString();
                    customField["field_7"]                  = custRec.getText({ fieldId: 'entitystatus '});
                    account["is_customer"]                  = true;
                    account["custom_fields"]                = customField;
                    account["company_id"]                   = 1

                    var apiPath = '';

                    var auth = lib.authorization(username, password);
                    var section = lib.sectionPath("crm");
                    var recType = lib.recordPath("accounts");

                    apiPath = section + recType;

                    var accountPushResp = lib.processPostRequest(apiPath, auth, JSON.stringify(account));
                    if(accountPushResp.code == 200)
                    {
                        var respBody = JSON.parse(accountPushResp.body);
                        var accountId = respBody.id;
                        custRec.setValue({fieldId : 'custentity_aux_administrate_sid', value: accountId });
                        custRec.save();
                    }
                    else
                    {
                        log.debug('ERROR', JSON.stringify(accountPushResp));
                    }

                }
            }
        }




    }




    return {
        afterSubmit : afterSubmit
    };

});
