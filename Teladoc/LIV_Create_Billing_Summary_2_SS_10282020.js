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
	var dbt_wp_quantity = 0;
	var dbt_wp_rate = 0.0;
	var dbt_wp_price = 0.0;
	var dbt_earlyterm_wp_quantity = 0;
	var dbt_earlyterm_wp_rate = 0.0;
	var dbt_earlyterm_wp_price = 0.0;
	
	var dbt_referral_qty = 0; 
	var dbt_referral_rate = 0.0; 
	var dbt_referral_price = 0.0;

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
	var htn_wp_quantity = 0;
	var htn_wp_rate = 0.0;
	var htn_wp_price = 0.0;
	var htn_earlyterm_wp_quantity = 0;
	var htn_earlyterm_wp_rate = 0.0;
	var htn_earlyterm_wp_price = 0.0;
	//var htn_admin_rate = 0.0;
	//var htn_admin_price = 0.0;
	
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
	//var wm_admin_rate = 0.0;
	//var wm_admin_price = 0.0;
	
	var pd_active_quantity = 0;
	var pd_active_quantity_bundle = 0;
	var pd_active_rate = 0.0;  
	var pd_active_price = 0.0; 
	var pd_earlyterm_quantity = 0;
	var pd_earlyterm_rate = 0.0;
	var pd_earlyterm_price = 0.0;
	var pd_wp_quantity = 0;
	var pd_wp_rate = 0.0;
	var pd_wp_price = 0.0;
	var pd_earlyterm_wp_quantity = 0;
	var pd_earlyterm_wp_rate = 0.0;
	var pd_earlyterm_wp_price = 0.0;
	//var pd_admin_rate = 0.0;
	//var pd_admin_price = 0.0;
	
	var bh2_active_quantity = 0;
	var bh2_active_quantity_bundle = 0;
	var bh2_active_rate = 0.0; 
	var bh2_active_price = 0.0; 
	var bh2_pepm_quantity = 0;
	var bh2_pepm_rate = 0.0; 
	var bh2_pepm_price = 0.0; 
		
	var wp_active_quantity = 0;
	var wp_active_quantity_bundle = 0;
	var wp_active_rate = 0.0;
	var wp_active_price = 0.0;
	var wp_earlyterm_quantity  = 0;
	var wp_earlyterm_price = 0.0;
	var wp_earlyterm_rate = 0.0;
	var comb_wp_pd_quantity = 0;
	var comb_wp_pd_rate = 0.0;
	var wp_active_quantity = 0;
	var comb_wp_pd_price = 0.0;
	
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
	
	var comb_dbt_bh2_quantity = 0;
	var comb_dbt_bh2_rate = 0.0; 
	var comb_dbt_bh2_price = 0.0; 
	
	var comb_htn_bh2_quantity = 0;
	var comb_htn_bh2_rate = 0.0; 
	var comb_htn_bh2_price = 0.0; 
	
	var comb_wm_bh2_quantity = 0;
	var comb_wm_bh2_rate = 0.0; 
	var comb_wm_bh2_price = 0.0; 
	
	var comb_pd_htn_quantity = 0;
	var comb_pd_htn_rate = 0.0; 		
	var comb_pd_htn_price = 0.0; 

	var comb_wm_pd_quantity = 0;
	var comb_wm_pd_rate = 0.0; 		
	var comb_wm_pd_price = 0.0; 
		
	var comb_wm_htn_quantity = 0;
	var comb_wm_htn_rate = 0.0; 
	var comb_wm_htn_price = 0.0; 

	var comb_htn_dbt_bh2_quantity = 0;
	var comb_htn_dbt_bh2_rate = 0.0; 
	var comb_htn_dbt_bh2_price = 0.0; 
	
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
	
	var bundle_referral_price = 0.0;
	var bundle_referral_rate = 0.0; 
	
	var total_bill_price = 0.0;
	
	var isRowProcessed = false;
	var isAdminFeeSKU = false;
	var isMilestoneSKU = false;

	var isTier2SKU = false;
		
	//var rsProcessedCount = 0;
	var bsRecordsCount = 0;
	
	//Tier 2 Variables
	var dbt2_active_quantity = 0;
	var dbt2_active_quantity_bundle = 0;
	var dbt2_active_rate = 0.0;
	var dbt2_active_price = 0.0;
	var dbt2_upfront_quantity = 0;
	var dbt2_upfront_rate = 0.0;
	var dbt2_upfront_price = 0.0;
	var dbt2_wp_quantity = 0;
	var dbt2_wp_rate = 0.0;
	var dbt2_wp_price = 0.0;
	var dbt2_admin_rate = 0.0; 
	var dbt2_admin_price = 0.0;

	var htn2_active_quantity = 0;
	var htn2_active_quantity_bundle = 0;
	var htn2_active_rate = 0.0;  
	var htn2_active_price = 0.0; 
	var htn2_upfront_quantity = 0;
	var htn2_upfront_rate = 0.0;
	var htn2_upfront_price = 0.0;
	var htn2_wp_quantity = 0;
	var htn2_wp_rate = 0.0;
	var htn2_wp_price = 0.0;
	var htn2_admin_rate = 0.0;
	var htn2_admin_price = 0.0;
	
	var wm2_active_quantity = 0;
	var wm2_active_quantity_bundle = 0;
	var wm2_active_rate = 0.0;  
	var wm2_active_price = 0.0; 
	var wm2_admin_rate = 0.0;
	var wm2_admin_price = 0.0;
	
	var pd2_active_quantity = 0;
	var pd2_active_quantity_bundle = 0;
	var pd2_active_rate = 0.0;  
	var pd2_active_price = 0.0; 
	var pd2_wp_quantity = 0;
	var pd2_wp_rate = 0.0;
	var pd2_wp_price = 0.0;
	var pd2_admin_rate = 0.0;
	var pd_admin_price = 0.0;
		
	var comb_htn2_dbt2_quantity = 0;
	var comb_htn2_dbt2_rate = 0.0; 
	var comb_htn2_dbt2_price = 0.0; 
	
	var comb_wm2_dbt2_quantity = 0;
	var comb_wm2_dbt2_rate = 0.0; 		
	var comb_wm2_dbt2_price = 0.0; 
	
	var comb_pd2_dbt2_quantity = 0;
	var comb_pd2_dbt2_rate = 0.0; 		
	var comb_pd2_dbt2_price = 0.0; 
	 
	var comb_pd2_htn2_quantity = 0;
	var comb_pd2_htn2_rate = 0.0; 		
	var comb_pd2_htn2_price = 0.0; 

	var comb_wm2_pd2_quantity = 0;
	var comb_wm2_pd2_rate = 0.0; 		
	var comb_wm2_pd2_price = 0.0; 
		
	var comb_wm2_htn2_quantity = 0;
	var comb_wm2_htn2_rate = 0.0; 
	var comb_wm2_htn2_price = 0.0; 

	var comb_wm_htn_dbt2_quantity = 0;
	var comb_wm_htn_dbt2_rate = 0.0; 
	var comb_wm_htn_dbt2_price = 0.0; 
	
	var comb_wm2_htn2_dbt2_quantity = 0;
	var comb_wm2_htn2_dbt2_rate = 0.0; 
	var comb_wm2_htn2_dbt2_price = 0.0; 
	
	var comb_pd2_htn2_dbt2_quantity = 0;
	var comb_pd2_htn2_dbt2_rate = 0.0; 
	var comb_pd2_htn2_dbt2_price = 0.0; 
	
	var comb_wm2_pd2_dbt2_quantity = 0;
	var comb_wm2_pd2_dbt2_rate = 0.0; 
	var comb_wm2_pd2_dbt2_price = 0.0; 
		
	var comb_wm2_pd2_htn2_quantity = 0;
	var comb_wm2_pd2_htn2_rate = 0.0; 
	var comb_wm2_pd2_htn2_price = 0.0; 

	var bundle_disc2_rate = 0.0;  
	var bundle_disc2_quantity = 0;
	var bundle_disc2_price = 0.0;  
	
	//Admin Fee
	var dbt_admin_quantity= 0;
	var dbt_admin_rate = 0.0;
	var htn_admin_quantity= 0;
	var htn_admin_rate = 0.0;
	var wm_admin_quantity= 0;
	var wm_admin_rate = 0.0;
	var dpp_admin_quantity= 0;
	var dpp_admin_rate = 0.0;
	var comb_htn_dbt_admin_quantity = 0;
	var comb_htn_dbt_admin_rate = 0.0;
	var comb_wm_dbt_admin_quantity = 0;
	var comb_wm_dbt_admin_rate = 0.0;
	var comb_wm_htn_admin_quantity = 0;
	var comb_wm_htn_admin_rate = 0.0;
	var comb_wm_htn_dbt_admin_quantity = 0;
	var comb_wm_htn_dbt_admin_rate = 0.0;
	var comb_wm2_htn_admin_quantity = 0;
	var comb_wm2_htn_admin_rate = 0.0;
	var comb_wm2_htn_dbt_admin_quantity = 0;
	var comb_wm2_htn_dbt_admin_rate = 0.0;
	
	
	
	var dbtTier2Array = ['dbt_phase2_pppm','wp_dbt_phase2_pppm','htn_dbt_phase2_pppm','htn_phase2_dbt_phase2_pppm','wm_dbt_phase2_pppm','wm_phase2_dbt_phase2_pppm','pd_dbt_phase2_pppm','wm_htn_dbt_phase2_pppm','wm_htn_phase2_dbt_phase2_pppm','wm_phase2_htn_dbt_phase2_pppm','wm_phase2_htn_phase2_dbt_phase2_pppm','pd_htn_dbt_phase2_pppm','pd_htn_phase2_dbt_phase2_pppm','pd_phase2_htn_dbt_phase2_pppm','pd_phase2_htn_phase2_dbt_phase2_pppm','wm_pd_dbt_phase2_pppm','wm_pd_phase2_dbt_phase2_pppm','wm_phase2_pd2_dbt_phase2_pppm','wm_phase2_pd_phase2_dbt_phase2_pppm'];
	var htnTier2Array = ['htn_phase2_pppm','wp_htn_phase2_pppm','htn_phase2_dbt_pppm','htn_phase2_dbt_phase2_pppm','pd_htn_phase2_pppm','pd_phase2_htn_phase2_pppm','wm_htn_phase2_pppm','wm_phase2_htn_phase2_pppm','wm_htn_phase2_dbt_pppm','wm_phase2_htn_phase2_dbt_pppm','wm_htn_phase2_dbt_phase2_pppm','wm_phase2_htn_phase2_dbt_phase2_pppm','pd_htn_phase2_dbt_pppm','pd_phase2_htn_phase2_dbt_pppm','pd_htn_phase2_dbt_phase2_pppm','pd_phase2_htn_phase2_dbt_phase2_pppm','wm_pd_htn_phase2_pppm','wm_pd_phase2_htn_phase2_pppm','wm_phase2_pd_htn_phase2_pppm','wm_phase2_pd_phase2_htn_phase2_pppm'];
	var wmTier2Array = ['wm_phase2_pppm','wm_phase2_dbt_pppm','wm_phase2_dbt_phase2_pppm','wm_phase2_pd_pppm','wm_phase2_pd_phase2_pppm','wm_phase2_htn_pppm','wm_phase2_htn_phase2_pppm','wm_phase2_htn_dbt_pppm','wm_phase2_htn_phase2_dbt_pppm','wm_phase2_htn_dbt_phase2_pppm','wm_phase2_htn_phase2_dbt_phase2_pppm','pd_phase2_htn_dbt_phase2_pppm','wm_phase2_pd_dbt_pppm','wm_phase2_pd_phase2_dbt_pppmwm_phase2_pd2_dbt_phase2_pppm','wm_phase2_pd_phase2_dbt_phase2_pppm','wm_phase2_pd_htn_pppm','wm_phase2_pd_phase2_htn_pppm','wm_phase2_pd_htn_phase2_pppm','wm_phase2_pd_phase2_htn_phase2_pppm'];
	var dppTier2Array = ['pd_phase2_pppm','wp_pd_phase2_pppm','pd_phase2_dbt_pppm','pd_phase2_dbt_phase2_pppm','pd_phase2_htn_pppm','pd_phase2_htn_phase2_pppm','wm_pd_phase2_pppm','wm_phase2_pd_phase2_pppm','pd_phase2_htn_dbt_pppm','pd_phase2_htn_phase2_dbt_pppm','pd_phase2_htn_phase2_dbt_phase2_pppm','wm_pd_phase2_dbt_pppm','wm_phase2_pd_phase2_dbt_pppm','wm_pd_phase2_dbt_phase2_pppm','wm_phase2_pd_phase2_dbt_phase2_pppm','wm_pd_phase2_htn_pppm','wm_phase2_pd_phase2_htn_pppm','wm_pd_phase2_htn_phase2_pppm','wm_phase2_pd_phase2_htn_phase2_pppm'];
	var tier2ProgramArray = [];
	var tier2JSONArray = [];
	
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
            		
            		var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                	log.debug({title: 'execute', details: 'remainingUsage = '+remainingUsage});    	
                	if(remainingUsage < 1000){
                		rescheduleScrpit();
                	}
            		
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
            		
            		var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                	log.debug({title: 'execute', details: 'remainingUsage = '+remainingUsage});    	
                	if(remainingUsage < 1000){
                		rescheduleScrpit();
                	}
                	
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
			
            var subject = 'Error occured while processing Billing Summary Data.';
            var authorId = 3;
            var recipientEmail = 'anil.sharma@livongo.com';
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: subject,
                body: 'Error occured while processing Billing Summary Data: \n' + runtime.getCurrentScript().id + '\n\n' + JSON.stringify(e)
            });
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
		    		dbt_active_price = dbt_active_quantity * rs_rate;
		    		isRowProcessed = true;
		    	}
		    	//Tier-2
		    	if(rs_sku == 'dbt_phase2_pppm'){
		    		//log.debug('dbt2_pppm');
		    		dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
		    		dbt2_active_rate = rs_rate;
		    		dbt2_active_price = dbt2_active_quantity * rs_rate;
		    		isRowProcessed = true;
		    		isTier2SKU = true;
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
		    		dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    	}
		    	//Whole Person
		    	if(rs_sku == 'wp_dbt_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		dbt_wp_quantity = dbt_wp_quantity + rs_quantity;
		    		dbt_wp_rate = rs_rate;
		    		dbt_wp_price = dbt_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    	}		
		    	//Tier-2
		    	if(rs_sku == 'wp_dbt_phase2_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		dbt2_wp_quantity = dbt2_wp_quantity + rs_quantity;
		    		dbt2_wp_rate = rs_rate;
		    		dbt2_wp_price = dbt2_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    		isTier2SKU = true;
		    	}		
		    	//Whole Person Diabetes Early terms
		    	if(rs_sku == 'wp_dbtptm_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		dbt_earlyterm_wp_quantity = dbt_earlyterm_wp_quantity + rs_quantity;
		    		dbt_earlyterm_wp_rate = rs_rate;
		    		dbt_earlyterm_wp_price = dbt_earlyterm_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    	}		
		    	
		    	/******HYPERTENSION******/
		    	//Hypertension
		    	if(rs_sku == 'htn_pppm'){
		    		//log.debug('htn_pppm');
		    		htn_active_quantity = htn_active_quantity + rs_quantity;
		    		htn_active_rate = rs_rate;
		    		htn_earlyterm_rate = rs_rate;
		    		htn_active_price = htn_active_quantity * rs_rate;
		    		htn_earlyterm_price = htn_earlyterm_quantity * rs_rate;
		    		isRowProcessed = true;
		    	}	
		    	//Tier-2
		    	if(rs_sku == 'htn_phase2_pppm'){
		    		//log.debug('htn2_pppm');
		    		htn2_active_quantity = htn2_active_quantity + rs_quantity;
		    		htn2_active_rate = rs_rate;
		    		htn2_active_price = htn2_active_quantity * rs_rate;
		    		isRowProcessed = true;
		    		isTier2SKU = true;
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
					htn_earlyterm_price = htn_earlyterm_quantity * rs_rate;
					isRowProcessed = true;
		    	}	
		    	//Whole Person
		    	if(rs_sku == 'wp_htn_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		htn_wp_quantity = htn_wp_quantity + rs_quantity;
		    		htn_wp_rate = rs_rate;
		    		htn_wp_price = htn_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    	}
		    	//Tier-2
		    	if(rs_sku == 'wp_htn_phase2_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		htn2_wp_quantity = htn2_wp_quantity + rs_quantity;
		    		htn2_wp_rate = rs_rate;
		    		htn2_wp_price = htn2_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    		isTier2SKU = true;
		    	}
		    	//Whole Person Hypertension Early terms
		    	if(rs_sku == 'wp_htnptm_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		htn_earlyterm_wp_quantity = htn_earlyterm_wp_quantity + rs_quantity;
		    		htn_earlyterm_wp_rate = rs_rate;
		    		htn_earlyterm_wp_price = htn_earlyterm_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    	}
		    	//Hypertension Admin referral fee
		    	/*if(rs_sku == 'htn_referral_fee'){
		    		//log.debug('htn_referral_fee');
		    		htn_admin_rate = rs_rate;
					htn_admin_price = (htn_admin_price + rs_price);
					bundle_admin_price = bundle_admin_price + rs_price;
					isRowProcessed = true;
		    	}*/	
		    	
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
		    	//Tier-2
		    	if(rs_sku == 'wm_phase2_pppm'){
		    		//log.debug('wm2_pppm');
		    		wm2_active_quantity = wm2_active_quantity + rs_quantity;
					wm2_active_rate = rs_rate;
					wm2_active_price = wm2_active_quantity * rs_rate;
					isRowProcessed = true;
					isTier2SKU = true;
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
					wm_earlyterm_price = wm_earlyterm_quantity * rs_rate;
					isRowProcessed = true;
		    	}	
		    	//WeightManagment Admin referral fee
		    	/*if(rs_sku == 'wm_referral_fee'){
		    		//log.debug('wm_referral_fee');
		    		wm_admin_rate = rs_rate;
					wm_admin_price = wm_admin_price + rs_price;
					bundle_admin_price = bundle_admin_price + rs_price;
					isRowProcessed = true;
		    	}*/	
		    	
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
		    	//Tier-2
		    	if(rs_sku == 'pd_phase2_pppm'){
		    		//log.debug('pd2_pppm');
		    		pd2_active_quantity = pd2_active_quantity + rs_quantity;
					pd2_active_rate = rs_rate;
					pd2_active_price = pd2_active_quantity * rs_rate;
					isRowProcessed = true;
					isTier2SKU = true;
		    	}	
		    	//Prediabetes Early terms
		    	if(rs_sku == 'pdptm_pppm'){
		    		//log.debug('pdptm_pppm');
		    		pd_earlyterm_quantity = pd_earlyterm_quantity + rs_quantity;
					pd_earlyterm_rate = rs_rate;
					pd_earlyterm_price = pd_earlyterm_price * rs_rate;
					isRowProcessed = true;
		    	}	
		    	//Whole Person
		    	if(rs_sku == 'wp_pd_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		pd_wp_quantity = pd_wp_quantity + rs_quantity;
		    		pd_wp_rate = rs_rate;
		    		pd_wp_price = pd_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    	}
		    	//Tier-2
		    	if(rs_sku == 'wp_pd_phase2_pppm'){
		    		//log.debug('wp_pd2_pppm');
		    		pd2_wp_quantity = pd2_wp_quantity + rs_quantity;
		    		pd2_wp_rate = rs_rate;
		    		pd2_wp_price = pd2_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    		isTier2SKU = true;
		    	}
		    	//Whole Person Prediabetes Early terms
		    	if(rs_sku == 'wp_pdptm_pppm'){
		    		//log.debug('dbtptm_pppm');
		    		pd_earlyterm_wp_quantity = pd_earlyterm_wp_quantity + rs_quantity;
		    		pd_earlyterm_wp_rate = rs_rate;
		    		pd_earlyterm_wp_price = pd_earlyterm_wp_price + (rs_quantity * rs_rate);
		    		isRowProcessed = true;
		    	}
		    	//Prediabetes Admin referral fee
		    	/*if(rs_sku == 'pd_referral_fee'){
		    		//log.debug('pd_referral_fee');
		    		pd_admin_rate = rs_rate;
					pd_admin_price = (pd_admin_price + rs_price);
					bundle_admin_price = bundle_admin_price + rs_price;
					isRowProcessed = true;
		    	}*/	        	
		    	
		    	/******BHEAVIORAL HEALTH*****/
		    	//Behavioral Health
		    	if(rs_sku == 'bh_pppm'){
		    		//log.debug('bh_pppm');
		    		bh2_active_quantity = bh2_active_quantity + rs_quantity;
					bh2_active_rate = rs_rate;
					bh2_active_price = bh2_active_quantity * rs_rate;
					isRowProcessed = true;
		    	}	
		    	
		    	//Behavioral Health PEPM 
		    	if(rs_sku == 'bh_pepm'){
		    		//log.debug('bh_pepm');
		    		bh2_pepm_quantity = bh2_pepm_quantity + rs_quantity;
					bh2_pepm_rate = rs_rate;
					bh2_pepm_price = bh2_pepm_quantity * rs_rate;
					isRowProcessed = true;
		    	}	
		    	
		    	/******BUNDLES*****/
		    	if(rs_sku.match(/bundle_discount/g)){
		    		if(rs_sku.match(/dbt_phase2/g) || rs_sku.match(/htn_phase2/g) 
		    				|| rs_sku.match(/dp_phase2/g) || rs_sku.match(/wm_phase2/g)){
		    			//log.debug('Tier 2 bundle_discount');
		    			bundle_disc2_rate = rs_rate; 
						bundle_disc2_quantity = bundle_disc_quantity + rs_quantity;
						bundle_disc2_price = bundle_disc_price + rs_price;
						isRowProcessed = true;
		    			isTier2SKU = true;
		    		}
		    		else{
		    			//log.debug('bundle_discount');
			    		bundle_disc_rate = rs_rate; 
						bundle_disc_quantity = bundle_disc_quantity + rs_quantity;
						bundle_disc_price = bundle_disc_price + rs_price;
						isRowProcessed = true;
		    		}
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
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_dbt_ptm == 1){
		    			//log.debug('rs_dbt_ptm == 1');
		    			dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
						dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity*dbt_earlyterm_rate);
		    		}
		    	}
		    	//Tier-2
		    	if(rs_sku == 'htn_phase2_dbt_pppm' || rs_sku == 'htn_dbt_phase2_pppm' || rs_sku == 'htn_phase2_dbt_phase2_pppm'){
		    		//log.debug('HTN - DBT');
		    		comb_htn2_dbt2_rate = rs_rate;
					comb_htn2_dbt2_quantity = comb_htn2_dbt2_quantity + rs_quantity;
					comb_htn2_dbt2_price = comb_htn2_dbt2_price + rs_price;
					isRowProcessed = true;
					isTier2SKU = true;
					
					if(rs_sku == 'htn_phase2_dbt_pppm'){
						htn2_active_quantity = htn2_active_quantity + rs_quantity;
		    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
		    			htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
		    			
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
		    			dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
	    			}
	    			else if(rs_sku == 'htn_dbt_phase2_pppm'){
	    				htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
		    			htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
		    			
	    				dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
		    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
		    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
	    			}
	    			else if(rs_sku == 'htn_phase2_dbt_phase2_pppm'){
	    				htn2_active_quantity = htn2_active_quantity + rs_quantity;
		    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
		    			htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
		    			
		    			dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
		    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
		    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
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
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_dbt_ptm == 1){
		    			//log.debug('rs_dbt_ptm == 1');
		    			dbt_earlyterm_quantity = dbt_earlyterm_quantity + rs_quantity;
						dbt_earlyterm_price = dbt_earlyterm_price + (rs_quantity*dbt_earlyterm_rate);
		    		}
		    	}
		    	//Tier-2
		    	if(rs_sku == 'wm_phase2_dbt_pppm' || rs_sku == 'wm_dbt_phase2_pppm' || rs_sku == 'wm_phase2_dbt_phase2_pppm'){
		    		//log.debug('WM - DBT');
		    		comb_wm2_dbt2_rate = rs_rate;
					comb_wm2_dbt2_quantity = comb_wm2_dbt2_quantity + rs_quantity;
					comb_wm2_dbt2_price = comb_wm2_dbt2_price + rs_price;
					isRowProcessed = true;
					isTier2SKU = true;
					
					if(rs_sku == 'wm_phase2_dbt_pppm'){
						wm2_active_quantity = wm2_active_quantity + rs_quantity;
		    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
		    			wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
		    			
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
		    			dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
					}
					else if(rs_sku == 'wm_dbt_phase2_pppm'){
						wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
		    			wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
						
						dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
		    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
		    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
					}
					else if(rs_sku == 'wm_phase2_dbt_phase2_pppm'){
						wm2_active_quantity = wm2_active_quantity + rs_quantity;
		    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
		    			wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
		    			
		    			dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
		    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
		    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
					}
		    	}
		    	//PD - DBT
		    	if(rs_sku == 'pd_dbt_pppm' || rs_sku == 'pdptm_dbt_pppm' || rs_sku == 'pd_dbtptm_pppm' || rs_sku == 'pdptm_dbtptm_pppm'){
		    		//log.debug('PD - DBT');
		    		comb_pd_dbt_rate = rs_rate;
					comb_pd_dbt_quantity = comb_pd_dbt_quantity + rs_quantity;
					comb_pd_dbt_price = comb_pd_dbt_price + rs_price;
					isRowProcessed = true;
					
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
		    	//Tier-2
		    	if(rs_sku == 'pd_phase2_dbt_pppm' || rs_sku == 'pd_dbt_phase2_pppm' || rs_sku == 'pd_phase2_dbt_phase2_pppm'){
		    		//log.debug('PD - DBT');
		    		comb_pd2_dbt2_rate = rs_rate;
					comb_pd2_dbt2_quantity = comb_pd2_dbt2_quantity + rs_quantity;
					comb_pd2_dbt2_price = comb_pd2_dbt2_price + rs_price;
					isRowProcessed = true;
					isTier2SKU = true;
					
					if(rs_sku == 'pd_phase2_dbt_pppm'){
						pd2_active_quantity = pd2_active_quantity + rs_quantity;
		    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
		    			pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
		    			
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
		    			dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
					}
					else if(rs_sku == 'pd_dbt_phase2_pppm'){
						pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
		    			pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
		    			
						dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
		    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
		    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
					}
					else if(rs_sku == 'pd_phase2_dbt_phase2_pppm'){
						pd2_active_quantity = pd2_active_quantity + rs_quantity;
		    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
		    			pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
		    			
		    			dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
		    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
		    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
					}
		    	}
		    	//DBT - BH
		    	if(rs_sku == 'dbt_bh_pppm'){
		    		//log.debug('DBT - BH');
		    		comb_dbt_bh2_rate = rs_rate;
					comb_dbt_bh2_quantity = comb_dbt_bh2_quantity + rs_quantity;
					comb_dbt_bh2_price = comb_dbt_bh2_price + rs_price;
					isRowProcessed = true;
					if(rs_dbt == 1){
		    			//log.debug('rs_dbt == 1');
		    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
		    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
						dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
		    		}
		    		if(rs_bh == 1){
		    			//log.debug('rs_bh == 1');
		    			bh2_active_quantity = bh2_active_quantity + rs_quantity;
		    			bh2_active_quantity_bundle = bh2_active_quantity_bundle + rs_quantity;
						bh2_active_price =bh2_active_price + (rs_quantity*bh2_active_rate);
		    		}		    	
		    	}
		    	
		    	//HTN - BH
		    	if(rs_sku == 'htn_bh_pppm'){
		    		//log.debug('HTN - BH');
		    		comb_htn_bh2_rate = rs_rate;
					comb_htn_bh2_quantity = comb_htn_bh2_quantity + rs_quantity;
					comb_htn_bh2_price = comb_htn_bh2_price + rs_price;
					isRowProcessed = true;
					if(rs_htn == 1){
		    			//log.debug('rs_htn == 1');
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
						htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
		    		}
		    		if(rs_bh == 1){
		    			//log.debug('rs_bh == 1');
		    			bh2_active_quantity = bh2_active_quantity + rs_quantity;
		    			bh2_active_quantity_bundle = bh2_active_quantity_bundle + rs_quantity;
						bh2_active_price =bh2_active_price + (rs_quantity*bh2_active_rate);
		    		}		    	
		    	}
		    	
		    	//WM - BH
		    	if(rs_sku == 'wm_bh_pppm'){
		    		//log.debug('WM - BH');
		    		comb_wm_bh2_rate = rs_rate;
					comb_wm_bh2_quantity = comb_wm_bh2_quantity + rs_quantity;
					comb_wm_bh2_price = comb_wm_bh2_price + rs_price;
					isRowProcessed = true;
					if(rs_wm == 1){
		    			//log.debug('rs_wm == 1');
		    			wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
						wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
		    		}
		    		if(rs_bh == 1){
		    			//log.debug('rs_bh == 1');
		    			bh2_active_quantity = bh2_active_quantity + rs_quantity;
		    			bh2_active_quantity_bundle = bh2_active_quantity_bundle + rs_quantity;
						bh2_active_price =bh2_active_price + (rs_quantity*bh2_active_rate);
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
		    	//Tier-2
		    	if(rs_sku == 'pd_phase2_htn_pppm' || rs_sku == 'pd_htn_phase2_pppm' || rs_sku == 'pd_phase2_htn_phase2_pppm'){
		    		//log.debug('PD - HTN');
		    		comb_pd2_htn2_quantity = comb_pd2_htn2_quantity + rs_quantity;
					comb_pd2_htn2_rate = rs_rate;
					comb_pd1_htn2_price = comb_pd2_htn2_price + rs_price;
					isRowProcessed = true;
					isTier2SKU = true;
					
					if(rs_sku == 'pd_phase2_htn_pppm'){
						pd2_active_quantity = pd2_active_quantity + rs_quantity;
		    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
		    			pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
		    			
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
		    			htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
					}
					else if(rs_sku == 'pd_htn_phase2_pppm'){
						pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
		    			pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
		    			
		    			htn2_active_quantity = htn2_active_quantity + rs_quantity;
		    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
		    			htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
					}
					else if(rs_sku == 'pd_phase2_htn_phase2_pppm'){
						pd2_active_quantity = pd2_active_quantity + rs_quantity;
		    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
		    			pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
		    			
		    			htn2_active_quantity = htn2_active_quantity + rs_quantity;
		    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
		    			htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
					}
		    	}
		    	
		    	//WM - PD
		    	if(rs_sku == 'wm_pd_pppm' || rs_sku == 'wm_pdptm_pppm' || rs_sku == 'wmptm_pd_pppm' || rs_sku == 'wmptm_pdptm_pppm'){
		    		//log.debug('WM - PD');
		    		comb_wm_pd_quantity = comb_wm_pd_quantity + rs_quantity;
					comb_wm_pd_rate = rs_rate;
					comb_wm_pd_price = comb_wm_pd_price + rs_price;
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
		    	}
		    	//Tier-2
		    	if(rs_sku == 'wm_phase2_pd_pppm' || rs_sku == 'wm_pd_phase2_pppm' || rs_sku == 'wm_phase2_pd_phase2_pppm'){
		    		//log.debug('WM - PD');
		    		comb_wm2_pd2_quantity = comb_wm2_pd2_quantity + rs_quantity;
					comb_wm2_pd2_rate = rs_rate;
					comb_wm2_pd2_price = comb_wm2_pd2_price + rs_price;
					isRowProcessed = true;
					isTier2SKU = true;
					
					if(rs_sku == 'wm_phase2_pd_pppm'){
						wm2_active_quantity = wm2_active_quantity + rs_quantity;
		    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
		    			wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
		    			
		    			pd_active_quantity = pd_active_quantity + rs_quantity;
		    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
		    			pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
					}
					else if(rs_sku == 'wm_pd_phase2_pppm'){
						wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
		    			wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
		    			
		    			pd2_active_quantity = pd2_active_quantity + rs_quantity;
		    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
		    			pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
					}
					else if(rs_sku == 'wm_phase2_pd_phase2_pppm'){
						wm2_active_quantity = wm2_active_quantity + rs_quantity;
		    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
		    			wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
		    			
		    			pd2_active_quantity = pd2_active_quantity + rs_quantity;
		    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
		    			pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
					}
		    	}
		    	//WM - HTN
		    	if(rs_sku == 'wm_htn_pppm' || rs_sku == 'wmptm_htn_pppm' || rs_sku == 'wm_htnptm_pppm' || rs_sku == 'wmptm_htnptm_pppm'){
		    		//log.debug('WM - HTN');
		    		comb_wm_htn_quantity = comb_wm_htn_quantity + rs_quantity;
					comb_wm_htn_rate = rs_rate;
					comb_wm_htn_price = comb_wm_htn_price + rs_price;
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
						wm_earlyterm_price = wm_earlyterm_price + (rs_quantity * wm_earlyterm_rate);
		    		}
		    		if(rs_htn == 1){
		    			//log.debug('rs_htn == 1');
		    			htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
						htn_active_price = htn_active_price + (rs_quantity * htn_active_rate);
		    		}
		    		if(rs_htn_ptm == 1){
		    			//log.debug('rs_htn_ptm == 1');
		    			htn_earlyterm_quantity = htn_earlyterm_quantity + rs_quantity;		    			
						htn_earlyterm_price = htn_earlyterm_price + (rs_quantity*htn_earlyterm_rate);
		    		}
		    	}
		    	//Tier-2
		    	if(rs_sku == 'wm_phase2_htn_pppm' || rs_sku == 'wm_htn_phase2_pppm' || rs_sku == 'wm_phase2_htn_phase2_pppm'){
		    		//log.debug('WM - HTN');
		    		comb_wm2_htn2_quantity = comb_wm2_htn2_quantity + rs_quantity;
					comb_wm2_htn2_rate = rs_rate;
					comb_wm2_htn2_price = comb_wm2_htn2_price + rs_price;
					isRowProcessed = true;
					isTier2SKU = true;
					
					if(rs_sku == 'wm_phase2_htn_pppm'){
						wm2_active_quantity = wm2_active_quantity + rs_quantity;
		    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
						wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
						
						htn_active_quantity = htn_active_quantity + rs_quantity;
		    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
						htn_active_price = htn_active_price + (rs_quantity * htn_active_rate);
					}
					else if(rs_sku == 'wm_htn_phase2_pppm'){
						wm_active_quantity = wm_active_quantity + rs_quantity;
		    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
						wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
						
						htn2_active_quantity = htn2_active_quantity + rs_quantity;
		    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
						htn2_active_price = htn2_active_price + (rs_quantity * htn2_active_rate);
					}
					else if(rs_sku == 'wm_phase2_htn_phase2_pppm'){
						wm2_active_quantity = wm2_active_quantity + rs_quantity;
		    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
						wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
						
						htn2_active_quantity = htn2_active_quantity + rs_quantity;
		    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
						htn2_active_price = htn2_active_price + (rs_quantity * htn2_active_rate);
					}
		    	}
		    	
		    	//WM - HTN - DBT
		    	if(rs_sku.match(/wm/g) && rs_sku.match(/htn/g) && rs_sku.match(/dbt/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('WM - HTN - DBT');
		    		//Tier-2
			    	if(rs_sku == 'wm_phase2_htn_dbt_pppm' || rs_sku == 'wm_htn_phase2_dbt_pppm' || rs_sku == 'wm_htn_dbt_phase2_pppm'
			    		 || rs_sku == 'wm_phase2_htn_phase2_dbt_pppm' || rs_sku == 'wm_htn_phase2_dbt_phase2_pppm' || rs_sku == 'wm_phase2_htn_dbt_phase2_pppm'
			    			 || rs_sku == 'wm_phase2_htn_phase2_dbt_phase2_pppm'){
			    		//log.debug('WM - HTN - DBT');
			    		comb_wm2_htn2_dbt2_quantity = comb_wm2_htn2_dbt2_quantity + rs_quantity;
						comb_wm2_htn2_dbt2_rate = rs_rate;
						comb_wm2_htn2_dbt2_price = comb_wm2_htn2_dbt2_quantity + rs_price;
						isRowProcessed = true;
						isTier2SKU = true;
						
						if(rs_sku == 'wm_phase2_htn_dbt_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
			    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
			    			wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
			    			
			    			htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
			    			htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
			    			
			    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
			    			dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'wm_htn_phase2_dbt_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
			    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
			    			wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
			    			
			    			htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
			    			htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
			    			
			    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
			    			dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'wm_htn_dbt_phase2_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
			    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
			    			wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
			    			
			    			htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
			    			htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
			    			
			    			dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
			    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_htn_phase2_dbt_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
			    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
			    			wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
			    			
			    			htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
			    			htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
			    			
			    			dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
			    			dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'wm_htn_phase2_dbt_phase2_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
			    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
			    			wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
			    			
			    			htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
			    			htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
			    			
			    			dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
			    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_htn_dbt_phase2_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
			    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
			    			wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
			    			
			    			htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
			    			htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
			    			
			    			dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
			    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_htn_phase2_dbt_phase2_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
			    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
			    			wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
			    			
			    			htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
			    			htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
			    			
			    			dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
			    			dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
			    	}
			    	else{
			    		comb_wm_htn_dbt_quantity = comb_wm_htn_dbt_quantity + rs_quantity;
						comb_wm_htn_dbt_rate = rs_rate;
						comb_wm_htn_dbt_price = comb_wm_htn_dbt_quantity + rs_price;
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
		    	}
		    	
		    	//HTN - DBT - BH
		    	if(rs_sku.match(/htn/g) && rs_sku.match(/dbt/g) && rs_sku.match(/bh/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('HTN - DBT - BH');
		    		comb_htn_dbt_bh2_quantity = comb_htn_dbt_bh2_quantity + rs_quantity;
					comb_htn_dbt_bh2_rate = rs_rate;
					comb_htn_dbt_bh2_price = comb_htn_dbt_bh2_quantity + rs_price;
					isRowProcessed = true;
				
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
		    		if(rs_bh == 1){
		    			//log.debug('rs_bh == 1');
		    			bh2_active_quantity = bh2_active_quantity + rs_quantity;
		    			bh2_active_quantity_bundle = bh2_active_quantity_bundle + rs_quantity;
						bh2_active_price = bh2_active_price + (rs_quantity*bh2_active_rate);
		    		}
		    	}
		    	
		    	//PD - HTN - DBT	
		    	if(rs_sku.match(/pd/g) && rs_sku.match(/htn/g) && rs_sku.match(/dbt/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('PD - HTN - DBT');
		    		//Tier-2
			    	if(rs_sku == 'pd_phase2_htn_dbt_pppm' || rs_sku == 'pd_htn_phase2_dbt_pppm' || rs_sku == 'pd_htn_dbt_phase2_pppm'
			    		 || rs_sku == 'pd_phase2_htn_phase2_dbt_pppm' || rs_sku == 'pd_htn_phase2_dbt_phase2_pppm' || rs_sku == 'pd_phase2_htn_dbt_phase2_pppm'
			    			 || rs_sku == 'pd_phase2_htn_phase2_dbt_phase2_pppm'){
			    		//log.debug('PD - HTN - DBT');
			    		comb_pd2_htn2_dbt2_quantity = comb_pd2_htn2_dbt2_quantity + rs_quantity;
						comb_pd2_htn2_dbt2_rate = rs_rate;
						comb_pd2_htn2_dbt2_price = comb_pd2_htn2_dbt2_quantity + rs_price;
						isRowProcessed = true;
						isTier2SKU = true;
						
						if(rs_sku == 'pd_phase2_htn_dbt_pppm'){
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
							htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
							
							dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
							dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'pd_htn_phase2_dbt_pppm'){
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
							htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
							
							dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
							dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'pd_htn_dbt_phase2_pppm'){
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
							htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
							
							dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
							dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'pd_phase2_htn_phase2_dbt_pppm'){
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
							htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
							
							dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
							dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'pd_htn_phase2_dbt_phase2_pppm'){
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
							htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
							
							dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
							dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'pd_phase2_htn_dbt_phase2_pppm'){
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
							htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
							
							dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
							dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'pd_phase2_htn_phase2_dbt_phase2_pppm'){
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
							htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
							
							dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
							dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
			    	}
			    	else{
			    		comb_pd_htn_dbt_quantity = comb_pd_htn_dbt_quantity + rs_quantity;
						comb_pd_htn_dbt_rate = rs_rate;
						comb_pd_htn_dbt_price = comb_pd_htn_dbt_quantity + rs_price;
						isRowProcessed = true;
						
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
		    	}
		    	
		    	
		    	//WM - PD - DBT
		    	if(rs_sku.match(/wm/g) && rs_sku.match(/pd/g) && rs_sku.match(/dbt/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('WM - PD - DBT');
		    		//Tier-2
			    	if(rs_sku == 'wm_phase2_pd_dbt_pppm' || rs_sku == 'wm_pd_phase2_dbt_pppm' || rs_sku == 'wm_pd_dbt_phase2_pppm'
			    		 || rs_sku == 'wm_phase2_pd_phase2_dbt_pppm' || rs_sku == 'wm_phase2_pd_phase2_dbt_pppm' || rs_sku == 'wm_phase2_pd2_dbt_phase2_pppm'
			    			 || rs_sku == 'wm_phase2_pd_phase2_dbt_phase2_pppm'){
			    		
			    		//log.debug('WM - PD - DBT');
			    		comb_wm2_pd2_dbt2_quantity = comb_wm2_pd2_dbt2_quantity + rs_quantity;
						comb_wm2_pd2_dbt2_rate = rs_rate;
						comb_wm2_pd2_dbt2_price = comb_wm2_pd2_dbt2_price + rs_price;
						isRowProcessed = true;
						isTier2SKU = true;
						
						if(rs_sku == 'wm_phase2_pd_dbt_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
			    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
							wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
							
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
							dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'wm_pd_phase2_dbt_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
			    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
							wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
							
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
							dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'wm_pd_dbt_phase2_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
			    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
							wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
							
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
							dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_pd_phase2_dbt_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
			    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
							wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
							
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							dbt_active_quantity = dbt_active_quantity + rs_quantity;
			    			dbt_active_quantity_bundle = dbt_active_quantity_bundle + rs_quantity;
							dbt_active_price = dbt_active_price + (rs_quantity*dbt_active_rate);
						}
						else if(rs_sku == 'wm_pd_phase2_dbt_phase2_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
			    			wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
							wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
							
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
							dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_pd_dbt_phase2_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
			    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
							wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
							
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
							dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_pd_phase2_dbt_phase2_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
			    			wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
							wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
							
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							dbt2_active_quantity = dbt2_active_quantity + rs_quantity;
			    			dbt2_active_quantity_bundle = dbt2_active_quantity_bundle + rs_quantity;
							dbt2_active_price = dbt2_active_price + (rs_quantity*dbt2_active_rate);
						}
			    	}
			    	else{
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
		    	}
		    	
		    	//WM - PD - HTN
		    	if(rs_sku.match(/wm/g) && rs_sku.match(/pd/g) && rs_sku.match(/htn/g) && rs_sku.match(/pppm/g)){
		    		//log.debug('WM - PD - HTN');
		    		//Tier-2
			    	if(rs_sku == 'wm_phase2_pd_htn_pppm' || rs_sku == 'wm_pd_phase2_htn_pppm' || rs_sku == 'wm_pd_htn_phase2_pppm'
			    		 || rs_sku == 'wm_phase2_pd_phase2_htn_pppm' || rs_sku == 'wm_pd_phase2_htn_phase2_pppm' || rs_sku == 'wm_phase2_pd_htn_phase2_pppm'
			    			 || rs_sku == 'wm_phase2_pd_phase2_htn_phase2_pppm'){
			    		//log.debug('WM - PD - HTN');
			    		comb_wm2_pd2_htn2_quantity = comb_wm2_pd2_htn2_quantity + rs_quantity;
						comb_wm2_pd2_htn2_rate = rs_rate;
						comb_wm2_pd2_htn2_price = comb_wm2_pd2_htn2_price + rs_price;
						isRowProcessed = true;
						isTier2SKU = true;
						
						if(rs_sku == 'wm_phase2_pd_htn_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
							wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
							wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
							
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
							htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
						}
						else if(rs_sku == 'wm_pd_phase2_htn_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
							wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
							wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
							
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
							htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
						}
						else if(rs_sku == 'wm_pd_htn_phase2_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
							wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
							wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
							
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
							htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_pd_phase2_htn_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
							wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
							wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
							
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							htn_active_quantity = htn_active_quantity + rs_quantity;
			    			htn_active_quantity_bundle = htn_active_quantity_bundle + rs_quantity;
							htn_active_price = htn_active_price + (rs_quantity*htn_active_rate);
						}
						else if(rs_sku == 'wm_pd_phase2_htn_phase2_pppm'){
							wm_active_quantity = wm_active_quantity + rs_quantity;
							wm_active_quantity_bundle = wm_active_quantity_bundle + rs_quantity;
							wm_active_price = wm_active_price + (rs_quantity*wm_active_rate);
							
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
							htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_pd_htn_phase2_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
							wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
							wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
							
							pd_active_quantity = pd_active_quantity + rs_quantity;
			    			pd_active_quantity_bundle = pd_active_quantity_bundle + rs_quantity;
							pd_active_price = pd_active_price + (rs_quantity*pd_active_rate);
							
							htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
							htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
						}
						else if(rs_sku == 'wm_phase2_pd_phase2_htn_phase2_pppm'){
							wm2_active_quantity = wm2_active_quantity + rs_quantity;
							wm2_active_quantity_bundle = wm2_active_quantity_bundle + rs_quantity;
							wm2_active_price = wm2_active_price + (rs_quantity*wm2_active_rate);
							
							pd2_active_quantity = pd2_active_quantity + rs_quantity;
			    			pd2_active_quantity_bundle = pd2_active_quantity_bundle + rs_quantity;
							pd2_active_price = pd2_active_price + (rs_quantity*pd2_active_rate);
							
							htn2_active_quantity = htn2_active_quantity + rs_quantity;
			    			htn2_active_quantity_bundle = htn2_active_quantity_bundle + rs_quantity;
							htn2_active_price = htn2_active_price + (rs_quantity*htn2_active_rate);
						}
			    	}
			    	else{
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
			    }
		    	/*
		    	//Diabetes Partner Referral Fee
		    	if(rs_sku == 'dbt_referral_fee'){
		    		//log.debug('dbt_referral_fee');
		    		dbt_referral_rate = rs_rate;
		    		dbt_referral_qty = dbt_referral_qty + rs_quantity;
		    		dbt_referral_price = dbt_referral_rate + rs_price;
		    		bundle_referral_price = bundle_referral_price + rs_price;
		    		isRowProcessed = true;
		    	}
		    	
		    	//Set Bundle Partner Referral Fee
		    	if(rs_sku == 'htn_dbt_referral_fee' || rs_sku == 'wm_htn_referral_fee' || rs_sku == 'wm_htn_dbt_referral_fee' || rs_sku == 'wm_dbt_referral_fee'){
		    		//log.debug('Bundle Partner Referral Fee');
		    		bundle_referral_rate = rs_rate;
		    		bundle_referral_price = bundle_referral_price + rs_price;
					isRowProcessed = true;
		    	}
		    	*/
		    	//Admin Fee SKU
		    	if(rs_sku.match(/_admin_fee/g)){
		    		//log.debug('Admin fee sku');
					//isRowProcessed = true;
					isAdminFeeSKU = true;
					
					//Diabetes
			    	if(rs_sku == 'dbt_admin_fee'){
			    		//log.debug('dbt_admin_fee');
			    		dbt_admin_quantity = dbt_admin_quantity + rs_quantity;
			    		dbt_admin_rate = rs_rate;
			    		isRowProcessed = true;
			    	}
			    	//Hypertension
			    	if(rs_sku == 'htn_admin_fee'){
			    		//log.debug('htn_admin_fee');
			    		htn_admin_quantity = htn_admin_quantity + rs_quantity;
			    		htn_admin_rate = rs_rate;
			    		isRowProcessed = true;
			    	}
			    	//Weight Management
			    	if(rs_sku == 'wm_admin_fee'){
			    		//log.debug('wm_admin_fee');
			    		wm_admin_quantity = wm_admin_quantity + rs_quantity;
			    		wm_admin_rate = rs_rate;
			    		isRowProcessed = true;
			    	}
			    	//Pre-Diabetes 
			    	if(rs_sku == 'pd_admin_fee'){
			    		//log.debug('pd_admin_fee');
			    		dpp_admin_quantity = dpp_admin_quantity + rs_quantity;
			    		dpp_admin_rate = rs_rate;
			    		isRowProcessed = true;
			    	}
			    	//HTN - DBT
			    	if(rs_sku == 'htn_dbt_admin_fee'){
		    			//log.debug('htn_dbt_admin_fee');
			    		comb_htn_dbt_admin_quantity = comb_htn_dbt_admin_quantity + rs_quantity;
			    		comb_htn_dbt_admin_rate = rs_rate;
			    		isRowProcessed = true;
		    		}
			    	//WM - DBT
			    	if(rs_sku == 'wm_dbt_admin_fee'){
		    			//log.debug('wm_dbt_admin_fee');
			    		comb_wm_dbt_admin_quantity = comb_wm_dbt_admin_quantity + rs_quantity;
			    		comb_wm_dbt_admin_rate = rs_rate;
			    		isRowProcessed = true;
		    		}
			    	//WM - HTN
			    	if(rs_sku == 'wm_htn_admin_fee'){
		    			//log.debug('wm_htn_admin_fee');
			    		comb_wm_htn_admin_quantity = comb_wm_htn_admin_quantity + rs_quantity;
			    		comb_wm_htn_admin_rate = rs_rate;
			    		isRowProcessed = true;
		    		}
			    	//WM - HTN - DBT
			    	if(rs_sku == 'wm_htn_dbt_admin_fee'){
		    			//log.debug('wm_htn_dbt_admin_fee');
			    		comb_wm_htn_dbt_admin_quantity = comb_wm_htn_dbt_admin_quantity + rs_quantity;
			    		comb_wm_htn_dbt_admin_rate = rs_rate;
			    		isRowProcessed = true;
		    		}
			    	//WM2 - HTN
			    	if(rs_sku == 'wm_phase2_htn_admin_fee'){
		    			//log.debug('wm_phase2_htn_admin_fee');
			    		comb_wm2_htn_admin_quantity = comb_wm2_htn_admin_quantity + rs_quantity;
			    		comb_wm2_htn_admin_rate = rs_rate;
			    		isRowProcessed = true;
		    		}
			    	//WM2 - HTN - DBT
			    	if(rs_sku == 'wm_phase2_htn_dbt_admin_fee'){
		    			//log.debug('wm_phase2_htn_dbt_admin_fee');
			    		comb_wm2_htn_dbt_admin_quantity = comb_wm2_htn_dbt_admin_quantity + rs_quantity;
			    		comb_wm2_htn_dbt_admin_rate = rs_rate;
			    		isRowProcessed = true;
		    		}
					
		    	}
		    	else if(rs_sku.match(/PD_LV/g) || rs_sku.match(/WM_LV/g)
		    			|| rs_sku.match(/PD_RFW/g) || rs_sku.match(/WM_RFW/g)
		    				|| rs_sku.match(/PD_BCBST/g) || rs_sku.match(/PD_MA/g)){
		    		isMilestoneSKU = true;
		    	}
		    	
		    	//Tier-2 
		    	//DBT
		    	if(dbt2_active_quantity > 0 && dbtTier2Array.contains(rs_sku)){
		    		if(!tier2ProgramArray.contains('DBT')){
		    			tier2JSONArray.push({
			    			program: 'DBT',
			    			dbt2_active_quantity : dbt2_active_quantity,
			    			dbt2_active_rate : dbt2_active_rate//,
			    			//dbt2_active_price : dbt2_active_price 		
			    		});
		    			tier2ProgramArray.push('DBT');
		    		}
		    		else{
		    			for(var z=0;z<tier2JSONArray.length;z++){
		    				if(tier2JSONArray[z].program == 'DBT'){
		    					tier2JSONArray[z].dbt2_active_quantity = parseInt(tier2JSONArray[z].dbt2_active_quantity) + parseInt(dbt2_active_quantity);
		    					//tier2JSONArray[z].dbt2_active_price = parseFloat(tier2JSONArray[z].dbt2_active_price) + parseFloat(dbt2_active_price);
		    				}
		    			}
		    		}
		    		/*dbt2_active_rate = 0.0;
		    		dbt2_active_price = 0.0;
		    		dbt2_active_quantity = 0;*/
		    	}
		    	/*if(dbt2_upfront_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'DBT Upfront',
		    			dbt2_upfront_quantity : dbt2_upfront_quantity,
		    			dbt2_upfront_rate : dbt2_upfront_rate,
		    			dbt2_upfront_price : dbt2_upfront_price  		
		    		});
		    		dbt2_upfront_quantity = 0;
		    	}*/
		    	if(dbt2_wp_quantity > 0 && rs_sku == 'wp_dbt_phase2_pppm'){
		    		if(!tier2ProgramArray.contains('DBT WP')){
		    			tier2JSONArray.push({
			    			program: 'DBT WP',
			    			dbt2_wp_quantity : dbt2_wp_quantity,
			    			dbt2_wp_rate : dbt2_wp_rate//,
			    			//dbt2_wp_price : dbt2_wp_price   		
			    		});
		    			tier2ProgramArray.push('DBT WP');
		    		}
		    		else{
		    			for(var z=0;z<tier2JSONArray.length;z++){
		    				if(tier2JSONArray[z].program == 'DBT WP'){
		    					tier2JSONArray[z].dbt2_wp_quantity = parseInt(tier2JSONArray[z].dbt2_wp_quantity) + parseInt(dbt2_wp_quantity);
		    					//tier2JSONArray[z].dbt2_wp_price = parseFloat(tier2JSONArray[z].dbt2_wp_price) + parseFloat(dbt2_wp_price);
		    				}
		    			}
		    		}
		    		/*dbt2_wp_rate = 0.0;
		    		dbt2_wp_price - 0.0;
		    		dbt2_wp_quantity = 0;*/
		    	}
		    	//HTN
		    	if(htn2_active_quantity > 0 && htnTier2Array.contains(rs_sku)){
		    		if(!tier2ProgramArray.contains('HTN')){
		    			tier2JSONArray.push({
			    			program: 'HTN',
			    			htn2_active_quantity : htn2_active_quantity,
			    			htn2_active_rate : htn2_active_rate//,
			    			//htn2_active_price : htn2_active_price  		
			    		});
		    			tier2ProgramArray.push('HTN');
		    		}
		    		else{
		    			for(var z=0;z<tier2JSONArray.length;z++){
		    				if(tier2JSONArray[z].program == 'HTN'){
		    					tier2JSONArray[z].htn2_active_quantity = parseInt(tier2JSONArray[z].htn2_active_quantity) + parseInt(htn2_active_quantity);
		    					//tier2JSONArray[z].htn2_active_price = parseFloat(tier2JSONArray[z].htn2_active_price) + parseFloat(htn2_active_price);
		    				}
		    			}
		    		}
		    		/*htn2_active_rate = 0.0;
		    		htn2_active_price = 0.0;
		    		htn2_active_quantity = 0;*/
		    	}
		    	/*if(htn2_upfront_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'HTN Upfront',
		    			htn2_upfront_quantity : htn2_upfront_quantity,
		    			htn2_upfront_rate : htn2_upfront_rate,
		    			htn2_upfront_price : htn2_upfront_price   		
		    		});
		    		htn2_upfront_quantity = 0;
		    	}*/
		    	if(htn2_wp_quantity > 0 && rs_sku == 'wp_htn_phase2_pppm'){
		    		if(!tier2ProgramArray.contains('HTN WP')){
		    			tier2JSONArray.push({
			    			program: 'HTN WP',
			    			htn2_wp_quantity : htn2_wp_quantity ,
			    			htn2_wp_rate : htn2_wp_rate//,
			    			//htn2_wp_price : htn2_wp_price   		
			    		});
		    			tier2ProgramArray.push('HTN WP');
		    		}
		    		else{
		    			for(var z=0;z<tier2JSONArray.length;z++){
		    				if(tier2JSONArray[z].program == 'HTN WP'){
		    					tier2JSONArray[z].htn2_wp_quantity = parseInt(tier2JSONArray[z].htn2_wp_quantity) + parseInt(htn2_wp_quantity);
		    					//tier2JSONArray[z].htn2_wp_price = parseFloat(tier2JSONArray[z].htn2_wp_price) + parseFloat(htn2_wp_price);
		    				}
		    			}
		    		}
		    		/*htn2_wp_rate = 0.0;
		    		htn2_wp_price = 0.0;
		    		htn2_wp_quantity = 0;*/
		    	}
		    	//WM
		    	if(wm2_active_quantity > 0 && wmTier2Array.contains(rs_sku)){
		    		if(!tier2ProgramArray.contains('WM')){
		    			tier2JSONArray.push({
			    			program: 'WM',
			    			wm2_active_quantity : wm2_active_quantity,
			    			wm2_active_rate : wm2_active_rate// ,
			    			//wm2_active_price : wm2_active_price    		
			    		});
		    			tier2ProgramArray.push('WM');
		    		}
		    		else{
		    			for(var z=0;z<tier2JSONArray.length;z++){
		    				if(tier2JSONArray[z].program == 'WM'){
		    					tier2JSONArray[z].wm2_active_quantity = parseInt(tier2JSONArray[z].wm2_active_quantity) + parseInt(wm2_active_quantity);
		    					//tier2JSONArray[z].wm2_active_price = parseFloat(tier2JSONArray[z].wm2_active_price) + parseFloat(wm2_active_price);
		    				}
		    			}
		    		}
		    		/*wm2_active_rate = 0.0;
		    		wm2_active_price = 0.0;
		    		wm2_active_quantity = 0;*/
		    	}

		    	//DPP
		    	if(pd2_active_quantity > 0 && dppTier2Array.contains(rs_sku)){
		    		if(!tier2ProgramArray.contains('DPP')){
		    			tier2JSONArray.push({
			    			program: 'DPP',
			    			pd2_active_quantity : pd2_active_quantity ,
			    			pd2_active_rate : pd2_active_rate//,
			    			//pd2_active_price : pd2_active_price   		
			    		});
		    			tier2ProgramArray.push('DPP');
		    		}
		    		else{
		    			for(var z=0;z<tier2JSONArray.length;z++){
		    				if(tier2JSONArray[z].program == 'DPP'){
		    					tier2JSONArray[z].pd2_active_quantity = parseInt(tier2JSONArray[z].pd2_active_quantity) + parseInt(pd2_active_quantity);
		    					//tier2JSONArray[z].pd2_active_price = parseFloat(tier2JSONArray[z].pd2_active_price) + parseFloat(pd2_active_price);
		    				}
		    			}
		    		}
		    		/*pd2_active_rate = 0.0;
		    		pd2_active_price = 0.0;
		    		pd2_active_quantity = 0;*/
		    	}
		    	if(pd2_wp_quantity > 0 && rs_sku == 'wp_pd_phase2_pppm'){
		    		if(!tier2ProgramArray.contains('DPP WP')){
		    			tier2JSONArray.push({
			    			program: 'DPP WP',
			    			pd2_wp_quantity : pd2_wp_quantity ,
			    			pd2_wp_rate : pd2_wp_rate// ,
			    			//pd2_wp_price : pd2_wp_price    		
			    		});
		    			tier2ProgramArray.push('DPP WP');
		    		}
		    		else{
		    			for(var z=0;z<tier2JSONArray.length;z++){
		    				if(tier2JSONArray[z].program == 'DPP WP'){
		    					tier2JSONArray[z].pd2_wp_quantity = parseInt(tier2JSONArray[z].pd2_wp_quantity) + parseInt(pd2_wp_quantity);
		    					//tier2JSONArray[z].pd2_wp_price = parseFloat(tier2JSONArray[z].pd2_wp_price) + parseFloat(pd2_wp_price);
		    				}
		    			}
		    		}
		    		/*pd2_wp_rate = 0.0;
		    		pd2_wp_price = 0.0;
		    		pd2_wp_quantity = 0;*/
		    	}
		    	//HTN-DBT
		    	/*if(comb_htn2_dbt2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'HTN-DBT',
		    			comb_htn2_dbt2_quantity : comb_htn2_dbt2_quantity ,
		    			comb_htn2_dbt2_rate : comb_htn2_dbt2_rate,
		    			comb_htn2_dbt2_price : comb_htn2_dbt2_price   	
		    		});
		    		comb_htn2_dbt2_quantity = 0;
		    	}
		    	//WM-DBT
		    	if(comb_wm2_dbt2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'WM-DBT',
		    			comb_wm2_dbt2_quantity : comb_wm2_dbt2_quantity,
		    			comb_wm2_dbt2_rate : comb_wm2_dbt2_rate,
		    			comb_wm2_dbt2_price : comb_wm2_dbt2_price    		
		    		});
		    		comb_wm2_dbt2_quantity = 0;
		    	}
		    	//PD-DBT
		    	if(comb_pd2_dbt2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'PD-DBT',
		    			comb_pd2_dbt2_quantity : comb_pd2_dbt2_quantity,
		    			comb_pd2_dbt2_rate : comb_pd2_dbt2_rate,
		    			comb_pd2_dbt2_price : comb_pd2_dbt2_price     		
		    		});
		    		comb_pd2_dbt2_quantity = 0;
		    	}
		    	//PD-HTN
		    	if(comb_pd2_dbt2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'PD-HTN',
		    			comb_pd2_dbt2_quantity : comb_pd2_dbt2_quantity,
		    			comb_pd2_dbt2_rate : comb_pd2_dbt2_rate,
		    			comb_pd2_dbt2_price : comb_pd2_dbt2_price     		
		    		});
		    		comb_pd2_dbt2_quantity = 0;
		    	}
		    	//WM-PD
		    	if(comb_wm2_pd2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'WM-PD',
		    			comb_wm2_pd2_quantity : comb_wm2_pd2_quantity,
		    			comb_wm2_pd2_rate : comb_wm2_pd2_rate,
		    			comb_wm2_pd2_price : comb_wm2_pd2_price      		
		    		});
		    		comb_wm2_pd2_quantity = 0;
		    	}
		    	//WM-HTN
		    	if(comb_wm2_htn2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'WM-HTN',
		    			comb_wm2_htn2_quantity : comb_wm2_htn2_quantity,
		    			comb_wm2_htn2_rate : comb_wm2_htn2_rate,
		    			comb_wm2_htn2_price : comb_wm2_htn2_price       		
		    		});
		    		comb_wm2_htn2_quantity = 0;
		    	}
		    	//WM-HTN-DBT
		    	if(comb_wm2_htn2_dbt2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'WM-HTN-DBT',
		    			comb_wm2_htn2_dbt2_quantity : comb_wm2_htn2_dbt2_quantity,
		    			comb_wm2_htn2_dbt2_rate : comb_wm2_htn2_dbt2_rate,
		    			comb_wm2_htn2_dbt2_price : comb_wm2_htn2_dbt2_price        		
		    		});
		    		comb_wm2_htn2_dbt2_quantity = 0;
		    	}
		    	//PD-HTN-DBT
		    	if(comb_pd2_htn2_dbt2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'PD-HTN-DBT',
		    			comb_pd2_htn2_dbt2_quantity : comb_pd2_htn2_dbt2_quantity,
		    			comb_pd2_htn2_dbt2_rate : comb_pd2_htn2_dbt2_rate,
		    			comb_pd2_htn2_dbt2_price : comb_pd2_htn2_dbt2_price         		
		    		});
		    		comb_pd2_htn2_dbt2_quantity = 0;
		    	}
		    	//WM-PD-DBT
		    	if(comb_wm2_pd2_dbt2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'WM-PD-DBT',
		    			comb_wm2_pd2_dbt2_quantity : comb_wm2_pd2_dbt2_quantity,
		    			comb_wm2_pd2_dbt2_rate : comb_wm2_pd2_dbt2_rate,
		    			comb_wm2_pd2_dbt2_price : comb_wm2_pd2_dbt2_price          		
		    		});
		    		comb_wm2_pd2_dbt2_quantity = 0;
		    	}
		    	//WM-PD-HTN
		    	if(comb_wm2_pd2_htn2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'WM-PD-HTN',
		    			comb_wm2_pd2_htn2_quantity : comb_wm2_pd2_htn2_quantity,
		    			comb_wm2_pd2_htn2_rate : comb_wm2_pd2_htn2_rate,
		    			comb_wm2_pd2_htn2_price : comb_wm2_pd2_htn2_price           		
		    		});
		    		comb_wm2_pd2_htn2_quantity = 0;
		    	}*/
		    	
		    	//Bundle Discount
		    	if(bundle_disc2_quantity > 0){
		    		tier2JSONArray.push({
		    			program: 'Bundle Discount',
		    			bundle_disc2_rate : bundle_disc2_rate,
						bundle_disc2_quantity : bundle_disc_quantity,
						bundle_disc2_price : bundle_disc_price*-1
		    		});
		    		bundle_disc2_rate = 0.0;
		    		bundle_disc_price = 0.0;
		    		comb_wm2_pd2_htn2_quantity = 0;
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
		    	
		    	/*total_bill_price = dbt_active_price + dbt_upfront_price + dbt_repl_price + dbt_earlyterm_price + 
									htn_active_price + htn_upfront_price + htn_repl_price + htn_earlyterm_price + 
									wm_active_price + wm_repl_price + wm_earlyterm_price + 
									pd_active_price + pd_earlyterm_price + dbt_wp_price + htn_wp_price + pd_wp_price +
									bh2_active_price + bh2_pepm_price;*/ // + 
									//dbt2_active_price + dbt2_upfront_price + dbt2_wp_price +
									//htn2_active_price + htn2_upfront_price + htn2_wp_price +
									//wm2_active_price + pd2_active_price + pd2_wp_price;
									//bundle_disc_price + bundle_admin_price;
		    	
		    	log.debug('calculateData: dbt_active_price = ' + dbt_active_price);
		    	log.debug('calculateData: dbt_upfront_price = ' + dbt_upfront_price);
		    	log.debug('calculateData: dbt_repl_price = ' + dbt_repl_price);
		    	log.debug('calculateData: dbt_earlyterm_price = ' + dbt_earlyterm_price);
		    	log.debug('calculateData: dbt_wp_price = ' + dbt_wp_price);
		    	log.debug('calculateData: dbt_earlyterm_wp_price = ' + dbt_earlyterm_wp_price);
		    	log.debug('calculateData: htn_active_price = ' + htn_active_price);
		    	log.debug('calculateData: htn_upfront_price = ' + htn_upfront_price);
		    	log.debug('calculateData: htn_repl_price = ' + htn_repl_price);
		    	log.debug('calculateData: htn_earlyterm_price = ' + htn_earlyterm_price);
		    	log.debug('calculateData: htn_wp_price = ' + htn_wp_price);
		    	log.debug('calculateData: htn_earlyterm_wp_price = ' + htn_earlyterm_wp_price);
		    	log.debug('calculateData: wm_active_price = ' + wm_active_price);
		    	log.debug('calculateData: wm_repl_price = ' + wm_repl_price);
		    	log.debug('calculateData: wm_earlyterm_price = ' + wm_earlyterm_price);
		    	log.debug('calculateData: pd_active_price = ' + pd_active_price);
		    	log.debug('calculateData: pd_earlyterm_price = ' + pd_earlyterm_price);
		    	log.debug('calculateData: pd_wp_price = ' + pd_wp_price);
		    	log.debug('calculateData: pd_earlyterm_wp_price = ' + pd_earlyterm_wp_price);
		    	log.debug('calculateData: bh2_active_price = ' + bh2_active_price);
		    	log.debug('calculateData: bh2_pepm_price = ' + bh2_pepm_price);
		    	
		    	log.debug('calculateData: dbt2_active_price = ' + dbt2_active_price);
		    	log.debug('calculateData: dbt2_wp_price = ' + dbt2_wp_price);
		    	log.debug('calculateData: htn2_active_price = ' + htn2_active_price);
		    	log.debug('calculateData: htn2_wp_price = ' + htn2_wp_price);
		    	log.debug('calculateData: wm2_active_price = ' + wm2_active_price);
		    	log.debug('calculateData: pd2_active_price = ' + pd2_active_price);
		    	log.debug('calculateData: pd2_wp_price = ' + pd2_wp_price);

		    	total_bill_price = parseFloat(dbt_active_price) + parseFloat(dbt_upfront_price) + parseFloat(dbt_repl_price) + parseFloat(dbt_earlyterm_price) + parseFloat(dbt_wp_price) + parseFloat(dbt_earlyterm_wp_price) +
		    		parseFloat(htn_active_price) + parseFloat(htn_upfront_price) + parseFloat(htn_repl_price) + parseFloat(htn_earlyterm_price) + parseFloat(htn_wp_price) + parseFloat(htn_earlyterm_wp_price) +
		    		parseFloat(wm_active_price) + parseFloat(wm_repl_price) + parseFloat(wm_earlyterm_price) + 
		    		parseFloat(pd_active_price) + parseFloat(pd_earlyterm_price) + parseFloat(pd_wp_price) + parseFloat(pd_earlyterm_wp_price) +
		    		parseFloat(bh2_active_price) + parseFloat(bh2_pepm_price) + 
		    		parseFloat(dbt2_active_price) + parseFloat(dbt2_wp_price) +
		    		parseFloat(htn2_active_price) + parseFloat(htn2_wp_price) +
		    		parseFloat(wm2_active_price) + 
		    		parseFloat(pd2_active_price) + parseFloat(pd2_wp_price);
		    		
					/*(parseInt(dbt2_active_quantity) * parseFloat(dbt2_active_rate)) + (parseInt(dbt2_wp_quantity) * parseFloat(dbt2_wp_rate)) +
					(parseInt(htn2_active_quantity) * parseFloat(htn2_active_rate)) + (parseInt(htn2_wp_quantity) * parseFloat(htn2_wp_rate)) +
					(parseInt(wm2_active_quantity) * parseFloat(wm2_active_rate)) + 
					(parseInt(pd2_active_quantity) * parseFloat(pd2_active_rate)) + (parseInt(pd2_wp_quantity) * parseFloat(pd2_wp_rate));*/
					
		    						/*(dbt_admin_quantity*dbt_admin_rate) + (htn_admin_quantity*htn_admin_rate) + (wm_admin_quantity*wm_admin_rate) +
		    						(dpp_admin_quantity*dpp_admin_rate) + (comb_htn_dbt_admin_quantity*comb_htn_dbt_admin_rate) + 
		    						(comb_wm_dbt_admin_quantity*comb_wm_dbt_admin_rate) + (comb_wm_htn_admin_quantity*comb_wm_htn_admin_rate) + 
		    						(comb_wm_htn_dbt_admin_quantity*comb_wm_htn_dbt_admin_rate) + (comb_wm2_htn_admin_quantity*comb_wm2_htn_admin_rate) + 
		    						(comb_wm2_htn_dbt_admin_quantity*comb_wm2_htn_dbt_admin_rate);*/
				
		    	log.debug('total_bill_price = ' + total_bill_price);
		    	if(isRowProcessed){
		    		rsRec.setValue({fieldId: 'custrecord_rs_processed', value: true});
		    		/*if(isAdminFeeSKU){
		    			rsRec.setValue({fieldId: 'custrecord_rs_admin_fee_sku', value: true});
		    		}*/		    			
		    	}
		    	else{
					rsRec.setValue({fieldId: 'custrecord_rs_processed', value: true});
					rsRec.setValue({fieldId: 'custrecord_rs_sku_not_processed', value: true});
					rsRec.setValue({fieldId: 'custrecord_rs_failed', value: true});
					if(isAdminFeeSKU){
		    			rsRec.setValue({fieldId: 'custrecord_rs_admin_fee_sku', value: true});
		    			rsRec.setValue({fieldId: 'custrecord_rs_error_message', value: 'Admin Fee SKU.'});
		    		}
					else if(isMilestoneSKU){
						rsRec.setValue({fieldId: 'custrecord_rs_milestone_sku', value: true});
		    			rsRec.setValue({fieldId: 'custrecord_rs_error_message', value: 'Milestone SKU.'});
					}
					else{
						rsRec.setValue({fieldId: 'custrecord_rs_error_message', value: 'SKU not processed.'});
					}
					isAdminFeeSKU = false;
					isMilestoneSKU = false;					
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
    	var fetchPartnerAdminFeeFromRS = false;
    	var fetchPartnerReferralFeeFromRS = false;
    	
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
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wp_meter_qty', value: parseInt(dbt_wp_quantity)});//WP METER QTY
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wp_price', value: parseFloat(dbt_wp_rate)});//NS WP PRICE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wp_amt', value: parseFloat(dbt_wp_price)});//NS WP AMOUNT
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wp_term_qty', value: parseInt(dbt_earlyterm_wp_quantity)});//WP TERMINATION QTY
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wp_term_price', value: parseFloat(dbt_earlyterm_wp_rate)});//NS WP TERMINATION PRICE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wp_term_amt', value: parseFloat(dbt_earlyterm_wp_price)});//NS WP TERMINATION AMT
    	
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_referral_fee', value: parseFloat(dbt_admin_rate)});//NS ADMIN FEE
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_referral_fee_amt', value: parseFloat(dbt_admin_price)});//NS ADMIN FEE AMOUNT
    	
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
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_wp_meter_qty', value: parseInt(htn_wp_quantity)});//HTN WP METER QTY
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_wp_price', value: parseFloat(htn_wp_rate)});//NS HTN WP PRICE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_wp_amt', value: parseFloat(htn_wp_price)});//NS HTN WP AMT
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_wp_term_qty', value: parseInt(htn_earlyterm_wp_quantity)});//HTN WP TERMINATION QTY
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_wp_term_price', value: parseFloat(htn_earlyterm_wp_rate)});//NS HTN WP TERMINATION PRICE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_wp_term_amt', value: parseFloat(htn_earlyterm_wp_price)});//NS HTN WP TERMINATION AMT
    	
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_admin_fee', value: parseFloat(htn_admin_rate)});//NS HTN Admin Fee
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_admin_fee_amt', value: parseFloat(htn_admin_price)});//NS HTN Admin Fee Amt
    	
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
    	
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_admin_fee', value: parseFloat(wm_admin_rate)});//NS WM Admin Fee
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_admin_fee_amt', value: parseFloat(wm_admin_price)});//NS WM Admin Fee Amt
    	
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
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_wp_meter_qty', value: parseInt(pd_wp_quantity)});//DPP WP QTY
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_wp_price', value: parseFloat(pd_wp_rate)});//NS DPP WP PRICE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_wp_amt', value: parseFloat(pd_wp_price)});//NS DPP WP AMT
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_wp_term_qty', value: parseInt(pd_earlyterm_wp_quantity)});//DPP WP TERMINATION QTY
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_wp_term_price', value: parseFloat(pd_earlyterm_wp_rate)});//NS DPP WP TERMINATION PRICE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_wp_term_amt', value: parseFloat(pd_earlyterm_wp_price)});//NS DPP WP TERMINATION AMT

    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_admin_fee', value: parseFloat(pd_admin_rate)});//NS DPP Admin Fee
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_admin_fee_amt', value: parseFloat(pd_admin_price)});//NS DPP Admin Fee Amt

    	//BH2
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bh2_participants_qty', value: parseInt(bh2_active_quantity)});//BH2 PARTICIPANTS QTY
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bh2_program_price', value: parseFloat(bh2_active_rate)});//BH2 PROGRAM PRICE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bh2_program_amt', value: parseFloat(bh2_active_price)});//BH2 PROGRAM AMOUNT
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bh2_pepm_participants_qty', value: parseInt(bh2_pepm_quantity)});//BH2 PEPM PARTICIPANTS QTY
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bh2_pepm_program_price', value: parseFloat(bh2_pepm_rate)});//BH2 PEPM PROGRAM PRICE
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bh2_pepm_program_amt', value: parseFloat(bh2_pepm_price)});//BH2 PEPM PROGRAM AMOUNT
    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_pppm_discount_price', value: parseFloat(bundle_disc_rate)});//NS Bundled Discount Price
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bundle_discount_amt', value: parseFloat(bundle_disc_price)});//NS Bundled Discount Amount
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_bundle_discount_qty', value: parseInt(bundle_disc_quantity)});//NS Bundled Discount Qty
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_active_members_qty', value: parseInt(comb_htn_dbt_quantity)});//Combined Active Members Qty (DM/HTN)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dmhtn_program_amt', value: parseFloat(comb_htn_dbt_price)});//Combined Program Amount (DM/HTN)
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_pppm_discount_amt', value: comb_dbt_htn_disc_price});//Bundled Discount Amount (DM/HTN)---
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dmwm_active_members_qty', value: parseInt(comb_wm_dbt_quantity)});//Combined Active Members Qty (DM/WM)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dmwm_program_amt', value: parseFloat(comb_wm_dbt_price)});//Combined Program Amount (DM/WM)
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_cb_pppm_discount_amt', value: comb_dbt_wm_disc_price});//Bundled Discount Amount (DM/WM)---    	
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpphtn_active_members_qty', value: parseInt(comb_pd_htn_quantity)});//Combined Active Members Qty (DPP/HTN)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpphtn_program_amt', value: parseFloat(comb_pd_htn_price)});//Combined Program Amount (DPP/HTN)
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dpphtn_discount_amt', value: comb_dpp_htn_disc_price});//Bundled Discount Amount (DPP/HTN)---
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmpdhtn_members_qty', value: parseInt(comb_wm_pd_htn_quantity)});//Combined Active Members Qty (DPP/HTN/WM)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmpdhtn_program_amt', value: parseFloat(comb_wm_pd_htn_rate)});//Combined Program Amount (DPP/HTN/WM)
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dmhtnwm_discount_amt', value: comb_wm_pd_htn_disc_price});//Bundled Discount Amount (DM/HTN/WM)---
    	
    	//BH2 Combinations
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dmbh_active_members_qty', value: parseFloat(comb_dbt_bh2_quantity)});//Combined Active Memebers Qty (DM/BH)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_dmbh_program_amt', value: parseFloat(comb_dbt_bh2_price)});//Combined Program Amount (DM/BH) 
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htnbh_active_members_qty', value: parseFloat(comb_htn_bh2_quantity)});//Combined Active Memebers Qty (HTN/BH) 
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htnbh_program_amt', value: parseFloat(comb_htn_bh2_price)});//Combined Program Amount (HTN/BH) 
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmbh_active_members_qty', value: parseFloat(comb_wm_bh2_quantity)});//Combined Active Memebers Qty (WM/BH)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_wmbh_program_amt', value: parseFloat(comb_wm_bh2_price)});//Combined Program Amount (WM/BH) 
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htndmbh_active_members_qt', value: parseFloat(comb_htn_dbt_bh2_quantity)});//Combined Active Memebers Qty (HTN/DM/BH)
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_htndmbh_program_amt', value: parseFloat(comb_htn_dbt_bh2_price)});//Combined Program Amount (HTN/DM/BH)
    	
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_bundled_admin_fee', value: parseFloat(bundle_admin_rate)});//NS Bundled Admin Fee
    	//billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_bundled_admin_fee_amt', value: parseFloat(bundle_admin_price)});//Bundled Admin Fee Amt
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

    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_tier2_json', value: JSON.stringify(tier2JSONArray)});//Tier-2 JSON
    	
    	//log.debug({title: 'createBillingSummary2Record', details: 'total_bill_price = '+total_bill_price});
    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_total_billing_amt', value: total_bill_price});//NS TOTAL BILLING AMOUNT
    	
    	//Setting Partner Price 
    	 var pccodeArr = [];
 	    var pccListSearch = search.load({
             id: 'customsearch_liv_pccode_search'
         });
 	    
 	   var pccListSearchfilters = pccListSearch.filters;
 	   pccListSearchfilters.push(search.createFilter({ //create new filter
          name: 'name',
          operator: search.Operator.IS,
          values: client_code
      	})	
 	  	);
 	  	var pccListSearchRsultRange = pccListSearch.run().getRange({
         start: 0,
         end: 1000
 	 	});
 	  	
 	  	var clientCodeId = pccListSearchRsultRange[0].id;
 	  	
 	  	log.debug({    
            title: 'createBillingSummary2Record', 
            details: 'clientCodeId: ' + clientCodeId
        });
    	
    	 var contratsSearch = search.create({
    	        type: 'customrecord_liv_contracts',
    	        columns: ['custrecord_fetch_partner_adm_fee_from_rs','custrecord_fetch_partner_ref_fee_from_rs'],
    	        filters: [
    	                  	['custrecord_liv_cm_client_code', 'anyof', clientCodeId], 
    	                  	'and', ['custrecord_liv_cm_contract_status', 'is', 'Active']
    	                  ]
    	});

	    var contratsSearchResultSet = contratsSearch.run();
	
	    var contratsSearchResultRange = contratsSearchResultSet.getRange({
	        start: 0,
	        end: 50
	    });
	    
	    log.debug({    
            title: 'createBillingSummary2Record', 
            details: 'contratsSearchResultRange.length: ' + contratsSearchResultRange.length
        });

	    if(contratsSearchResultRange.length == 1){
	    	fetchPartnerAdminFeeFromRS = contratsSearchResultRange[0].getValue('custrecord_fetch_partner_adm_fee_from_rs');
	    	log.debug({    
	            title: 'createBillingSummary2Record', 
	            details: 'fetchPartnerAdminFeeFromRS: ' + fetchPartnerAdminFeeFromRS
	        });
	    	if(fetchPartnerAdminFeeFromRS == true){
	    		billlingSummary2Record.setValue({ fieldId: 'custrecord_get_partner_admin_fee_from_rs', value: true});//NS ADMIN FEE
	    		
	    		billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_referral_fee', value: parseFloat(dbt_admin_rate)});//NS ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dbt_admin_members', value: parseInt(dbt_admin_quantity)});//NS DBT ADMIN MEMBER QTY
		    
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_admin_fee', value: parseFloat(htn_admin_rate)});//NS HTN ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_admin_members', value: parseInt(htn_admin_quantity)});//NS HTN ADMIN MEMBER QTY
	    	
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_admin_fee', value: parseFloat(wm_admin_rate)});//NS WM ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_admin_members', value: parseInt(wm_admin_quantity)});//NS WM ADMIN MEMBER QTY
	    	
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_admin_fee', value: parseFloat(dpp_admin_rate)});//NS DPP ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dpp_admin_members', value: parseInt(dpp_admin_quantity)});//NS DPP ADMIN MEMBER QTY
	    	
		    	log.debug({    
		            title: 'createBillingSummary2Record', 
		            details: 'comb_htn_dbt_admin_quantity: ' + comb_htn_dbt_admin_quantity
		        });
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_dbt_admin_fee', value: parseFloat(comb_htn_dbt_admin_rate)});//NS HTN DBT ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_htn_dbt_admin_members', value: parseInt(comb_htn_dbt_admin_quantity)});//NS HTN DBT ADMIN MEMBER QTY
	    	
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_dbt_admin_fee', value: parseFloat(comb_wm_dbt_admin_rate)});//NS WM DBT ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_dbt_admin_members', value: parseInt(comb_wm_dbt_admin_quantity)});//NS WM DBT ADMIN MEMBER QTY
	    	
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_htn_admin_fee', value: parseFloat(comb_wm_htn_admin_rate)});//NS WM HTN ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_htn_admin_members', value: parseInt(comb_wm_htn_admin_quantity)});//NS WM HTN ADMIN MEMBER QTY
	    	
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_htn_dbt_admin_fee', value: parseFloat(comb_wm_htn_dbt_admin_rate)});//NS WM HTN DBT ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_htn_dbt_admin_membe', value: parseInt(comb_wm_htn_dbt_admin_quantity)});//NS WM HTN DBT ADMIN MEMBER QTY
	    	
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm2_htn_admin_fee', value: parseFloat(comb_wm2_htn_admin_rate)});//NS WM2 HTN ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm2_htn_admin_members', value: parseInt(comb_wm2_htn_admin_quantity)});//NS WM2 HTN ADMIN MEMBER QTY
	    	
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm2_htn_dbt_admin_fee', value: parseFloat(comb_wm2_htn_dbt_admin_rate)});//NS WM2 HTN DBT ADMIN FEE
		    	billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm2_htn_dbt_admin_memb', value: parseInt(comb_wm2_htn_dbt_admin_quantity)});//NS WM2 HTN DBT ADMIN MEMBER QTY
	    	}
	    	fetchPartnerReferralFeeFromRS = contratsSearchResultRange[0].getValue('custrecord_fetch_partner_ref_fee_from_rs');
	    	log.debug({    
	            title: 'createBillingSummary2Record', 
	            details: 'fetchPartnerReferralFeeFromRS: ' + fetchPartnerReferralFeeFromRS
	        });
	    	if(fetchPartnerReferralFeeFromRS == true){
	    		/*billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_invoice_members_qty', value: parseInt(dbt_referral_qty)});//NS INVOICE BILLED MEMBERS
	    		billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_wm_dbt_referral_fee', value: parseInt(dbt_referral_rate)});//NS DBT REFERRAL FEE
	    		billlingSummary2Record.setValue({ fieldId: 'custrecord_bs2_ns_dbt_referral_amt', value: parseInt(dbt_referral_price)});//NS DBT REFERRAL MEMBER AMT*/
	    	}
	    }
	    else{
	    	log.debug({    
	            title: 'createBillingSummary2Record', 
	            details: 'More than 1 Active Cobtarcts found for the the client code: ' + client_code
	        });
	    }
	    	
    
    	
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
    	/*var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
    	log.debug({title: 'markRSTableRecordsFailed', details: 'remainingUsage = '+remainingUsage});    	
    	if(remainingUsage < 500){
    		rescheduleScrpit();
    	}*/
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
    	dbt_wp_quantity = 0;
    	dbt_wp_rate = 0.0;
    	dbt_wp_price = 0.0;
    	dbt_earlyterm_wp_quantity = 0;
		dbt_earlyterm_wp_rate = 0.0;
		dbt_earlyterm_wp_price = 0.0;
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
    	htn_wp_quantity = 0;
    	htn_wp_rate = 0.0;
    	htn_wp_price = 0.0;
    	htn_earlyterm_wp_quantity = 0;
		htn_earlyterm_wp_rate = 0.0;
		htn_earlyterm_wp_price = 0.0;
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
    	pd_wp_quantity = 0;
    	pd_wp_rate = 0.0;
    	pd_wp_price = 0.0;
    	pd_earlyterm_wp_quantity = 0;
		pd_earlyterm_wp_rate = 0.0;
		pd_earlyterm_wp_price = 0.0;
    	pd_admin_rate = 0.0;
    	pd_admin_price = 0.0;

    	bh2_active_quantity = 0;
    	bh2_active_quantity_bundle = 0;
    	bh2_active_rate = 0.0; 
    	bh2_active_price = 0.0; 
    	bh2_pepm_quantity = 0;
    	bh2_pepm_rate = 0.0; 
    	bh2_pepm_price = 0.0; 
    	
    	wp_active_quantity = 0;
    	wp_active_quantity_bundle = 0;
    	wp_active_rate = 0.0;
    	wp_active_price = 0.0;
    	wp_earlyterm_quantity  = 0;
    	wp_earlyterm_price = 0.0;
    	wp_earlyterm_rate = 0.0;
    	comb_wp_pd_quantity = 0;
    	comb_wp_pd_rate = 0.0;
    	wp_active_quantity = 0;
    	comb_wp_pd_price = 0.0;

    	comb_dbt_bh2_quantity = 0;
    	comb_dbt_bh2_rate = 0.0; 
    	comb_dbt_bh2_price = 0.0; 

    	comb_htn_bh2_quantity = 0;
    	comb_htn_bh2_rate = 0.0; 
    	comb_htn_bh2_price = 0.0; 

    	comb_wm_bh2_quantity = 0;
    	comb_wm_bh2_rate = 0.0; 
    	comb_wm_bh2_price = 0.0; 

    	comb_htn_dbt_bh2_quantity = 0; 
    	comb_htn_dbt_bh2_rate = 0.0; 
    	comb_htn_dbt_bh2_price = 0.0; 
    	
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

    	//Tier 2 Variables
    	dbt2_active_quantity = 0;
    	dbt2_active_quantity_bundle = 0;
    	dbt2_active_rate = 0.0;
    	dbt2_active_price = 0.0;
    	dbt2_upfront_quantity = 0;
    	dbt2_upfront_rate = 0.0;
    	dbt2_upfront_price = 0.0;
    	dbt2_wp_quantity = 0;
    	dbt2_wp_rate = 0.0;
    	dbt2_wp_price = 0.0;
    	dbt2_admin_rate = 0.0; 
    	dbt2_admin_price = 0.0;

    	htn2_active_quantity = 0;
    	htn2_active_quantity_bundle = 0;
    	htn2_active_rate = 0.0;  
    	htn2_active_price = 0.0; 
    	htn2_upfront_quantity = 0;
    	htn2_upfront_rate = 0.0;
    	htn2_upfront_price = 0.0;
    	htn2_wp_quantity = 0;
    	htn2_wp_rate = 0.0;
    	htn2_wp_price = 0.0;
    	htn2_admin_rate = 0.0;
    	htn2_admin_price = 0.0;

    	wm2_active_quantity = 0;
    	wm2_active_quantity_bundle = 0;
    	wm2_active_rate = 0.0;  
    	wm2_active_price = 0.0; 
    	wm2_admin_rate = 0.0;
    	wm2_admin_price = 0.0;

    	pd2_active_quantity = 0;
    	pd2_active_quantity_bundle = 0;
    	pd2_active_rate = 0.0;  
    	pd2_active_price = 0.0; 
    	pd2_wp_quantity = 0;
    	pd2_wp_rate = 0.0;
    	pd2_wp_price = 0.0;
    	pd2_admin_rate = 0.0;
    	pd_admin_price = 0.0;

    	comb_htn2_dbt2_quantity = 0;
    	comb_htn2_dbt2_rate = 0.0; 
    	comb_htn2_dbt2_price = 0.0; 

    	comb_wm2_dbt2_quantity = 0;
    	comb_wm2_dbt2_rate = 0.0; 		
    	comb_wm2_dbt2_price = 0.0; 

    	comb_pd2_dbt2_quantity = 0;
    	comb_pd2_dbt2_rate = 0.0; 		
    	comb_pd2_dbt2_price = 0.0; 

    	comb_pd2_htn2_quantity = 0;
    	comb_pd2_htn2_rate = 0.0; 		
    	comb_pd2_htn2_price = 0.0; 

    	comb_wm2_pd2_quantity = 0;
    	comb_wm2_pd2_rate = 0.0; 		
    	comb_wm2_pd2_price = 0.0; 

    	comb_wm2_htn2_quantity = 0;
    	comb_wm2_htn2_rate = 0.0; 
    	comb_wm2_htn2_price = 0.0; 

    	comb_wm_htn_dbt2_quantity = 0;
    	comb_wm_htn_dbt2_rate = 0.0; 
    	comb_wm_htn_dbt2_price = 0.0; 

    	comb_wm2_htn2_dbt2_quantity = 0;
    	comb_wm2_htn2_dbt2_rate = 0.0; 
    	comb_wm2_htn2_dbt2_price = 0.0; 

    	comb_pd2_htn2_dbt2_quantity = 0;
    	comb_pd2_htn2_dbt2_rate = 0.0; 
    	comb_pd2_htn2_dbt2_price = 0.0; 

    	comb_wm2_pd2_dbt2_quantity = 0;
    	comb_wm2_pd2_dbt2_rate = 0.0; 
    	comb_wm2_pd2_dbt2_price = 0.0; 

    	comb_wm2_pd2_htn2_quantity = 0;
    	comb_wm2_pd2_htn2_rate = 0.0; 
    	comb_wm2_pd2_htn2_price = 0.0; 
    	
    	bundle_disc2_rate = 0.0;  
    	bundle_disc2_quantity = 0;
    	bundle_disc2_price = 0.0; 
    	
    	dbt_admin_quantity= 0;
    	dbt_admin_rate = 0.0;
    	htn_admin_quantity= 0;
    	htn_admin_rate = 0.0;
    	wm_admin_quantity= 0;
    	wm_admin_rate = 0.0;
    	dpp_admin_quantity= 0;
    	dpp_admin_rate = 0.0;
    	comb_htn_dbt_admin_quantity = 0;
    	comb_htn_dbt_admin_rate = 0.0;
    	comb_wm_dbt_admin_quantity = 0;
    	comb_wm_dbt_admin_rate = 0.0;
    	comb_wm_htn_admin_quantity = 0;
    	comb_wm_htn_admin_rate = 0.0;
    	comb_wm_htn_dbt_admin_quantity = 0;
    	comb_wm_htn_dbt_admin_rate = 0.0;
    	comb_wm2_htn_admin_quantity = 0;
    	comb_wm2_htn_admin_rate = 0.0;
    	comb_wm2_htn_dbt_admin_quantity = 0;
    	comb_wm2_htn_dbt_admin_rate = 0.0;
    	
    	tier2ProgramArray = [];
    	tier2JSONArray = [];
    	
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
    
    function rescheduleScrpit(){
    	var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
    	scriptTask.scriptId = runtime.getCurrentScript().id;
    	var scriptTaskId = scriptTask.submit();
    	var taskStatus = task.checkStatus(scriptTaskId);
    	
    	log.debug({
        	title: 'execute',
            details: 'Rescheduling Staus:' + taskStatus.status
        });
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