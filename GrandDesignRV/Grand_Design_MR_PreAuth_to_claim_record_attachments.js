/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/record'],
function(search, record) {
var arr_search_result = new Array();
function getInputData()
{	
	var count = 0;
	var customrecord_extend_files_autSearchObj = search.create({
	   type: "customrecord_extend_files_aut",
	   filters:
	   [
		  ["custrecord_pref_rvsclaim","anyof","@NONE@"], 
		  "AND", 
		  ["custrecord_attached_cliam_record","is","F"], 
		  "AND", 
		  ["custrecord_pref_rvspreauthoperationline","noneof","@NONE@"]
		 // "AND", 
		 // ["internalid","anyof","202","203"]
	   ],
	   columns:
	   [
		  search.createColumn({name: "internalid", label: "Extendfile ID"}),
		  search.createColumn({name: "custrecordpreauthopline_preauth",join: "CUSTRECORD_PREF_RVSPREAUTHOPERATIONLINE",label: "Pre-Auth"})
	   ]
		});

	var revenueplan_Count = customrecord_extend_files_autSearchObj.run().getRange({ start: 0, end: 1000  });
	log.audit('revenueplan_Count length:==', revenueplan_Count.length);
	var flag = true;	
	if (revenueplan_Count != null && revenueplan_Count != '' && revenueplan_Count != ' ')
        {
			var completeResultSet = revenueplan_Count;
            var start = 1000;
            var last = 2000;
		}
		
        while (revenueplan_Count.length == 1000 && flag == true)
        {
		   revenueplan_Count = customrecord_extend_files_autSearchObj.run().getRange(start, last);
            completeResultSet = completeResultSet.concat(revenueplan_Count);
            start = parseFloat(start) + 1000;
            last = parseFloat(last) + 1000;
			log.debug('completeResultSet completeResultSet:==', completeResultSet.length);
			
			if(completeResultSet.length == parseInt(10000))
			{
				flag = false;
			}
				
        }//end of  while (resultSet.length == 1000)
		revenueplan_Count = completeResultSet;
		if(revenueplan_Count)
         { 
			for(var t_tran_recrd = 0 ; t_tran_recrd <revenueplan_Count.length ; t_tran_recrd++)
			{
				var i_extend_id = revenueplan_Count[t_tran_recrd].getValue({name: "internalid"});
				var preauth = revenueplan_Count[t_tran_recrd].getValue({name: "custrecordpreauthopline_preauth",join: "CUSTRECORD_PREF_RVSPREAUTHOPERATIONLINE",label: "Pre-Auth"});
				arr_search_result.push({
								'i_extend_id' : i_extend_id,
 							'values':{
										'preauth': preauth
 									 }
						});
			}
			return arr_search_result;
		 }
}	

function map(context) 
{
	try
	{
		var lineValue = JSON.parse(context.value);
		log.debug('lineValue', lineValue);
		
		var i_extend_id = lineValue.i_extend_id;
		var preauth = lineValue.values.preauth;
		log.debug('i_extend_id', i_extend_id+'===preauth:=='+preauth);
		
		if(i_extend_id && preauth)
		{
			var customrecordrvsclaimSearchObj = search.create({
			   type: "customrecordrvsclaim",
			   filters:
			   [
				  ["custrecordclaim_preauthorization.internalid","anyof",preauth]
			   ],
			   columns:
			   [
				  search.createColumn({name: "custrecordclaim_preauthorization", label: "Pre-Authorization"}),
				  search.createColumn({name: "internalid", label: "Internal ID"})
			   ]
			});
			var i_claim_id;
			var i_count = customrecordrvsclaimSearchObj.run().getRange({ start: 0, end: 1000  });
			log.debug("i_count:==",i_count.length);
			if(i_count)
				{ 
					for(var t_tran_recrd = 0 ; t_tran_recrd < i_count.length ; t_tran_recrd++)
						{
							i_claim_id = i_count[t_tran_recrd].getValue({name: "internalid"});
							log.debug("i_claim_id:==",i_claim_id);
						}
				}
			if(i_claim_id)
			{
				var otherId = record.submitFields({
				type: 'customrecord_extend_files_aut',
				id: i_extend_id,
				values: {
					'custrecord_pref_rvsclaim':i_claim_id,
					'custrecord_attached_cliam_record':true
				}
				});
				log.debug('otherId:==',otherId);
			}	
		}	
	}
	catch(e)
	{
		log.debug('Exception Caught:',e);
	}
}//end of function map(context) 

function reduce(context) 
{	
}

function summarize_result(summary)
{
}
    return {
        getInputData: getInputData,
		map: map,
       // reduce: reduce,
       // summarize: summarize_result
    };
    
});