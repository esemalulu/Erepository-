/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', '/SuiteScripts/AUX_pardot_lib', 'N/record', 'N/format'],

function(search, pardotlib, record, format) {

    function execute(scriptContext)
    {
    	var sf = [
			          ["custrecord_pi_config_key","isnotempty",""],
			          "AND",
			          ["custrecord_pi_config_email","isnotempty",""],
			          "AND",
			          ["custrecord_pi_config_pass","isnotempty",""],
			          "AND",
			          ["custrecord_pi_config_contact","is","T"],
			          "AND",
			          ["custrecord_pi_config_contact_sync","is","T"]
    	         ];

    	var sc = [
		          	  search.createColumn({ name : 'custrecord_pi_config_key'   }),
		          	  search.createColumn({ name : 'custrecord_pi_config_email' }),
		          	  search.createColumn({ name : 'custrecord_pi_config_pass'  })
    	         ];

    	var configSearch = search.create({
    		type: 'customrecord_pi_config',
    		filters: sf,
    		columns: sc
    	});

    	var cRS = configSearch.run().getRange({
    		start: 0,
    		end: 1000
    	});

    	if(cRS)
    	{
    		try
    		{
    			var value;
				//ASSUME THERE IS ONE CONFIG RECORD
				var user_key          = cRS[0].getValue({ name : 'custrecord_pi_config_key'});
				var email             = cRS[0].getValue({ name : 'custrecord_pi_config_email'});
				var pass              = cRS[0].getValue({ name : 'custrecord_pi_config_pass'});

					value = "login";
				var connectionResponse = pardotlib.login(value, email, pass, user_key);
				var respBody           = JSON.parse(connectionResponse.body);
				var api_key            = respBody.api_key;

				//GENERATE JAVASCRIPT DATE OBJECT
				var date = new Date();

				//GENERATE DATE FORMAT ACCEPTED BY PARDOT
				var executionDate = date.getFullYear() + '-' + pardotlib.month(date) + '-' + pardotlib.day(date) + ' ' + date.getHours() + ':' + pardotlib.minutes(date)+ ':' + pardotlib.seconds(date);

				// GENERATE REQUEST TO PULL UPDATED RECORDS FROM PARDOT.
				var payload = "api_key=" + api_key + "&user_key=" + user_key + "&created_after=" + encodeURIComponent(executionDate) + "&format=json";


				// SEND THE REQUEST TO RETRIEVE UPDATED RECORDS FROM PARDOT.
				value = "prospects";
				var updateResponse = pardotlib.updateProspect(value, api_key, user_key, payload);
				var updateResponseBody = JSON.parse(updateResponse.body);
                var numOfRecords = updateResponseBody.result.total_results;
                for (var i = 0; i < numOfRecords; i+=1)
                {
                var prospectValues = updateResponseBody.result.prospect[i];

                if(prospectValues)
                {

                    var leadRec = record.create({
                        type : record.Type.LEAD,
                        isDynamic : false
                    });

                    if(prospectValues.id)         { var pardotID = prospectValues.id;          }
                    if(prospectValues.first_name) { var firstname = prospectValues.first_name; }
                    if(prospectValues.last_name)  { var lastname = prospectValues.last_name;   }
                    if(prospectValues.company)    { var companyname = prospectValues.company;  }
                    if(prospectValues.email)      { var email = prospectValues.email;          }
                    if(prospectValues.phone)      { var phone = prospectValues.phone;          }
                    if(prospectValues.score)      { var score = prospectValues.score;          }
                    var status = 'LEAD-Priority Call';
                    //if(prospectValues > 1)
                    //{

                            //var searchResult = search.global({keywords: email });

                            //if(searchResult.length == 0)
                            //{
                                leadRec.setValue({fieldId: 'isperson', value : 'T'});
                                if(firstname != undefined) { leadRec.setValue({fieldId: 'firstname', value : firstname }); }
                                if(lastname != undefined) { leadRec.setValue({fieldId: 'lastname', value : lastname }); }
                                if(companyname != undefined) { leadRec.setValue({fieldId: 'companyname', value : companyname });}
                                if(email != undefined) { leadRec.setValue({fieldId: 'email', value : email }); }
                                if(phone != undefined) { leadRec.setValue({fieldId: 'phone', value : phone }); }
                                if(status != undefined) { leadRec.setText({fieldId: 'entitystatus', text : status }); }
                                if(score != undefined) { leadRec.setText({fieldId: 'custentitypi_score', text : score});}
                                leadRec.setValue({fieldId: 'salesrep', value : -5 });
                                if(pardotID != undefined) { leadRec.setText({fieldId: 'custentitypi_url', text: 'http://pi.pardot.com/prospect/read?id=' + pardotID}); }


                                var recID = leadRec.save({ignoreMandatoryFields: true});
                                log.debug(recID);
                            /*}
                            else
                            {
                                var queueRecord = record.create({
                                    type : 'customrecord_pi_queue',
                                    isDynamic : true
                                });

                                var timeStamp = format.format({
                                    value: new Date(),
                                    type: format.Type.DATETIMETZ
                                });

                                var dt = pardotlib.dateParser(timeStamp);

                                var syncLog = 'QUEUE RECORD CREATED > NEW PROSPECT FOUND IN PARDOT > ATTEMPTED SYNC TO NETSUITE > DUPLICATE DETECTED > UPDATE REQUIRED';

                                queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : searchResult[i].id.toString()});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                                queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'PENDING'});
                                queueRecord.setText({ fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                                queueRecord.setValue({ fieldId : 'custrecord_pi_queue_date', value : dt});

                                queueRecord.save();


                            }*/
                        /*}
                    }
                    else
                    {
                        //var searchResult = search.global({keywords: email });

                        //if(searchResult.length == 0)
                        //{
                            leadRec.setValue({fieldId: 'isperson', value : 'T'});
                            if(firstname != undefined) { leadRec.setValue({fieldId: 'firstname', value : firstname }); }
                            if(lastname != undefined) { leadRec.setValue({fieldId: 'lastname', value : lastname }); }
                            if(companyname != undefined) { leadRec.setValue({fieldId: 'companyname', value : companyname });}
                            if(email != undefined) { leadRec.setValue({fieldId: 'email', value : email }); }
                            if(phone != undefined) { leadRec.setValue({fieldId: 'phone', value : phone }); }
                            if(status != undefined) { leadRec.setText({fieldId: 'entitystatus', text : status }); }
                            if(score != undefined) { leadRec.setText({fieldId: 'custentitypi_score', text : score});}
                            leadRec.setValue({fieldId: 'salesrep', value : -5 });
                            if(pardotID != undefined) { leadRec.setText({fieldId: 'custentitypi_url', text: 'http://pi.pardot.com/prospect/read?id=' + pardotID}); }


                            var recID = leadRec.save({ignoreMandatoryFields: true});
                            log.debug(recID);
                        /*}
                        else
                        {
                            var queueRecord = record.create({
                                type : 'customrecord_pi_queue',
                                isDynamic : true
                            });

                            var timeStamp = format.format({
                                value: new Date(),
                                type: format.Type.DATETIMETZ
                            });

                            var dt = pardotlib.dateParser(timeStamp);

                            var syncLog = 'QUEUE RECORD CREATED > NEW PROSPECT FOUND IN PARDOT > ATTEMPTED SYNC TO NETSUITE > DUPLICATE DETECTED > UPDATE REQUIRED';

                            queueRecord.setValue({fieldId : 'custrecord_pi_queue_recid', value : searchResult[0].id.toString()});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_rectype', text : 'Prospects'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_type', text: 'NORMAL'});
                            queueRecord.setText({fieldId : 'custrecord_pi_queue_sync_status', text: 'PENDING'});
                            queueRecord.setText({ fieldId : 'custrecord_pi_queue_sync_log', text : syncLog});
                            queueRecord.setValue({ fieldId : 'custrecord_pi_queue_date', value : dt});

                            queueRecord.save();


                        }*/
                    }





                    //crm_lead_fid
                    //crm_contact_fid
                    //crm_owner_fid
                    //crm_account_fid
                }


            }
            catch (configErr)
            {
                log.debug(configErr);
            }
        }
    }

    return {
        execute: execute
    };

});
