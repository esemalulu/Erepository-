/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/format', 'N/task'],
/**
 * @param {email} email
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(email, record, runtime, search, format, task) {
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
	//Initialize Variables
    var client_code = '';
    var subgroup = '';
    var month_end_utc = '';
	
	var dbt_active_quantity= 0;
	var dbt_active_quantity_bundle = 0;
	var dbt_active_rate = 0.0;
	var dbt_active_price = 0.0;
	var dbt_upfront_quantity = 0;
	var dbt_upfront_rate = 0.0;
	var dbt_upfront_price = 0.0;
	var dbt_repl_quantity = 0;
	var dbt_repl_rate = 0.0;
	var dbt_repl_price = 0.0;
	var dbt_earlyterm_quantity = 0;
	var dbt_earlyterm_rate = 0.0;
	var dbt_earlyterm_price = 0.0;
	var dbt_admin_rate = 0.0; 
	var dbt_admin_price = 0.0;
	var bundle_admin_price = 0.0;

	var htn_active_quantity = 0;
	var htn_active_quantity_bundle = 0;
	var htn_active_rate = 0.0;  
	var htn_active_price = 0.0; 
	var htn_upfront_quantity = 0;
	var htn_upfront_rate = 0.0;
	var htn_upfront_price = 0.0;
	var htn_repl_quantity = 0;
	var htn_repl_rate = 0.0;
	var htn_repl_price = 0.0;
	var htn_earlyterm_quantity = 0;
	var htn_earlyterm_rate = 0.0;
	var htn_earlyterm_price = 0.0;
	var htn_admin_rate = 0.0;
	var htn_admin_price = 0.0;
	
	var wm_active_quantity = 0;
	var wm_active_quantity_bundle = 0;
	var wm_active_rate = 0.0;  
	var wm_active_price = 0.0; 
	var wm_repl_quantity = 0;
	var wm_repl_rate = 0.0;
	var wm_repl_price = 0.0;
	var wm_earlyterm_quantity = 0;
	var wm_earlyterm_rate = 0.0;
	var wm_earlyterm_price = 0.0;
	var wm_admin_rate = 0.0;
	var wm_admin_price = 0.0;
	
	var pd_active_quantity = 0;
	var pd_active_quantity_bundle = 0;
	var pd_active_rate = 0.0;  
	var pd_active_price = 0.0; 
	var pd_earlyterm_quantity = 0;
	var pd_earlyterm_rate = 0.0;
	var pd_earlyterm_price = 0.0;
	var pd_admin_rate = 0.0;
	var pd_admin_price = 0.0;
	
	var bundle_disc_rate = 0.0;  
	var bundle_disc_quantity = 0;
	var bundle_disc_price = 0.0;  
	
	var comb_htn_dbt_quantity = 0;
	var comb_htn_dbt_rate = 0.0; 
	var comb_htn_dbt_price = 0.0; 
	
	var comb_wm_dbt_quantity = 0;
	var comb_wm_dbt_rate = 0.0; 		
	var comb_wm_dbt_price = 0.0; 
	
	var comb_pd_dbt_quantity = 0;
	var comb_pd_dbt_rate = 0.0; 		
	var comb_pd_dbt_price = 0.0; 
		
	var comb_pd_htn_quantity = 0;
	var comb_pd_htn_rate = 0.0; 		
	var comb_pd_htn_price

	var comb_wm_pd_quantity = 0;
	var comb_wm_pd_rate = 0.0; 		
	var comb_wm_pd_price
		
	var comb_wm_htn_quantity = 0;
	var comb_wm_htn_rate = 0.0; 
	var comb_wm_htn_price = 0.0; 

	var comb_wm_htn_dbt_quantity = 0;
	var comb_wm_htn_dbt_rate = 0.0; 
	var comb_wm_htn_dbt_price = 0.0; 

	var comb_pd_htn_dbt_quantity = 0;
	var comb_pd_htn_dbt_rate = 0.0; 
	var comb_pd_htn_dbt_price = 0.0; 
	
	var comb_wm_pd_dbt_quantity = 0;
	var comb_wm_pd_dbt_rate = 0.0; 
	var comb_wm_pd_dbt_price = 0.0; 
	
	var comb_wm_pd_htn_quantity = 0;
	var comb_wm_pd_htn_rate = 0.0; 
	var comb_wm_pd_htn_price = 0.0; 
	
	var bundle_admin_rate = 0.0; 
	
	var total_bill_price = 0.0;
	
	var isRowProcessed = false;
	//var rsProcessedCount = 0;
	var bsRecordsCount = 0;
	
    function execute(scriptContext) {
    	log.debug({    
            title: 'execute', 
            details: 'Start execute function'
        });
    	/*if (scriptContext.type !== scriptContext.InvocationType.ON_DEMAND)
            return;*/
        
    	var currentClientCode = '';
    	var nextClientCode = '';
    	var currentSubgroup = '';    
    	var nextSubgroup = '';
    	var currentDate = ''; 
    	var nextDate = ''; 
    	var searchId = '';
    	var startDate = '';
    	var endDate = '';
    	var sameGroupRows = [];
    	var isLastGroup = false;
    	var rsProcessedCount = 0;
    	
    	
        try {   	
	    	searchId = runtime.getCurrentScript().getParameter("custscript_process_rs_searchid");
	    	startDate = runtime.getCurrentScript().getParameter("custscript_process_rs_start_date");
	    	endDate = runtime.getCurrentScript().getParameter("custscript_process_rs_end_date");
	        //searchId = 'customsearch_rs_billing_table';
     
        	if(!searchId || !startDate || !endDate){
            	log.debug({title: 'execute', details: 'Missing required script parameters: SEARCH ID or START DATE or END DATE'});
            }            
            var formattedStartDate = format.format({
                value: startDate,
                type: format.Type.DATE
            });
            var formattedEndDate = format.format({
                value: endDate,
                type: format.Type.DATE
            });
            
            var filtersJSON = {
            		'custrecord_rs_month_start_utc': formattedStartDate,
            		'custrecord_rs_month_end_utc': formattedEndDate,
            		'custrecord_rs_processed': false
            };
            
            //var searchColumns = [];
            
            var results = getAllResults(null,searchId,filtersJSON,null);
                        
            //log.debug('results length = '+results.length);
            
            for(var i=0;i<results.length;i++){
            	rsProcessedCount++;
            	log.debug({title: 'execute', details: 'rsProcessedCount = '+rsProcessedCount});
            	currentClientCode = results[i].getValue('custrecord_rs_client_code');
            	currentSubgroup = results[i].getValue('custrecord_rs_subgroup');
            	currentDate = results[i].getValue('custrecord_rs_month_end_utc');
            	if(results[i+1]){
            		nextClientCode = results[i+1].getValue('custrecord_rs_client_code');
            	   	nextSubgroup = results[i+1].getValue('custrecord_rs_subgroup');
            	   	nextDate = results[i+1].getValue('custrecord_rs_month_end_utc');
            	}
            	
            	/*log.debug({title: 'execute', details: 'Record ID = '+results[i].id});
            	log.debug({title: 'execute', details: 'currentClientCode = '+currentClientCode});
            	log.debug({title: 'execute', details: 'nextClientCode = '+nextClientCode});
            	log.debug({title: 'execute', details: 'currentSubgroup = '+currentSubgroup});
            	log.debug({title: 'execute', details: 'nextSubgroup = '+nextSubgroup});
            	log.debug({title: 'execute', details: 'currentDate = '+currentDate});
            	log.debug({title: 'execute', details: 'nextDate = '+nextDate});
            	log.debug({title: 'execute', details: 'nextSubgroup = '+nextSubgroup});*/
            	
            	if(!currentSubgroup)
            		currentSubgroup = currentClientCode;
            	//log.debug({title: 'execute', details: 'currentSubgroup = '+currentSubgroup});
            	if(!nextSubgroup)
            		nextSubgroup = nextClientCode;
            	//log.debug({title: 'execute', details: 'nextSubgroup = '+nextSubgroup});
            	
            	if(currentClientCode == nextClientCode && currentSubgroup == nextSubgroup && currentDate == nextDate){
            		sameGroupRows.push(results[i].id);
            		if(results[i+1])
            			sameGroupRows.push(results[i+1].id);
            		else
            			isLastGroup = true;            		
            		//log.debug({title: 'execute', details: 'IF sameGroupRows = '+sameGroupRows});
            	}
            	else
            	{
            		if(sameGroupRows.length == 0){
            			sameGroupRows.push(results[i].id);
            		}
            		sameGroupRows = sameGroupRows.getUnique();
            		//log.debug({title: 'execute', details: 'ELSE sameGroupRows = '+sameGroupRows});
            		calculateData(scriptContext, sameGroupRows);
            		createBillingSummary2Record();
                	resetVariables();
            		sameGroupRows = [];
            		
            		if(rsProcessedCount >= 300){
            			log.debug({title: 'execute', details: 'rsProcessedCount = '+ rsProcessedCount});
            			log.debug({title: 'execute', details: 'Reached processing limit. Rescheduling...'});
            			log.debug({title: 'execute', details: 'Remaining Usage Points = ' + runtime.getCurrentScript().getRemainingUsage()});
            			var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
	                	scriptTask.scriptId = runtime.getCurrentScript().id;
	                	//scriptTask.deploymentId = 'customdeploy1';
	                	//scriptTask.params = {searchId: 'custsearch_456'};
	                	var scriptTaskId = scriptTask.submit();
	                	var taskStatus = task.checkStatus(scriptTaskId);
	                	
	                	log.debug({
	                    	title: 'execute',
	                        details: 'Rescheduling Staus:' + taskStatus.status
	                    });
            			break;
            		}
            	}
            	
            	if(isLastGroup){
            		sameGroupRows = sameGroupRows.getUnique();
            		//log.debug({title: 'execute', details: 'LAST GROUP sameGroupRows = ' + sameGroupRows});
            		calculateData(scriptContext, sameGroupRows);
            		createBillingSummary2Record();
                	resetVariables();
            		sameGroupRows = [];            		
            	}            	
            }
            
            //Send the summary email at the end
           /* var emailSubject = 'RedShift Table processing completed for the month: ' + startDate ' - ' + endDate;
            var emailAuthorId = 3;
            var emailRecipientEmail = 'anil.sharma@livongo.com';
            var emailBody = 'RedShift Table processing completed for the month: ' + startDate ' - ' + endDate + '.'
            				+ '/nTotal Billing Summary Records Created = ' + bsRecordsCount 
            				+ '/nTotal RedShift Processed Summary Records Created = ' + (results - rsProcessedCount);
            
            email.send({
                author: emailAuthorId,
                recipients: emailRecipientEmail,
                subject: emailSubject,
                body: emailBody
            });*/
            
        } catch (e) {
			markRSTableRecordsFailed(e);
			//Rescheduling
			log.debug({title: 'execute', details: 'rsProcessedCount = '+ rsProcessedCount});
			log.debug({title: 'execute', details: 'Error Details = ' + JSON.stringify(e)});
			log.debug({title: 'execute', details: 'Rescheduling...'});
			log.debug({title: 'execute', details: 'Remaining Usage Points = ' + runtime.getCurrentScript().getRemainingUsage()});
			var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
			scriptTask.scriptId = runtime.getCurrentScript().id;
			//scriptTask.deploymentId = 'customdeploy1';
			//scriptTask.params = {searchId: 'custsearch_456'};
			var scriptTaskId = scriptTask.submit();
			var taskStatus = task.checkStatus(scriptTaskId);
			
			log.debug({
				title: 'execute',
				details: 'Rescheduling Staus:' + taskStatus.status
			});
			
            /*var subject = 'Error occured while processing Billing Summary Data.';
            var authorId = 3;
            var recipientEmail = 'anil.sharma@livongo.com';
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: subject,
                body: 'Error occured while processing Billing Summary Data: \n' + runtime.getCurrentScript().id + '\n\n' + JSON.stringify(e)
            });*/
        }
        log.debug({    
            title: 'execute', 
            details: 'End execute function'
        });
    }
    
    function calculateData(scriptContext, recIds){  	
    	log.debug({title: 'calculateData', details: 'START'});
    	log.debug({title: 'calculateData', details: 'recIds = '+recIds});
    	var rsRec = null;
    	var rsRecId = null;
    	//try{
	    	for(var j=0;j<recIds.length;j++){
	    		isRowProcessed = false;
	    		rsRecId = recIds[j];
		    	rsRec = record.load({
		    	    type: 'customrecord_rs_billing_table',
		 	       id: rsRecId,
		 	       isDynamic: true                       
		    	});
		    	
		    	var rs_month_start_utc = 		rsRec.getValue({ fieldId: 'custrecord_rs_month_start_utc' });
		    	var rs_month_end_utc =			rsRec.getValue({ fieldId: 'custrecord_rs_month_end_utc' });
		    	var rs_client_code = 			rsRec.getValue({ fieldId: 'custrecord_rs_client_code' });
		    	var rs_subgroup = 				rsRec.getValue({ fieldId: 'custrecord_rs_subgroup' });
		    	var rs_sku = 					rsRec.getValue({ fieldId: 'custrecord_rs_sku' });
		    	var rs_quantity = 				rsRec.getValue({ fieldId: 'custrecord_rs_quantity' });
		    	var rs_rate = 					rsRec.getValue({ fieldId: 'custrecord_rs_rate' });
		    	var rs_price = 					rsRec.getValue({ fieldId: 'custrecord_rs_price' });
		    	var rs_device_replacement = 	rsRec.getValue({ fieldId: 'custrecord_rs_device_replacement' });
		    	var rs_upfront = 				rsRec.getValue({ fieldId: 'custrecord_rs_upfront' });
		    	var rs_dbt =					rsRec.getValue({ fieldId: 'custrecord_rs_dbt' });
		    	var rs_htn = 					rsRec.getValue({ fieldId: 'custrecord_rs_htn' });
		    	var rs_wm = 					rsRec.getValue({ fieldId: 'custrecord_rs_wm' });
		    	var rs_pd = 					rsRec.getValue({ fieldId: 'custrecord_rs_pd' });
		    	var rs_bh = 					rsRec.getValue({ fieldId: 'custrecord_rs_bh' });
		    	var rs_dbt_ptm = 				rsRec.getValue({ fieldId: 'custrecord_rs_dbt_ptm' });
		    	var rs_htn_ptm = 				rsRec.getValue({ fieldId: 'custrecord_rs_htn_ptm' });
		    	var rs_wm_ptm = 				rsRec.getValue({ fieldId: 'custrecord_rs_wm_ptm' });
		    	var rs_pd_ptm = 				rsRec.getValue({ fieldId: 'custrecord_rs_pd_ptm' });
		    	var rs_bh_ptm = 				rsRec.getValue({ fieldId: 'custrecord_rs_bh_ptm' });
		    	var rs_pepm = 					rsRec.getValue({ fieldId: 'custrecord_rs_pepm' });
		
		    	/*log.debug('rs_month_start_utc = ' + rs_month_start_utc);
		    	log.debug('rs_month_end_utc = ' + rs_month_end_utc);
		    	log.debug('rs_client_code = ' + rs_client_code);
		    	log.debug('rs_subgroup = ' + rs_subgroup);
		    	log.debug('rs_sku = ' + rs_sku);
		    	log.debug('rs_quantity = ' + rs_quantity);
		    	log.debug('rs_rate = ' + rs_rate);
		    	log.debug('rs_price = ' + rs_price);
		    	log.debug('rs_device_replacement = ' + rs_device_replacement);
		    	log.debug('rs_upfront = ' + rs_upfront);
		    	log.debug('rs_dbt = ' + rs_dbt);
		    	log.debug('rs_htn = ' + rs_htn);
		    	log.debug('rs_wm = ' + rs_wm);
		    	log.debug('rs_pd = ' + rs_pd);
		    	log.debug('rs_bh = ' + rs_bh);
		    	log.debug('rs_dbt_ptm = ' + rs_dbt_ptm);
		    	log.debug('rs_htn_ptm = ' + rs_htn_ptm);
		    	log.debug('rs_wm_ptm = ' + rs_wm_ptm);
		    	log.debug('rs_pd_ptm = ' + rs_pd_ptm);
		    	log.debug('rs_bh_ptm = ' + rs_bh_ptm);
		    	log.debug('rs_pepm = ' + rs_pepm);*/
		    	
		    	client_code = rs_client_code;
		        subgroup = rs_subgroup;
		        month_end_utc = rs_month_end_utc;
		    	
		    	
		    	var formattedStartDateString = format.format({
		            value: rs_month_start_utc,
		            type: format.Type.DATE
		        });
		    	var formattedEndDateString = format.format({
		            value: rs_month_end_utc,
		            type: format.Type.DATE
		        });
		    	
		    	var uniqueDateClientSubgroupValue = formattedEndDateString + rs_client_code + rs_subgroup;
		    	/*log.debug({    
		            title: 'calculateData', 
		            details: 'uniqueDateClientSubgroupValue = ' + uniqueDateClientSubgroupValue
		        });*/
		
		    	/******DIABETES******/
		    	//Diabetes
		    	if(rs_sku == 'dbt_pppm'){
		    		//log.debug('dbt_pppm');
		    		dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    		dbt_active_rate = rs_rate;
		    		dbt_earlyterm_rate = rs_rate;
		    		//dbt_active_price = (dbt_active_quantity + rs_quantity) * rs_rate;
		    		dbt_active_price = dbt_active_quantity * rs_rate;
		    		dbt_earlyterm_price = dbt_earlyterm_quantity * rs_rate;
		    		isRowProcessed = true;
		    	}
		    	//Diabetes upfront
		    	if(rs_sku == 'dbt_upfront'){
		    		//log.debug('dbt_upfront');
		    		dbt_upfront_quantity = dbt_upfront_quantity + rs_quantity;
		    		dbt_upfront_rate = rs_rate;
		    		dbt_upfront_price = dbt_upfront_price + rs_price;
		    		isRowProcessed = true;
		    	}
		    	//Diabetes Replacement
		    	if(rs_sku == 'bg300_replacement'){
		    		//log.debug('bg300_replacement');
		    		dbt_repl_quantity = dbt_repl_quantity + rs_quantity,
					dbt_repl_rate = rs_rate,
					dbt_repl_price = dbt_repl_price + rs_price
					isRowProcessed = true;
		    	}
				//Diabetes Early terms
		    	if(rs_sku == 'dbtptm_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
		    		dbt_earlyterm_rate = rs_rate;
		    		//dbt_earlyterm_price = (dbt_earlyterm_price + rs_quantity) * rs_rate;
		    		dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    	}
		    	//Diabetese Admin referral fee
		    	if(rs_sku == 'dbt_referral_fee'){
		    		//log.debug('dbt_referral_fee');
		    		dbt_admin_rate = rs_rate;
		    		dbt_admin_price = dbt_admin_rate + rs_price;
		    		bundle_admin_price = bundle_admin_price + rs_price;
		    		isRowProcessed = true;
		    	}
		    	
		    	/******HYPERTENSION******/
		    	//Hypertension
		    	if(rs_sku == 'htn_pppm'){
		    		//log.debug('htn_pppm');
		    		htn_active_quantity = htn_active_quantity + rs_quantity;
		    		htn_active_rate = rs_rate;
		    		htn_earlyterm_rate = rs_rate;
		    		//htn_active_price = (htn_active_quantity + rs_quantity) * rs_rate;
		    		htn_active_price = htn_active_quantity * rs_rate;
		    		htn_earlyterm_price = htn_earlyterm_quantity * rs_rate;
		    		isRowProcessed = true;
		    	}	
		    	//Hypertension upfront
		    	if(rs_sku == 'htn_upfront'){
		    		//log.debug('htn_upfront');
		    		htn_upfront_quantity = htn_upfront_quantity + rs_quantity;
					htn_upfront_rate = rs_rate;
					htn_upfront_price = htn_upfront_price + rs_price;
					isRowProcessed = true;
		    	}	
		    	//Hypertension Replacement
		    	if(rs_sku == 'htn_replacement'){
		    		//log.debug('htn_replacement');
		    		htn_repl_quantity = htn_repl_quantity + rs_quantity;
					htn_repl_rate = rs_rate;
					htn_repl_price = htn_repl_price + rs_price;
					isRowProcessed = true;
		    	}	
		    	//Hypertension Early terms
		    	if(rs_sku == 'htnptm_pppm'){
		    		//log.debug('htnptm_pppm');
		    		htn_earlyterm_quantity = htn_earlyterm_quantity + rs_quantity;
					htn_earlyterm_rate = rs_rate;
					//htn_earlyterm_price = (htn_earlyterm_quantity + rs_quantity) * rs_rate;
					htn_earlyterm_price = htn_earlyterm_quantity * rs_rate;
					isRowProcessed = true;
		    	}	
		    	//Hypertension Admin referral fee
		    	if(rs_sku == 'htn_referral_fee'){
		    		//log.debug('htn_referral_fee');
		    		htn_admin_rate = rs_rate;
					htn_admin_price = (htn_admin_price + rs_price);
					bundle_admin_price = bundle_admin_price + rs_price;
					isRowProcessed = true;
		    	}	
		    	
		    	/******WEIGHT MANAGEMENT*****/
		    	//WeightManagment
		    	if(rs_sku == 'wm_pppm'){
		    		//log.debug('wm_pppm');
		    		wm_active_quantity = wm_active_quantity + rs_quantity;
					wm_active_rate = rs_rate;
					wm_earlyterm_rate = rs_rate;
					//wm_active_price = (wm_active_quantity + rs_quantity) * rs_rate;
					wm_active_price = wm_active_quantity * rs_rate;
					wm_earlyterm_price = wm_earlyterm_quantity * rs_rate;
					isRowProcessed = true;
		    	}	
		    	//WeightManagment Replacement
		    	if(rs_sku == 'scale_replacement'){
		    		//log.debug('scale_replacement');
		    		wm_repl_quantity = wm_repl_quantity + rs_quantity;
					wm_repl_rate = rs_rate;
					wm_repl_price = wm_repl_price + rs_price;
					isRowProcessed = true;
		    	}	
		    	//WeightManagment Early terms
		    	if(rs_sku == 'wmptm_pppm'){
		    		//log.debug('wmptm_pppm');
		    		wm_earlyterm_quantity = wm_earlyterm_quantity + rs_quantity;
					wm_earlyterm_rate = rs_rate;
					//wm_earlyterm_price = (wm_earlyterm_quantity + rs_quantity) * rs_rate;
					wm_earlyterm_price = wm_earlyterm_quantity * rs_rate;
					isRowProcessed = true;
		    	}	
		    	//WeightManagment Admin referral fee
		    	if(rs_sku == 'wm_referral_fee'){
		    		//log.debug('wm_referral_fee');
		    		wm_admin_rate = rs_rate;
					wm_admin_price = wm_admin_price + rs_price;
					bundle_admin_price = bundle_admin_price + rs_price;
					isRowProcessed = true;
		    	}	
		    	
		    	/******PREDIABETES*****/
		    	//Prediabetes
		    	if(rs_sku == 'pd_pppm'){
		    		//log.debug('pd_pppm');
		    		pd_active_quantity = pd_active_quantity + rs_quantity;
					pd_active_rate = rs_rate;
					pd_earlyterm_rate = rs_rate;
					//pd_active_price = (pd_active_quantity + rs_quantity) * rs_rate;
					pd_active_price = pd_active_quantity * rs_rate;
					pd_earlyterm_price = pd_earlyterm_quantity * rs_rate;
					isRowProcessed = true;
		    	}	
		    	//Prediabetes Early terms
		    	if(rs_sku == 'pdptm_pppm'){
		    		//log.debug('pdptm_pppm');
		    		pd_earlyterm_quantity = pd_earlyterm_quantity + rs_quantity;
					pd_earlyterm_rate = rs_rate;
					//pd_earlyterm_price = (pd_earlyterm_quantity + rs_quantity)* rs_rate;
					pd_earlyterm_price = pd_earlyterm_price * rs_rate;
					isRowProcessed = true;
		    	}	
		    	//Prediabetes Admin referral fee
		    	if(rs_sku == 'pd_referral_fee'){
		    		//log.debug('pd_referral_fee');
		    		pd_admin_rate = rs_rate;
					pd_admin_price = (pd_admin_price + rs_price);
					bundle_admin_price = bundle_admin_price + rs_price;
					isRowProcessed = true;
		    	}	        	
		    	
		    	/******BUNDLES*****/
		    	if(rs_sku.match(/bundle_discount/g)){
		    		//log.debug('bundle_discount');
		    		bundle_disc_rate = rs_rate; 
					bundle_disc_quantity = bundle_disc_quantity + rs_quantity;
					bundle_disc_price = bundle_disc_price + rs_price;
					isRowProcessed = true;
		    	}
		    	        	
		    	//HTN - DBT
		    	if(rs_sku == 'htn_dbt_pppm' || rs_sku == 'htnptm_dbt_pppm' || rs_sku == 'htn_dbtptm_pppm' || rs_sku == 'htnptm_dbtptm_pppm'){
		    		//log.debug('HTN - DBT');
		    		comb_htn_dbt_rate = rs_rate;
					comb_htn_dbt_quantity = comb_htn_dbt_quantity + rs_quantity;
					comb_htn_dbt_price = comb_htn_dbt_price + rs_price;
					isRowProcessed = true;
					
		    		if(rs_htn == 1){
		    			//log.debug('rs_htn == 1');
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
		    			if (htn_active_rate == 0.0)
	    				{
		    				if (rs_dbt == 1)
	    					{
	    						htn_active_rate = comb_htn_dbt_rate - dbt_active_rate;
	    					}
		    			}
						htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
		    		}
		    		if(rs_htn_ptm == 1){
		    			//log.debug('rs_htn_ptm == 1');
		    			htn_earlyterm_quantity = htn_earlyterm_quantity + rs_quantity;
						htn_earlyterm_price = htn_earlyterm_price + (rs_quantity*htn_earlyterm_rate);
		    		}
		    		if(rs_dbt == 1){
		    			//log.debug('rs_dbt == 1');
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
		    			if (dbt_active_rate == 0.0)
	    				{
		    				if (rs_htn == 1)
	    					{
	    						dbt_active_rate = comb_htn_dbt_rate - htn_active_rate;
	    					}
		    			}
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_dbt_ptm == 1){
		    			//log.debug('rs_dbt_ptm == 1');
		    			dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
						dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity*dbt_earlyterm_rate);
		    		}
		    	}
		    	//WM - DBT
		    	if(rs_sku == 'wm_dbt_pppm' || rs_sku == 'wmptm_dbt_pppm' || rs_sku == 'wm_dbtptm_pppm' || rs_sku == 'wmptm_dbtptm_pppm'){
		    		//log.debug('WM - DBT');
		    		comb_wm_dbt_rate = rs_rate;
					comb_wm_dbt_quantity = comb_wm_dbt_quantity + rs_quantity;
					comb_wm_dbt_price = comb_wm_dbt_price + rs_price;
					isRowProcessed = true;
					
		    		if(rs_wm == 1){
		    			//log.debug('rs_wm == 1');
		    			wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
		    			if (wm_active_rate == 0.0)
	    				{
		    				if (rs_dbt == 1)
	    					{
	    						wm_active_rate = comb_wm_dbt_rate - dbt_active_rate;
	    					}
		    			}
						wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
		    		}
		    		if(rs_wm_ptm == 1){
		    			//log.debug('rs_wm_ptm == 1');
		    			wm_earlyterm_quantity = wm_earlyterm_quantity + rs_quantity;
						wm_earlyterm_price = wm_earlyterm_price + (rs_quantity*wm_earlyterm_rate);
		    		}
		    		if(rs_dbt == 1){
		    			//log.debug('rs_dbt == 1');
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
		    			if (dbt_active_rate == 0.0)
	    				{
		    				if (rs_wm == 1)
	    					{
		    					dbt_active_rate = comb_wm_dbt_rate - wm_active_rate;
	    					}
		    			}
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_dbt_ptm == 1){
		    			//log.debug('rs_dbt_ptm == 1');
		    			dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
						dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity*dbt_earlyterm_rate);
		    		}
		    	}
		    	//PD - DBT
		    	if(rs_sku == 'pd_dbt_pppm' || rs_sku == 'pdptm_dbt_pppm' || rs_sku == 'pd_dbtptm_pppm' || rs_sku == 'pdptm_dbtptm_pppm'){
		    		//log.debug('PD - DBT');
		    		comb_htn_dbt_rate = rs_rate;
					comb_htn_dbt_quantity = comb_htn_dbt_quantity + rs_quantity;
					comb_htn_dbt_price = comb_htn_dbt_price + rs_price;
					isRowProcessed = true;
					
		    		if(rs_pd == 1){
		    			//log.debug('rs_pd == 1');
		    			pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
		    			if (pd_active_rate == 0.0)
	    				{
		    				if (rs_dbt == 1)
	    					{
		    					pd_active_rate = comb_pd_dbt_rate - dbt_active_rate;
	    					}
		    			}
						pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
		    		}
		    		if(rs_pd_ptm == 1){
		    			//log.debug('rs_pd_ptm == 1');
		    			pd_earlyterm_quantity = pd_earlyterm_quantity + rs_quantity;
						pd_earlyterm_price = pd_earlyterm_price + (rs_quantity*pd_earlyterm_rate);
		    		}
		    		if(rs_dbt == 1){
		    			//log.debug('rs_dbt == 1');
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
		    			if (dbt_active_rate == 0.0)
	    				{
		    				if (rs_pd == 1)
	    					{
		    					dbt_active_rate = comb_pd_dbt_rate - pd_active_rate;
	    					}
		    			}
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_dbt_ptm == 1){
		    			//log.debug('rs_dbt_ptm == 1');
		    			dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
						dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity*dbt_earlyterm_rate);
		    		}
		    	}
		    	//PD - HTN
		    	if(rs_sku == 'pd_htn_pppm' || rs_sku == 'pdptm_htn_pppm' || rs_sku == 'pd_htnptm_pppm' || rs_sku == 'pdptm_htnptm_pppm'){
		    		//log.debug('PD - HTN');
		    		comb_pd_htn_quantity = comb_pd_htn_quantity + rs_quantity;
					comb_pd_htn_rate = rs_rate;
					comb_pd_htn_price = comb_pd_htn_price + rs_price;
					isRowProcessed = true;
					
		    		if(rs_pd == 1){
		    			//log.debug('rs_pd == 1');
		    			pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
		    			if (pd_active_rate == 0.0)
	    				{
		    				if (rs_htn == 1)
	    					{
		    					pd_active_rate = comb_pd_htn_rate - htn_active_rate;
	    					}
		    			}
						pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
		    		}
		    		if(rs_pd_ptm == 1){
		    			//log.debug('rs_pd_ptm == 1');
		    			pd_earlyterm_quantity = pd_earlyterm_quantity + rs_quantity;
						pd_earlyterm_price = pd_earlyterm_price + (rs_quantity*pd_earlyterm_rate);
		    		}
		    		if(rs_htn == 1){
		    			//log.debug('rs_htn == 1');
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
		    			if (htn_active_rate == 0.0)
	    				{
		    				if (rs_pd == 1)
	    					{
		    					htn_active_rate = comb_pd_htn_rate - pd_active_rate;
	    					}
		    			}
						htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
		    		}
		    		if(rs_htn_ptm == 1){
		    			//log.debug('rs_htn_ptm == 1');
		    			htn_earlyterm_quantity = htn_earlyterm_quantity + rs_quantity;
						htn_earlyterm_price = htn_earlyterm_price + (rs_quantity*htn_earlyterm_rate);
		    		}
		    	}
		    	//WM - PD
		    	if(rs_sku == 'wm_pd_pppm' || rs_sku == 'wm_pdptm_pppm' || rs_sku == 'wmptm_pd_pppm' || rs_sku == 'wmptm_pdptm_pppm'){
		    		//log.debug('WM - PD');
		    		comb_wm_pd_quantity = comb_wm_pd_quantity + rs_quantity;
					comb_wm_pd_rate = comb_wm_pd_rate;
					comb_wm_pd_price = comb_wm_pd_price + rs_price;
					isRowProcessed = true;
					
		    		if(rs_wm == 1){
		    			//log.debug('rs_wm == 1');
		    			wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
		    			if (wm_active_rate == 0.0)
	    				{
		    				if (rs_pd == 1)
	    					{
		    					wm_active_rate = comb_wm_pd_rate - pd_active_rate;
	    					}
		    			}
						wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
		    		}
		    		if(rs_wm_ptm == 1){
		    			//log.debug('rs_wm_ptm == 1');
		    			wm_earlyterm_quantity = wm_earlyterm_quantity + rs_quantity;
						wm_earlyterm_price = wm_earlyterm_price + (rs_quantity*wm_earlyterm_rate);
		    		}
		    		if(rs_pd == 1){
		    			//log.debug('rs_pd == 1');
		    			pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
		    			if (pd_active_rate == 0.0)
	    				{
		    				if (rs_wm == 1)
	    					{
		    					pd_active_rate = comb_wm_pd_rate - wm_active_rate;
	    					}
		    			}
						pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
		    		}
		    		if(rs_pd_ptm == 1){
		    			//log.debug('rs_pd_ptm == 1');
		    			pd_earlyterm_quantity = pd_earlyterm_quantity + rs_quantity;
						pd_earlyterm_price = pd_earlyterm_price + (rs_quantity*pd_earlyterm_rate);
		    		}
		    	}
		    	//WM - HTN
		    	if(rs_sku == 'wm_htn_pppm' || rs_sku == 'wmptm_htn_pppm' || rs_sku == 'wm_htnptm_pppm' || rs_sku == 'wmptm_htnptm_pppm'){
		    		//log.debug('WM - HTN');
		    		comb_wm_htn_quantity = comb_wm_htn_quantity + rs_quantity;
					comb_wm_htn_rate = comb_wm_htn_rate;
					comb_wm_htn_price = comb_wm_htn_price + rs_price;
					isRowProcessed = true;
					
		    		if(rs_wm == 1){
		    			//log.debug('rs_wm == 1');
		    			wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
		    			if (wm_active_rate == 0.0)
	    				{
		    				if (rs_htn == 1)
	    					{
		    					wm_active_rate = comb_wm_htn_rate - htn_active_rate;
	    					}
		    			}
						wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
		    		}
		    		if(rs_wm_ptm == 1){
		    			//log.debug('rs_wm_ptm == 1');
		    			wm_earlyterm_quantity = wm_earlyterm_quantity + rs_quantity;
						wm_earlyterm_price = wm_earlyterm_price + (rs_quantity * wm_earlyterm_rate);
		    		}
		    		if(rs_htn == 1){
		    			//log.debug('rs_htn == 1');
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
		    			if (htn_active_rate == 0.0)
	    				{
		    				if (rs_wm == 1)
	    					{
		    					htn_active_rate = comb_wm_htn_rate - wm_active_rate;
	    					}
		    			}		    			
						htn_active_price = htn_active_price + (rs_quantity * htn_active_rate);
		    		}
		    		if(rs_htn_ptm == 1){
		    			//log.debug('rs_htn_ptm == 1');
		    			htn_earlyterm_quantity = htn_earlyterm_quantity + rs_quantity;		    			
						htn_earlyterm_price = htn_earlyterm_price + (rs_quantity*htn_earlyterm_rate);
		    		}
		    	}
		    	//WM - HTN - DBT
		    	if(rs_sku.match(/wm/g) && rs_sku.match(/htn/g) && rs_sku.match(/dbt/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('WM - HTN - DBT');
		    		comb_wm_htn_dbt_quantity = comb_wm_htn_dbt_quantity + rs_quantity;
					comb_wm_htn_dbt_rate = rs_rate;
					comb_wm_htn_dbt_price = comb_wm_htn_dbt_quantity + rs_price;
					isRowProcessed = true;
					
		    		if(rs_wm == 1){
		    			//log.debug('rs_wm == 1');
		    			wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
		    			if (wm_active_rate == 0.0)
	    				{
		    				if (rs_htn == 1 && rs_dbt == 1)
	    					{
		    					if(htn_active_rate > 0.0 && dbt_active_rate > 0.0){
		    						wm_active_rate = comb_wm_htn_dbt_rate - (htn_active_rate + dbt_active_rate);	
		    					}
	    					}
		    			}
						wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
		    		}
		    		if(rs_wm_ptm == 1){
		    			//log.debug('rs_wm_ptm == 1');
		    			wm_earlyterm_quantity = wm_earlyterm_quantity + rs_quantity;
						wm_earlyterm_price = wm_earlyterm_price + (rs_quantity*wm_earlyterm_rate);
		    		}
		    		if(rs_htn == 1){
		    			//log.debug('rs_htn == 1');
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
		    			if (htn_active_rate == 0.0)
	    				{
		    				if (rs_wm == 1 && rs_dbt == 1)
	    					{
		    					if(wm_active_rate > 0.0 && dbt_active_rate > 0.0)
		    					{
		    						htn_active_rate = comb_wm_htn_dbt_rate - (wm_active_rate + dbt_active_rate);
		    					}		    					
	    					}
		    			}
						htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
		    		}
		    		if(rs_htn_ptm == 1){
		    			//log.debug('rs_htn_ptm == 1');
		    			htn_earlyterm_quantity = htn_earlyterm_quantity + rs_quantity;
						htn_earlyterm_price = htn_earlyterm_price + (rs_quantity*htn_earlyterm_rate);
		    		}
		    		if(rs_dbt == 1){
		    			//log.debug('rs_dbt == 1');
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
		    			if (dbt_active_rate == 0.0)
	    				{
		    				if (rs_wm == 1 && rs_htn == 1)
	    					{
		    					if(wm_active_rate > 0.0 && htn_active_rate > 0.0)
		    					{
		    						dbt_active_rate = comb_wm_htn_dbt_rate - (wm_active_rate + htn_active_rate);	
		    					}	    					
	    					}
		    			}
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_dbt_ptm == 1){
		    			//log.debug('rs_dbt_ptm == 1');
		    			dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
						dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity*dbt_earlyterm_rate);
		    		}
		    	}
		    	//PD - HTN - DBT	
		    	if(rs_sku.match(/pd/g) && rs_sku.match(/htn/g) && rs_sku.match(/dbt/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('PD - HTN - DBT');
		    		comb_pd_htn_dbt_quantity = comb_pd_htn_dbt_quantity + rs_quantity;
					comb_pd_htn_dbt_rate = rs_rate;
					comb_pd_htn_dbt_price = comb_pd_htn_dbt_quantity + rs_price;
					isRowProcessed = true;
					
		    		if(rs_pd == 1){
		    			//log.debug('rs_pd == 1');
		    			pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
		    			if (pd_active_rate == 0.0)
	    				{
		    				if (rs_htn == 1 && rs_dbt == 1)
	    					{
		    					if(htn_active_rate > 0.0 && dbt_active_rate > 0.0){
		    						pd_active_rate = comb_pd_htn_dbt_rate - (htn_active_rate + dbt_active_rate);	
		    					}
	    					}
		    			}
						pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
		    		}
		    		if(rs_pd_ptm == 1){
		    			//log.debug('rs_pd_ptm == 1');
		    			pd_earlyterm_quantity = pd_earlyterm_quantity + rs_quantity;
						pd_earlyterm_price = pd_earlyterm_price + (rs_quantity*pd_earlyterm_rate);
		    		}
		    		if(rs_htn == 1){
		    			//log.debug('rs_htn == 1');
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
		    			if (htn_active_rate == 0.0)
	    				{
		    				if (rs_pd == 1 && rs_dbt == 1)
	    					{
		    					if(pd_active_rate > 0.0 && dbt_active_rate > 0.0)
		    					{
		    						htn_active_rate = comb_pd_htn_dbt_rate - (pd_active_rate + dbt_active_rate);
		    					}		    					
	    					}
		    			}
						htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
		    		}
		    		if(rs_htn_ptm == 1){
		    			//log.debug('rs_htn_ptm == 1');
		    			htn_earlyterm_quantity = htn_earlyterm_quantity + rs_quantity;
						htn_earlyterm_price = htn_earlyterm_price + (rs_quantity*htn_earlyterm_rate);
		    		}
		    		if(rs_dbt == 1){
		    			//log.debug('rs_dbt == 1');
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
		    			if (dbt_active_rate == 0.0)
	    				{
		    				if (rs_pd == 1 && rs_htn == 1)
	    					{
		    					if(pd_active_rate > 0.0 && htn_active_rate > 0.0)
		    					{
		    						dbt_active_rate = comb_pd_htn_dbt_rate - (pd_active_rate + htn_active_rate);	
		    					}	    					
	    					}
		    			}
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_dbt_ptm == 1){
		    			//log.debug('rs_dbt_ptm == 1');
		    			dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
						dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity*dbt_earlyterm_rate);
		    		}
		    	}
		    	//WM - PD - DBT
		    	if(rs_sku.match(/wm/g) && rs_sku.match(/pd/g) && rs_sku.match(/dbt/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('WM - PD - DBT');
		    		comb_wm_pd_dbt_quantity = comb_wm_pd_dbt_quantity + rs_quantity;
					comb_wm_pd_dbt_rate = rs_rate;
					comb_wm_pd_dbt_price = comb_wm_pd_dbt_price + rs_price;
					isRowProcessed = true;
					
		    		if(rs_wm == 1){
		    			//log.debug('rs_wm == 1');
		    			wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
						wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
		    		}
		    		if(rs_wm_ptm == 1){
		    			//log.debug('rs_wm_ptm == 1');
		    			wm_earlyterm_quantity = wm_earlyterm_quantity + rs_quantity;
						wm_earlyterm_price = wm_earlyterm_price + (rs_quantity*wm_earlyterm_rate);
		    		}
		    		if(rs_pd == 1){
		    			//log.debug('rs_pd == 1');
		    			pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
						pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
		    		}
		    		if(rs_pd_ptm == 1){
		    			//log.debug('rs_pd_ptm == 1');
		    			pd_earlyterm_quantity = pd_earlyterm_quantity + rs_quantity;
						pd_earlyterm_price = pd_earlyterm_price + (rs_quantity*pd_earlyterm_rate);
		    		}
		    		if(rs_dbt == 1){
		    			//log.debug('rs_dbt == 1');
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_dbt_ptm == 1){
		    			//log.debug('rs_dbt_ptm == 1');
		    			dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
						dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity*dbt_earlyterm_rate);
		    		}
		    	}
		    	//WM - PD - HTN
		    	if(rs_sku.match(/wm/g) && rs_sku.match(/pd/g) && rs_sku.match(/htn/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('WM - PD - HTN');
		    		comb_wm_pd_htn_quantity = comb_wm_pd_htn_quantity + rs_quantity;
					comb_wm_pd_htn_rate = rs_rate;
					comb_wm_pd_htn_price = comb_wm_pd_htn_price + rs_price;
					isRowProcessed = true;
		    		
					if(rs_wm == 1){
						//log.debug('rs_wm == 1');
						wm_active_quantity = wm_active_quantity + rs_quantity;
						wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
						wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
					}
					if(rs_wm_ptm == 1){
						//log.debug('rs_wm_ptm == 1');
						wm_earlyterm_quantity = wm_earlyterm_quantity + rs_quantity;
						wm_earlyterm_price = wm_earlyterm_price + (rs_quantity*wm_earlyterm_rate);
					}
		    		if(rs_pd == 1){
		    			//log.debug('rs_pd == 1');
		    			pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
						pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
		    		}
		    		if(rs_pd_ptm == 1){
		    			//log.debug('rs_pd_ptm == 1');
		    			pd_earlyterm_quantity = pd_earlyterm_quantity + rs_quantity;
						pd_earlyterm_price = pd_earlyterm_price + (rs_quantity*pd_earlyterm_rate);
		    		}
		    		if(rs_htn == 1){
		    			//log.debug('rs_htn == 1');
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
						htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
		    		}
		    		if(rs_htn_ptm == 1){
		    			//log.debug('rs_htn_ptm == 1');
		    			htn_earlyterm_quantity = htn_earlyterm_quantity + rs_quantity;
						htn_earlyterm_price = htn_earlyterm_price + (rs_quantity*htn_earlyterm_rate);
		    		}
		    	}
		    	//Set Bundle Admin referral fee
		    	if(rs_sku == 'htn_dbt_referral_fee' || rs_sku == 'wm_htn_referral_fee' || rs_sku == 'wm_htn_dbt_referral_fee' || rs_sku == 'wm_dbt_referral_fee'){
		    		//log.debug('Admin referral fee');
		    		bundle_admin_rate = rs_rate;
					bundle_admin_price = bundle_admin_price + rs_price;
					isRowProcessed = true;
		    	}
		    	
		    	//logVariables();
		    	
		    	/*log.debug({    
		            title: 'calculateData', 
		            details: 'dbt_active_price = ' + dbt_active_price +
					'\ndbt_upfront_price = ' + dbt_upfront_price +
					'\ndbt_repl_price = ' + dbt_repl_price +
					'\ndbt_earlyterm_price = ' + dbt_earlyterm_price +
					'\nhtn_active_price = ' + htn_active_price +
					'\nhtn_upfront_price = ' + htn_upfront_price +
					'\nhtn_repl_price = ' + htn_repl_price +
					'\nhtn_earlyterm_price = ' + htn_earlyterm_price +
					'\nwm_active_price = ' + wm_active_price +
					'\nwm_repl_price = ' + wm_repl_price +
					'\nwm_earlyterm_price = ' + wm_earlyterm_price +
					'\npd_active_price = ' + pd_active_price +
					'\npd_earlyterm_price = ' + pd_earlyterm_price +
					'\nbundle_disc_price = ' + bundle_disc_price +
					'\nbundle_admin_price = ' + bundle_admin_price 
		        });*/
		    	
		    	log.debug('total_bill_price = ' + total_bill_price);
		    	
		    	total_bill_price = dbt_active_price + dbt_upfront_price + dbt_repl_price + dbt_earlyterm_price + 
									htn_active_price + htn_upfront_price + htn_repl_price + htn_earlyterm_price + 
									wm_active_price + wm_repl_price + wm_earlyterm_price + 
									pd_active_price + pd_earlyterm_price;// + 
									//bundle_disc_price + bundle_admin_price;
		    	
		    	log.debug('total_bill_price = ' + total_bill_price);
		    	if(isRowProcessed)
		    		rsRec.setValue({fieldId: 'custrecord_rs_processed', value: true});
		    	else{
					rsRec.setValue({fieldId: 'custrecord_rs_processed', value: true});
					rsRec.setValue({fieldId: 'custrecord_rs_sku_not_processed', value: true});
					rsRec.setValue({fieldId: 'custrecord_rs_failed', value: true});
		    		rsRec.setValue({fieldId: 'custrecord_rs_error_message', value: 'SKU not processed.'});
		    	}
		    	rsRec.save();
		    	/*rsRec = null;
		    	rsRecId = null;*/
		    }//for loop
	    	if(total_bill_price == 0 && isRowProcessed == false){//None of the SKU rows are processed
	    		for(var j=0;j<recIds.length;j++){
	    			record.submitFields({
	            	    type: 'customrecord_rs_billing_table',
	            	    id: recIds[j],
	            	    values: {
	            	        'custrecord_rs_processed': true
	            	    }
	            	});
	    		}
	    	}
    	/*}catch(e){
    		rsRec.setValue({fieldId: 'custrecord_rs_failed', value: true});
    		rsRec.setValue({fieldId: 'custrecord_rs_error_message', value: e});
    		rsRec.save();
    		log.debug({title: 'calculateData', details: 'Error creating calculating data. RS Record ID = '+rsRecId 
    			+ ' Error Message: ' + e 
            });
    	}*/
	    log.debug({title: 'calculateData', details: 'END'});
    }
    
    function createBillingSummary2Record(){
    	log.debug({title: 'createBillingSummary2Record', details: 'START'});
    	/*log.debug({    
            title: 'createBillingSummary2Record', 
            details: 'Start createBillingSummary2Record funcion'
        });*/
		
    	var billingSearch = runtime.getCurrentScript().getParameter("custscript_billing_summary_table_search");
    	if(!billingSearch){
        	log.debug({title: 'createBillingSummary2Record', details: 'Missing required script parameters: BILLING SUMMARY TABLE SEARCH'});
        	log.debug({title: 'createBillingSummary2Record', details: 'Returning...'});
        	return;
    	}            
    	
    	var billlingSummary2Record = null;
    	var billingSummarySearch = search.load({
            id: billingSearch
    	});
    	var filters = billingSummarySearch.filters;
    	//log.debug({title: 'createBillingSummary2Record', details: 'BEFORE filters.length = '+filters.length});
    	
    	//log.debug('FILTER: client_code = '+client_code);
    	filters.push(search.createFilter({ //create new filter
            name: 'custrecord_bs2_client_code',
            operator: search.Operator.IS,
            values: client_code
        	})	
        );
    	//log.debug('FILTER: month_end_utc = '+month_end_utc);
    	var formattedEndDate = format.format({
            value: month_end_utc,
            type: format.Type.DATE
        });
    	filters.push(search.createFilter({ //create new filter
            name: 'custrecord_bs2_date',
            operator: search.Operator.ON,
            values: formattedEndDate
        	})	
        );
    	//log.debug('FILTER: subgroup = '+subgroup);
    	filters.push(search.createFilter({ //create new filter
            name: 'custrecord_bs2_grouping',
            operator: search.Operator.IS,
            values: subgroup
        	})	
        );
    	//log.debug({title: 'createBillingSummary2Record', details: 'AFTER filters.length = '+filters.length});
    	
    	var resultRange = billingSummarySearch.run().getRange({
            start: 0,
            end: 1000
        });
       
    	if(resultRange.length > 0){
    		for(var k=0;resultRange && k<resultRange.length;k++){
    			log.debug({title: 'createBillingSummary2Record', details: 'Deleting Old BS2.0 Record ID = '+resultRange[k].id});
            	deleteNSRecord(resultRange[k].recordType, resultRange[k].id);
            }
    	}
    		
    	billlingSummary2Record = record.create({
    		type: 'customrecord_liv_billing_summary_v2',
    	    isDynamic: true                       
    	});
        
        var parsedDateString = format.parse({
            value: month_end_utc,
            type: format.Type.DATE
        });
        
        /*log.debug({    
            title: 'createBillingSummary2Record', 
            details: 'parsedDateString = '+ parsedDateString +' :: row.client_code = '+client_code
        });*/
   
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_subsidiary', value: 1});//NS Subsidiary
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_record_type', value: 'Billing'});//Record Type
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_billable', value: true});//NS Auto Create Invoice
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_date', value: parsedDateString});//Date
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_currency', value: 1});//NS CURRENCY    	
    	log.debug('client_code = '+client_code);
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_client_code', value: client_code});//Client Code
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_grouping', value: subgroup});//Grouping
    	
    
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_active_members_qty', value: dbt_active_quantity});//Active Members Qty
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_active_members_qty', value: dbt_active_quantity-dbt_active_quantity_bundle});//Active Members Qty Only
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_active_members_qty_sum', value: dbt_active_sum_qty});//Active Members Qty Sum---
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_pppm_price', value: parseFloat(dbt_active_rate)});//NS PPPM Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_program_amt', value: parseFloat(dbt_active_price)});//NS Livongo Program Amt
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_upfront_meter_qty', value: parseInt(dbt_upfront_quantity)});//Upfront Meter Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_upfront_price', value: parseFloat(dbt_upfront_rate)});//NS Upfront Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_upfront_amt', value: parseFloat(dbt_upfront_price)});//NS UPFRONT AMOUNT
    	
    	//log.debug('4 '+parseFloat(row.dbt_upfront_price));
    	//log.debug('5 '+row.dbt_repl_quantity);
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_repl_meter_qty', value: parseInt(dbt_repl_quantity)}); //Replacement Meter Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_replace_price', value: parseFloat(dbt_repl_rate)});//NS Replacement Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_replacement_amt', value: parseFloat(dbt_repl_price)});//NS REPLACEMENT AMT
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_early_term_total', value: parseInt(dbt_earlyterm_quantity)});//Early Term Total
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_termination_price', value: parseFloat(dbt_earlyterm_rate)});//NS Termination Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_termination_amt', value: parseFloat(dbt_earlyterm_price)});//NS TERMINATION AMT  	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_referral_fee', value: parseFloat(dbt_admin_rate)});//NS ADMIN FEE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_referral_fee_amt', value: parseFloat(dbt_admin_price)});//NS ADMIN FEE AMOUNT
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htn_active_members_qty', value: parseInt(htn_active_quantity)});//HTN Active Members Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htn_only_active_members_q', value: (htn_active_quantity-htn_active_quantity_bundle)});//HTN Active Members Qty Only
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_pppm_price', value: parseFloat(htn_active_rate)});//NS HTN PPPM Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_program_amt', value: parseFloat(htn_active_price)});//NS HTN Program Amount
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htn_upfront_meter_qty', value: parseInt(htn_upfront_quantity)});//HTN Upfront Meter Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_upfront_price', value: parseFloat(htn_upfront_rate)});//NS HTN Upfront Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htn_upfront_amt', value: parseFloat(htn_upfront_price)});//NS HTN Upfront Amt
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_repl_meter_qty', value: parseInt(htn_repl_quantity)}); //HTN Replacement Meter Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_replace_price', value: parseFloat(htn_repl_rate)});//NS HTN Replacement Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_replacement_amt', value: parseFloat(htn_repl_price)});//NS HTN Replacement Amt
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htn_early_term_total', value: parseInt(htn_earlyterm_quantity)});//HTN Early Term Total
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_term_price', value: parseFloat(htn_earlyterm_rate)});//NS HTN Termination Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_term_amt', value: parseFloat(htn_earlyterm_price)});//NS HTN Termination Amt
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_admin_fee', value: parseFloat(htn_admin_rate)});//NS HTN Admin Fee
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_admin_fee_amt', value: parseFloat(htn_admin_price)});//NS HTN Admin Fee Amt
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wm_active_members_qty', value: parseInt(wm_active_quantity)});//WM Active Members Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wm_only_active_members_q', value: (wm_active_quantity-wm_active_quantity_bundle)});//WM Active Members Qty Only
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_pppm_price', value: parseFloat(wm_active_rate)});//NS WM PPPM Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_program_amt', value: parseFloat(wm_active_price)});//NS WM Program Amount
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wm_early_term_total', value: parseInt(wm_earlyterm_quantity)});//WM Early Term Total
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_term_price', value: parseFloat(wm_earlyterm_rate)});//NS WM Termination Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_term_amt', value: parseFloat(wm_earlyterm_price)});//NS WM Termination Amt
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_repl_meter_qty', value: parseInt(wm_repl_quantity)}); //WM Replacement Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_replace_price', value: parseFloat(wm_repl_rate)});//NS WM Replacement Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_replacement_amt', value: parseFloat(wm_repl_price)});//NS WM Replacement Amt
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_admin_fee', value: parseFloat(wm_admin_rate)});//NS WM Admin Fee
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_admin_fee_amt', value: parseFloat(wm_admin_price)});//NS WM Admin Fee Amt
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpp_active_members_qty', value: parseInt(pd_active_quantity)});//DPP Active Members Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpp_only_active_members_q', value: (pd_active_quantity-pd_active_quantity_bundle)});//DPP Active Members Qty Only
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_pppm_price', value: parseFloat(pd_active_rate)});//NS DPP PPPM Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_program_amt', value: parseFloat(pd_active_price)});//NS DPP Program Amount
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_repl_meter_qty', value: pd_repl_qty});//DPP Replacement Qty---
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_replace_price', value: pd_repl_rate});//NS DPP Replacement Price---
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_replacement_amt', value: pd_repl_price});//NS DPP Replacement Amt---
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpp_early_term_total', value: parseInt(pd_earlyterm_quantity)});//DPP Early Term Total
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_term_price', value: parseFloat(pd_earlyterm_rate)});//NS DPP Termination Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_term_amt', value: parseFloat(pd_earlyterm_price)});//NS DPP Termination Amt
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_admin_fee', value: parseFloat(pd_admin_rate)});//NS DPP Admin Fee
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_admin_fee_amt', value: parseFloat(pd_admin_price)});//NS DPP Admin Fee Amt
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_pppm_discount_price', value: parseFloat(bundle_disc_rate)});//NS Bundled Discount Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bundle_discount_amt', value: parseFloat(bundle_disc_price)});//NS Bundled Discount Amount
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bundle_discount_qty', value: parseInt(bundle_disc_quantity)});//NS Bundled Discount Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_active_members_qty', value: parseInt(comb_htn_dbt_quantity)});//Combined Active Members Qty (DM/HTN)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dmhtn_program_amt', value: parseFloat(comb_htn_dbt_price)});//Combined Program Amount (DM/HTN)
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_pppm_discount_amt', value: comb_dbt_htn_disc_price});//Bundled Discount Amount (DM/HTN)---
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_pppm_discount_amt', value: parseInt(comb_wm_dbt_quantity)});//Combined Active Members Qty (DM/WM)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_pppm_discount_amt', value: parseFloat(comb_wm_dbt_price)});//Combined Program Amount (DM/WM)
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_pppm_discount_amt', value: comb_dbt_wm_disc_price});//Bundled Discount Amount (DM/WM)---    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpphtn_active_members_qty', value: parseInt(comb_pd_htn_quantity)});//Combined Active Members Qty (DPP/HTN)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpphtn_program_amt', value: parseFloat(comb_pd_htn_price)});//Combined Program Amount (DPP/HTN)
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpphtn_discount_amt', value: comb_dpp_htn_disc_price});//Bundled Discount Amount (DPP/HTN)---
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmpdhtn_members_qty', value: parseInt(comb_wm_pd_htn_quantity)});//Combined Active Members Qty (DPP/HTN/WM)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmpdhtn_program_amt', value: parseFloat(comb_wm_pd_htn_rate)});//Combined Program Amount (DPP/HTN/WM)
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dmhtnwm_discount_amt', value: comb_wm_pd_htn_disc_price});//Bundled Discount Amount (DM/HTN/WM)---
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_bundled_admin_fee', value: parseFloat(bundle_admin_rate)});//NS Bundled Admin Fee
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_bundled_admin_fee_amt', value: parseFloat(bundle_admin_price)});//Bundled Admin Fee Amt
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmhtn_members_qty', value: parseInt(comb_wm_htn_quantity)});//Combined Active Members Qty (WM/HTN)	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmhtn_program_amt', value: parseFloat(comb_wm_htn_price)});//Combined Program Amount (WM/HTN)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_pddbt_members_qty', value: parseInt(comb_pd_dbt_quantity)});//Combined Active Members Qty (DPP/DBT)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_pddbt_program_amt', value: parseFloat(comb_pd_dbt_price)});//Combined Program Amount (DPP/DBT)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmpd_members_qty', value: parseInt(comb_wm_pd_quantity)});//Combined Active Members Qty (WM/DPP)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmpd_program_amt', value: parseFloat(comb_wm_pd_price)});//Combined Program Amount (WM/DPP)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmhtndbt_members_qty', value: parseInt(comb_wm_htn_dbt_quantity)});//Combined Active Members Qty (WM/HTN/DBT)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmhtndbt_program_amt', value: parseFloat(comb_wm_htn_dbt_price)});//Combined Program Amount (WM/HTN/DBT)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_pdhtndbt_members_qty', value: parseInt(comb_pd_htn_dbt_quantity)});//Combined Active Members Qty (DPP/HTN/DBT)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_pdhtndbt_program_amt', value: parseFloat(comb_pd_htn_dbt_price)});//Combined Program Amount (DPP/HTN/DBT)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmpddbt_members_qty', value: parseInt(comb_wm_pd_dbt_quantity)});//Combined Active Members Qty (WM/DPP/DBT)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmpddbt_program_amt', value: parseFloat(comb_wm_pd_dbt_price)});//Combined Program Amount (WM/DPP/DBT)
    	
    	//log.debug({title: 'createBillingSummary2Record', details: 'total_bill_price = '+total_bill_price});
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_total_billing_amt', value: total_bill_price});//NS TOTAL BILLING AMOUNT

    	billlingSummary2RecordId = billlingSummary2Record.save();
    	log.debug({    
            title: 'createBillingSummary2Record', 
            details: 'Billing Summary 2.0 Record created. ID = ' + billlingSummary2RecordId
        });
    	if(billlingSummary2RecordId)
    		bsRecordsCount++;
    	
    	//Link Billing Summary 2.0 and RS Billing Tale records
    	var searchId = runtime.getCurrentScript().getParameter("custscript_process_rs_searchid");
    	var startDate = runtime.getCurrentScript().getParameter("custscript_process_rs_start_date");
    	var endDate = runtime.getCurrentScript().getParameter("custscript_process_rs_end_date");
 
    	var linkRSRecToBSRec = runtime.getCurrentScript().getParameter("custscript_link_rs_rec_to_bs_rec");
    	var linkBSRecToRSRec = runtime.getCurrentScript().getParameter("custscript_link_bs_rec_to_rs_rec");
 
    	log.debug({title: 'createBillingSummary2Record', details: 'linkRSRecToBSRec = '+linkRSRecToBSRec});
    	log.debug({title: 'createBillingSummary2Record', details: 'linkBSRecToRSRec = '+linkBSRecToRSRec});
    	
    	if(!searchId || !startDate || !endDate){
        	log.debug({title: 'createBillingSummary2Record', details: 'Missing required script parameters: PROCESS RS SEARCH ID or START DATE or END DATE'});
        	log.debug({title: 'createBillingSummary2Record', details: 'Returning...'});
        	return;
        }            
    
    	var formattedStartDate = format.format({
            value: startDate,
            type: format.Type.DATE
        });
        var formattedEndDate = format.format({
            value: endDate,
            type: format.Type.DATE
        });
        
        var filtersJSON = {
        		'custrecord_rs_client_code': client_code,
        		'custrecord_rs_subgroup': subgroup,
        		'custrecord_rs_processed': true,
        		'custrecord_rs_month_start_utc': formattedStartDate,
        		'custrecord_rs_month_end_utc': formattedEndDate
        };
        
        //var columns = [];
        
        //var results = getAllResults(null,searchId,searchFilters,null);
        var results = getAllResults(null,searchId,filtersJSON,null);
                
        //log.debug('results length = '+results.length);
        var rsTableRecs = [];
        for(var k=0;k<results.length;k++){
        	rsTableRecs.push(results[k].id);
        	
        	if(linkRSRecToBSRec == true){ // Setting BS Rec ID on RS Rec
        		log.debug({title: 'createBillingSummary2Record', details: 'IF linkRSRecToBSRec'});
	        	record.submitFields({
	        	    type: 'customrecord_rs_billing_table',
	        	    id: results[k].id,
	        	    values: {
	        	        'custrecord_billing_summary_2_rec': billlingSummary2RecordId
	        	    }
	        	});
        	}
        }
        
        if(linkBSRecToRSRec == true){ // Setting RS Rec ID on BS Recs
        	log.debug({title: 'createBillingSummary2Record', details: 'IF linkBSRecToRSRec'});
	        record.submitFields({
	    	    type: 'customrecord_liv_billing_summary_v2',
	    	    id: billlingSummary2RecordId,
	    	    values: {
	    	        'custrecord_rs_billing_table_recs': rsTableRecs
	    	    }
	    	});
        }
    	
    	
    	/*log.debug({    
            title: 'createBillingSummary2Record', 
            details: 'End createBillingSummary2Record function'
        });*/
        log.debug({title: 'createBillingSummary2Record', details: 'END'});
    }
    
    function markRSTableRecordsFailed(e){
    	log.debug({title: 'markRSTableRecordsFailed', details: 'START'});
    	var searchId = runtime.getCurrentScript().getParameter("custscript_process_rs_searchid");
    	var startDate = runtime.getCurrentScript().getParameter("custscript_process_rs_start_date");
    	var endDate = runtime.getCurrentScript().getParameter("custscript_process_rs_end_date");
 
    	if(!searchId || !startDate || !endDate){
        	log.debug({title: 'markRSTableRecordsFailed', details: 'Missing required script parameters: PROCESS RS SEARCH ID or START DATE or END DATE'});
        	log.debug({title: 'markRSTableRecordsFailed', details: 'Returning...'});
        	return;
    	}            
        var formattedStartDate = format.format({
            value: startDate,
            type: format.Type.DATE
        });
        var formattedEndDate = format.format({
            value: endDate,
            type: format.Type.DATE
        });
        
        /*log.debug('client_code = ' + client_code);
    	log.debug('subgroup = ' + subgroup);
    	log.debug('formattedStartDate = ' + formattedStartDate);
    	log.debug('formattedEndDate = ' + formattedEndDate);*/
        
        var filtersJSON = {
        		'custrecord_rs_client_code': client_code,
        		'custrecord_rs_subgroup': subgroup,
        		'custrecord_rs_processed': true,
        		'custrecord_rs_month_start_utc': formattedStartDate,
        		'custrecord_rs_month_end_utc': formattedEndDate
        };
        
        //var columns = [];        
  
        var results = getAllResults(null,searchId,filtersJSON,null);
                
        //log.debug('results length = '+results.length);
        for(var k=0;k<results.length;k++){
        	record.submitFields({
        	    type: 'customrecord_rs_billing_table',
        	    id: results[k].id,
        	    values: {
        	        'custrecord_rs_failed': true,
        	        'custrecord_rs_error_message': 'Client Code or Contract not found.'
        	    }
        	});
        }
        log.debug({title: 'markRSTableRecordsFailed', details: 'END'});
    }
    
    function logVariables(){
    	log.debug({title: 'logVariables', details: 'START'});
    	log.debug({title: 'VARIABLES', details: 'dbt_active_quantity = '+dbt_active_quantity +
		'\ndbt_active_rate  = '+dbt_active_rate+
		'\ndbt_active_price  = '+dbt_active_price+
		'\ndbt_upfront_quantity  = '+dbt_upfront_quantity+
		'\ndbt_upfront_rate  = '+dbt_upfront_rate+
		'\ndbt_upfront_price  = '+dbt_upfront_price+
		'\ndbt_repl_quantity  = '+dbt_repl_quantity+
		'\ndbt_repl_rate  = '+dbt_repl_rate+
		'\ndbt_repl_price  = '+dbt_repl_price+
		'\ndbt_earlyterm_quantity  = '+dbt_earlyterm_quantity+
		'\ndbt_earlyterm_rate  = '+dbt_earlyterm_rate+
		'\ndbt_earlyterm_price  = '+dbt_earlyterm_price+
		'\ndbt_admin_rate   = '+dbt_admin_rate+
		'\ndbt_admin_price  = '+dbt_admin_price+
		'\nbundle_admin_price  = '+bundle_admin_price});

		log.debug({title: 'VARIABLES', details: 'htn_active_quantity  = '+htn_active_quantity+
		'\nhtn_active_rate    = '+htn_active_rate+
		'\nhtn_active_price   = '+htn_active_price+
		'\nhtn_upfront_quantity  = '+htn_upfront_quantity+
		'\nhtn_upfront_rate  = '+htn_upfront_rate+
		'\nhtn_upfront_price  = '+htn_upfront_price+
		'\nhtn_repl_quantity  = '+htn_repl_quantity+
		'\nhtn_repl_rate  = '+htn_repl_rate+
		'\nhtn_repl_price  = '+htn_repl_price+
		'\nhtn_earlyterm_quantity  = '+htn_earlyterm_quantity+
		'\nhtn_earlyterm_rate  = '+htn_earlyterm_rate+
		'\nhtn_earlyterm_price  = '+htn_earlyterm_price+
		'\nhtn_admin_rate  = '+htn_admin_rate+
		'\nhtn_admin_price  = '+htn_admin_price});

		log.debug({title: 'VARIABLES', details: 'wm_active_quantity  = '+wm_active_quantity+
		'\nwm_active_rate = '+wm_active_rate+
		'\nwm_active_price   = '+wm_active_price+
		'\nwm_repl_quantity  = '+wm_repl_quantity+
		'\nwm_repl_rate  = '+wm_repl_rate+
		'\nwm_repl_price  = '+wm_repl_price+
		'\nwm_earlyterm_quantity  = '+wm_earlyterm_quantity+
		'\nwm_earlyterm_rate  = '+wm_earlyterm_rate+
		'\nwm_earlyterm_price  = '+wm_earlyterm_price+
		'\nwm_admin_rate  = '+wm_admin_rate+
		'\nwm_admin_price  = '+wm_admin_price});

		log.debug({title: 'VARIABLES', details: 'pd_active_quantity  = '+pd_active_quantity+
		'\npd_active_rate    = '+pd_active_rate+
		'\npd_active_price   = '+pd_active_price+
		'\npd_earlyterm_quantity  = '+pd_earlyterm_quantity+
		'\npd_earlyterm_rate  = '+pd_earlyterm_rate+
		'\npd_earlyterm_price  = '+pd_earlyterm_price+
		'\npd_admin_rate  = '+pd_admin_rate+
		'\npd_admin_price  = '+pd_admin_price});

		log.debug({title: 'VARIABLES', details: 'bundle_disc_rate    = '+bundle_disc_rate+
		'\nbundle_disc_quantity  = '+bundle_disc_quantity+
		'\nbundle_disc_price    = '+bundle_disc_price});

		log.debug({title: 'VARIABLES', details: 'comb_htn_dbt_quantity  = '+comb_htn_dbt_quantity+
		'\ncomb_htn_dbt_rate   = '+comb_htn_dbt_rate+
		'\ncomb_htn_dbt_price   = '+comb_htn_dbt_price});

		log.debug({title: 'VARIABLES', details: 'comb_wm_dbt_quantity  = '+comb_wm_dbt_quantity+
		'\ncomb_wm_dbt_rate  		 = '+comb_wm_dbt_rate+
		'\ncomb_wm_dbt_price   = '+comb_wm_dbt_price});

		log.debug({title: 'VARIABLES', details: 'comb_pd_dbt_quantity  = '+comb_pd_dbt_quantity+
		'\ncomb_pd_dbt_rate  		 = '+comb_pd_dbt_rate+
		'\ncomb_pd_dbt_price   = '+comb_pd_dbt_price});

		log.debug({title: 'VARIABLES', details: 'comb_pd_htn_quantity  = '+comb_pd_htn_quantity+
		'\ncomb_pd_htn_rate  		 = '+comb_pd_htn_rate+
		'\ncomb_pd_htn_price = '+comb_pd_htn_price});

		log.debug({title: 'VARIABLES', details: 'comb_wm_pd_quantity  = '+comb_wm_pd_quantity+
		'\ncomb_wm_pd_rate  		 = '+comb_wm_pd_rate+
		'\ncomb_wm_pd_price = '+comb_wm_pd_price});

		log.debug({title: 'VARIABLES', details: 'comb_wm_htn_quantity  = '+comb_wm_htn_quantity+
		'\ncomb_wm_htn_rate   = '+comb_wm_htn_rate+
		'\ncomb_wm_htn_price   = '+comb_wm_htn_price});

		log.debug({title: 'VARIABLES', details: 'comb_wm_htn_dbt_quantity  = '+comb_wm_htn_dbt_quantity+
		'\ncomb_wm_htn_dbt_rate   = '+comb_wm_htn_dbt_rate+
		'\ncomb_wm_htn_dbt_price   = '+comb_wm_htn_dbt_price});

		log.debug({title: 'VARIABLES', details: 'comb_pd_htn_dbt_quantity  = '+comb_pd_htn_dbt_quantity+
		'\ncomb_pd_htn_dbt_rate   = '+comb_pd_htn_dbt_rate+
		'\ncomb_pd_htn_dbt_price   = '+comb_pd_htn_dbt_price});

		log.debug({title: 'VARIABLES', details: 'comb_wm_pd_dbt_quantity  = '+comb_wm_pd_dbt_quantity+
		'\ncomb_wm_pd_dbt_rate   = '+comb_wm_pd_dbt_rate+
		'\ncomb_wm_pd_dbt_price  = '+comb_wm_pd_dbt_price});

		log.debug({title: 'VARIABLES', details: 'comb_wm_pd_htn_quantity  = '+comb_wm_pd_htn_quantity+
		'\ncomb_wm_pd_htn_rate   = '+comb_wm_pd_htn_rate+
		'\ncomb_wm_pd_htn_price   = '+comb_wm_pd_htn_price});

		log.debug({title: 'VARIABLES', details: 'bundle_admin_rate   = '+bundle_admin_rate});
		
		log.debug({title: 'logVariables', details: 'END'});
    }    
    
    function resetVariables(){
    	log.debug({title: 'resetVariables', details: 'START'});
    	client_code = '';
    	subgroup = '';
    	month_end_utc = '';
    	
    	dbt_active_quantity= 0;
    	dbt_active_quantity_bundle = 0;
    	dbt_active_rate = 0.0;
    	dbt_active_price = 0.0;
    	dbt_upfront_quantity = 0;
    	dbt_upfront_rate = 0.0;
    	dbt_upfront_price = 0.0;
    	dbt_repl_quantity = 0;
    	dbt_repl_rate = 0.0;
    	dbt_repl_price = 0.0;
    	dbt_earlyterm_quantity = 0;
    	dbt_earlyterm_rate = 0.0;
    	dbt_earlyterm_price = 0.0;
    	dbt_admin_rate = 0.0; 
    	dbt_admin_price = 0.0;
    	bundle_admin_price = 0.0;

    	htn_active_quantity = 0;
    	htn_active_quantity_bundle = 0;
    	htn_active_rate = 0.0;  
    	htn_active_price = 0.0; 
    	htn_upfront_quantity = 0;
    	htn_upfront_rate = 0.0;
    	htn_upfront_price = 0.0;
    	htn_repl_quantity = 0;
    	htn_repl_rate = 0.0;
    	htn_repl_price = 0.0;
    	htn_earlyterm_quantity = 0;
    	htn_earlyterm_rate = 0.0;
    	htn_earlyterm_price = 0.0;
    	htn_admin_rate = 0.0;
    	htn_admin_price = 0.0;

    	wm_active_quantity = 0;
    	wm_active_quantity_bundle = 0;
    	wm_active_rate = 0.0;  
    	wm_active_price = 0.0; 
    	wm_repl_quantity = 0;
    	wm_repl_rate = 0.0;
    	wm_repl_price = 0.0;
    	wm_earlyterm_quantity = 0;
    	wm_earlyterm_rate = 0.0;
    	wm_earlyterm_price = 0.0;
    	wm_admin_rate = 0.0;
    	wm_admin_price = 0.0;

    	pd_active_quantity = 0;
    	pd_active_quantity_bundle = 0;
    	pd_active_rate = 0.0;  
    	pd_active_price = 0.0; 
    	pd_earlyterm_quantity = 0;
    	pd_earlyterm_rate = 0.0;
    	pd_earlyterm_price = 0.0;
    	pd_admin_rate = 0.0;
    	pd_admin_price = 0.0;

    	bundle_disc_rate = 0.0;  
    	bundle_disc_quantity = 0;
    	bundle_disc_price = 0.0;  

    	comb_htn_dbt_quantity = 0;
    	comb_htn_dbt_rate = 0.0; 
    	comb_htn_dbt_price = 0.0; 

    	comb_wm_dbt_quantity = 0;
    	comb_wm_dbt_rate = 0.0; 		
    	comb_wm_dbt_price = 0.0; 

    	comb_pd_dbt_quantity = 0;
    	comb_pd_dbt_rate = 0.0; 		
    	comb_pd_dbt_price = 0.0; 

    	comb_pd_htn_quantity = 0;
    	comb_pd_htn_rate = 0.0; 		
    	comb_pd_htn_price

    	comb_wm_pd_quantity = 0;
    	comb_wm_pd_rate = 0.0; 		
    	comb_wm_pd_price

    	comb_wm_htn_quantity = 0;
    	comb_wm_htn_rate = 0.0; 
    	comb_wm_htn_price = 0.0; 

    	comb_wm_htn_dbt_quantity = 0;
    	comb_wm_htn_dbt_rate = 0.0; 
    	comb_wm_htn_dbt_price = 0.0; 

    	comb_pd_htn_dbt_quantity = 0;
    	comb_pd_htn_dbt_rate = 0.0; 
    	comb_pd_htn_dbt_price = 0.0; 

    	comb_wm_pd_dbt_quantity = 0;
    	comb_wm_pd_dbt_rate = 0.0; 
    	comb_wm_pd_dbt_price = 0.0; 

    	comb_wm_pd_htn_quantity = 0;
    	comb_wm_pd_htn_rate = 0.0; 
    	comb_wm_pd_htn_price = 0.0; 

    	bundle_admin_rate = 0.0; 

    	total_bill_price = 0.0;
    	log.debug({title: 'resetVariables', details: 'END'});
    }
    
    function getAllResults(searchRecordtype, searchId, filtersJSON, searchColumns){
    	log.debug({title: 'getAllResults', details: 'START'});
    	var startIndex = 0;
    	var endIndex = 1000;
    	var searchResults = [];    	
    	var savedSearch = null;
    	
    	if(searchId){
    		log.debug({title: 'getAllResults', details: 'searchId = '+searchId});
	    	savedSearch = search.load({
	            id: searchId
	    	});
	    	var filters = savedSearch.filters;
	    	var columns = savedSearch.columns;
	    	
	    	//log.debug({title: 'getAllResults', details: 'BEFORE filters.length = '+filters.length});
	    	//for(i=0;i<searchFilters && searchFilters.length; i++){
	    	for (var key in filtersJSON) {
	    		log.debug({title: 'KEY = '+key, details:'VALUE = '+filtersJSON[key]});
				if(key == 'custrecord_rs_client_code'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_rs_client_code',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
				else if(key == 'custrecord_rs_subgroup'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_rs_subgroup',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
				else if(key == 'custrecord_rs_processed'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_rs_processed',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
				else if(key == 'custrecord_rs_month_start_utc'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_rs_month_start_utc',
			            operator: search.Operator.ON,
			            values: filtersJSON[key]
			        }));
				}
				else if(key == 'custrecord_rs_month_end_utc'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_rs_month_end_utc',
			            operator: search.Operator.ON,
			            values: filtersJSON[key]
			        }));
				}
				
	    	}
	    	//log.debug({title: 'getAllResults', details: 'AFTER filters.length = '+filters.length});
	    	
	    	//log.debug({title: 'getAllResults', details: 'BEFORE columns.length = '+columns.length});
	    	for(j=0;j<searchColumns && searchColumns.length; j++){
	    		columns.push(searchColumns[j]);
	    	}
	    	//log.debug({title: 'getAllResults', details: 'AFTER columns.length = '+columns.length});
	    	
    	}else if(searchRecordtype){
    		if(searchFilters && searchColumns){
	    		savedSearch = search.create({
	    	        type: search.Type.searchRecordtype,
	    	        filters: searchFilters,
	    	        columns: searchColumns
	    		});
    		}else if(searchFilters && !searchColumns){
    			savedSearch = search.create({
	    	        type: search.Type.searchRecordtype,
	    	        filters: searchFilters
	    		});
    		}else if(!searchFilters && searchColumns){
	    		savedSearch = search.create({
	    	        type: search.Type.searchRecordtype,
	    	        columns: searchColumns
	    		});
    		}
    	}else{
    		log.debug('Missing required argument: searchRecordtype');
    	}
    	
    	var resultRange = savedSearch.run().getRange({
            start: startIndex,
            end: endIndex
        });
    	for(var i=0;i<resultRange.length;i++){
    		//log.debug(i);
    		searchResults.push(resultRange[i]);
    		if(i==resultRange.length-1){
    			startIndex += 1000;
    			endIndex += 1000;
    			i=-1;
    			resultRange = savedSearch.run().getRange({
    	            start: startIndex,
    	            end: endIndex
    	        });
    		}
    	}
    	log.debug({title: 'getAllResults', details: 'searchResults.length = '+searchResults.length});
    	log.debug({title: 'getAllResults', details: 'END'});
    	return searchResults;
    }
    
    function deleteNSRecord(recType, recId){
    	var deletedRecordID = record.delete({
    	       type: recType,
    	       id: recId
    	}); 
    	log.debug({title: 'execute', details: 'deletedRecordID = '+deletedRecordID});
    }
    
    return {
        execute: execute
    };
});

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] == obj) {
            return true;
        }
    }
    return false;
}

Array.prototype.getUnique = function() {
	 var o = {}, a = [], i, e;
	 for (i = 0; e = this[i]; i++) {o[e] = 1};
	 for (e in o) {a.push (e)};
	 return a;
}