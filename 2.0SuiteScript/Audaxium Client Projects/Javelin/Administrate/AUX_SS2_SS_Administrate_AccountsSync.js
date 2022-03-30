/**
* @NApiVersion 2.x
* @NScriptType ScheduledScript
* @NModuleScope SameAccount
*/

/**
* SCRIPT EXPLAINATION:
*  - The purpose of this script is to push new customers and update existing customer inside of administrate.
*  - The script contains two searches and 3 functions
*  - The first function performances two searches (one search for new customers and one for existing customers)
*  - The first function will call the other two functions depending on the number of results returned from the search.
*/
define(['N/search', '/SuiteScripts/AUX_Adminstrate_Library', 'N/record', 'N/runtime', 'N/error', 'N/format', 'N/task'],

function(search, lib, record, runtime, error, format, task) {

    /**
    * Definition of the Scheduled script trigger point.
    * customsearch8042
    *
    * @param {Object} scriptContext
    * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
    * @Since 2015.2
    */
    function execute(scriptContext)
    {
        var username = runtime.getCurrentScript().getParameter({ name : 'custscript_aux_web_user_email' });
        var password = runtime.getCurrentScript().getParameter({ name : 'custscript_aux_web_user_email_pass'});

        var isNew = false;
        var date = new Date();

        var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
        var am_pm = date.getHours() >= 12 ? "PM" : "AM";

        var today = lib.month(date) + '/' + lib.day(date) + '/' + date.getFullYear() + ' ' + hours + ':' + lib.minutes(date) + ' ' + am_pm;
        var dateTime = format.format({ value : today, type: format.Type.DATETIME });

        // SEARCH TO FIND CUSTOMERS THAT SHOULD BE SYNC WITH ADMINSTRATE.
        var sf = [
                    ["stage","anyof","CUSTOMER"],
                    "AND",
                    ["isinactive","is","F"],
                    "AND",
                    ["custentity_aux_administrate_sid","isempty",""],
                    "AND",
                    ["custentity_aux_administrate_id","isempty",""], // TO BE REMOVED ONCED MOVED TO PRODUCTION
                    "AND",
                    ["custentity_aux_ss_toadm","is","T"], // TO BE DELETED ONCE READY FOR PRODUCTION
                    "AND",
                    ["datecreated", "is", "today"] // TO BE REMOVED ONCED MOVED TO PRODUCTION
                ];

        var sc = [
            search.createColumn({
                name : 'internalid'
            })
        ];

        var customerSearch = search.create({
            type: search.Type.CUSTOMER,
            filters: sf,
            columns: sc
        });

        var CRS = customerSearch.run().getRange({
            start: 0,
            end: 1000
        });


        // SEARCH TO FIND CUSTOMERS THAT HAVE BEEN SYNCED WITH ADMINSTRATE AND HAVE RECENTLY BEEN UPDATED.
        var sf = [
                    ["stage","anyof","CUSTOMER"],
                    "AND",
                    ["isinactive","is","F"],
                    "AND",
                    ["custentity_aux_administrate_id","isempty",""],
                    "AND",
                    ["custentity_aux_administrate_sid","isnotempty",""],
                    "AND",
                    ["custentity_aux_ss_toadm","is","T"],
                    "AND",
                    ["lastmodifieddate","onorafter", dateTime]
                ];

        var sc = [
                    search.createColumn({ name : 'internalid' }),
                    search.createColumn({ name : 'custentity_aux_administrate_sid' })
                ];

        var custUpdateSearch = search.create({
            type: search.Type.CUSTOMER,
            filters: sf,
            columns: sc
        });

        var CUS = custUpdateSearch.run().getRange({ start: 0, end: 1000 });

        //FUNCTION CALLERS HERE
        if(CRS.length > 0)
        {
            log.debug('DEBUG', 'Number of Accounts to be Created: ' + CRS.length);
            isNew = true;
            syncNewAccounts(isNew, CRS, record, username, password);
        }

        if(CUS.length > 0)
        {
            log.debug('DEBUG', 'Number of Accounts to be Updated: ' + CUS.length);
            isNew = false;
            syncAccounts(isNew, CUS, record, username, password);
        }
    }

    function syncNewAccounts(isNew, CRS, record, username, password)
    {
        if(isNew == true && CRS)
        {
            if(CRS)
            {
                try
                {
                    for(var i = 0; i < CRS.length; i+=1)
                    {
                        var custRec = record.load({
                            type: record.Type.CUSTOMER,
                            id : CRS[i].getValue({ name : 'internalid'})
                        });

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

                        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                        //API REQUEST TO PUSH CUSTOMER TO ADMINSTRATE
                        var apiPath = '';

                        var auth     = lib.authorization(username, password);
                        var section  = lib.sectionPath("crm");
                        var recType   = lib.recordPath("accounts");

                        apiPath = section + recType;

                        var accountPushRespJSON = lib.processPostRequest(apiPath, auth, JSON.stringify(account));
                        if(accountPushRespJSON.code == 200)
                        {
                            log.debug('SUCCESSFUL RECORD UPDATE', JSON.stringify(accountPushRespJSON));
                            var respBody = JSON.parse(accountPushRespJSON.body);
                            var admID = respBody.id;

                            custRec.setValue({
                                fieldId: 'custentity_aux_administrate_sid',
                                value : admID.toString(),
                                ignoreFieldChange : true
                            });

                            custRec.save();
                            var percentage = (i * 100) / CRS.length;
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
                                break;
                            }

                            for(var values in account)
                            {
                                delete account[values];
                            }
                            for (var vals in customField)
                            {
                                delete customField[vals];
                            }
                        }
                        else
                        {
                            log.debug('ERROR', 'Oops. Something went wrong. Contact Audaxium.');
                            log.debug('ERROR', JSON.stringify(accountPushRespJSON));
                        }
                    }
                }
                catch (error)
                {
                    log.debug('ERROR', 'ERROR OCCURED, ITERATION: ' + i + 'RECORD ID: ' + custRec.id);
                }
            }
        }
    }

    function syncAccounts(isNew, CUS, record, username, password)
    {
        if(isNew == false && CUS)
        {
            if(CUS)
            {
                try
                {
                    for(var i = 0; i < CUS.length; i+=1)
                    {
                        var custRec = record.load({
                            type: record.Type.CUSTOMER,
                            id : CUS[i].getValue({ name: 'internalid' })
                        });

                        var admID = CUS[i].getValue({ name : 'custentity_aux_administrate_sid' });
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
                        customField["field_7"]                  = custRec.getText({ fieldId: 'entitystatus '});
                        account["is_customer"]                  = true;
                        account["custom_fields"]                = customField;
                        account["company_id"]                   = 1;

                        var apiPath = '';

                        var auth     = lib.authorization(username, password);
                        var section  = lib.sectionPath("crm");
                        var recType   = lib.recordPath("accounts");

                        apiPath = section + recType;

                        var accountUpdateResp = lib.processPutRequest(apiPath, auth, JSON.stringify(account), admID);
                        if(accountUpdateResp.code != 200)
                        {
                            log.debug('ERROR', 'Something failed in the request');
                            log.debug('ERROR', JSON.stringify(accountUpdateResp));
                        }
                        log.debug('DEBUG', JSON.stringify(accountUpdateResp));

                        var percentage = (i * 100) / CUS.length;
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
                            break;
                        }
                    }
                }
                catch (error)
                {
                    log.debug('ERROR', 'ERROR OCCURED, ITERATION: ' + i + 'RECORD ID: ' + custRec.id);
                }

            }
        }
    }


    return {
        execute: execute
    };
});
