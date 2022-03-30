/*
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change History
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2011
Author		: Sagar Shah
Date		: 01/04/2011
Description	: Implement new Sales Stages suggested by Chip
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var fx = 'kana_stageage_reassignment';

/*
List of Old Stages
===================
ID  Stage Name
===============
19	1 Awareness & Investigation
20	1.1 Suspect Enterprise
21	1.2 Contact
22	1.3 Active Suspect
23	2 Interest
24	2.5 Hand-Off to Sales
25	3 Education
26	4 Strategy
27	5 Initiative/Project
29	6 Recommendation
30	7 Decision
32	Closed
18	Closed - Coterm
17	Lost Opportunity
33	Unqualified
31	Closed Won

*/

var status = new Array(33,19,20,21,22,23,24,25,26,27,29,30);
var status0 = new Array(17,7,6);
var status20 = new Array(31,32,18);

var oldStatus = new Array(19,20,21,22,24,25);
//Stage ids not in use : 19, 20, 21, 22, 24, 25
//'status' array index : 2,3,4,5,7,8

function getstage(id)
{
	var retval = -1;
	var i;

	for (i = 0; status0 != null && i < status0.length; i++ )
	{
		if(id == status0[i]) { return 0; }
	} //status 0 compare

	for (i = 0; status20 != null && i < status20.length; i++ )
	{
		if(id == status20[i]) { return 20;}
	} //status 10 compare

	for (i = 0; status != null && i < status.length; i++ )
	{
		if(id == status[i]) { return (i + 1); }
	} //status compare

	return retval;
}

function findstageage(date1, date2)
{
	var diff = 0;
	
	if(date1 && date2)
	{
		var d1 = nlapiStringToDate(date1);
		var d2 = nlapiStringToDate(date2);
		
		var day = 1000*60*60*24;
		diff = Math.round((d2.getTime() - d1.getTime())/(day));	

	}

	return diff;
	
}

function kana_stageage_reassignment()
{
	var columns = new Array();
	var rec;
	var recid; 
		
	try{

		columns[0] = new nlobjSearchColumn('internalid');					

		// Calculate Current Age
		var searchresults = nlapiSearchRecord('customrecord_opp_stages', 'customsearch_aging_age_reassignment', null, columns);
		
		if(searchresults != null) {
			nlapiLogExecution('DEBUG', fx + ' 110', 'Search Size : '+searchresults.length);
		}
	
		for (i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			rec  = searchresults[i]; 
			recid = rec.getValue('internalid');
			var agingRecord = nlapiLoadRecord('customrecord_opp_stages',recid);
				
			var prev_stage = agingRecord.getFieldValue('custrecord_stageprevious');
			var curr_stage = agingRecord.getFieldValue('custrecord_stagecurrent');
			var opp_stage = agingRecord.getFieldValue('custrecord_stage_oppstatus');
			
			//If both previous and current stages are same as '1 Interest', reset Previous stage values
			if(prev_stage == '23' && curr_stage == '23')
			{
				agingRecord.setFieldValue('custrecord_stageprevious_age',0);
			}
			
			//Address issue when Oppty stage was changed to New Stage (out of mapping)
			if(curr_stage != opp_stage)
			{
				var newStageId = getstage(opp_stage);
				var oldStageId = getstage(curr_stage);

				//copy the data values from old to new Stage
				var todaysDate = new Date();
				var ageFrom3rdJan = findstageage('01/03/2011', nlapiDateToString(todaysDate));
				
				//For closed stages, the age is always 0
				if(getstage(opp_stage) == 20 || getstage(opp_stage) == 0)
					agingRecord.setFieldValue('custrecord_stage'+newStageId+'_age',0);
				else
					agingRecord.setFieldValue('custrecord_stage'+newStageId+'_age',ageFrom3rdJan);

				//agingRecord.setFieldValue('custrecord_stage'+newStageId+'_date',nlapiDateToString(todaysDate));
				agingRecord.setFieldValue('custrecord_stage'+newStageId+'_date','01/03/2011');
				
				var oldAmount = agingRecord.getFieldValue('custrecord_stage'+oldStageId+'_amount');
				if(oldAmount) 
					agingRecord.setFieldValue('custrecord_stage'+newStageId+'_amount',oldAmount);
				
				var oldAmountUSD = agingRecord.getFieldValue('custrecord_stage'+oldStageId+'_amountusd');
				if(oldAmountUSD) 
					agingRecord.setFieldValue('custrecord_stage'+newStageId+'_amountusd',oldAmountUSD);
				
				var oldExpCloseDate = agingRecord.getFieldValue('custrecord_stage'+oldStageId+'_exp_close');
				if(oldExpCloseDate) 
					agingRecord.setFieldValue('custrecord_stage'+newStageId+'_exp_close',oldExpCloseDate);

				agingRecord.setFieldValue('custrecord_stagecurrent',opp_stage);

				if(getstage(opp_stage) == 20 || getstage(opp_stage) == 0)
					agingRecord.setFieldValue('custrecord_stagecurrent_age',0);
				else
					agingRecord.setFieldValue('custrecord_stagecurrent_age',ageFrom3rdJan);

				agingRecord.setFieldValue('custrecord_stagecurrent_date','01/03/2011');

				agingRecord.setFieldValue('custrecord_stageprevious',curr_stage);
				
				var oldStageAge_calcValue = parseInt(agingRecord.getFieldValue('custrecord_stage'+oldStageId+'_age')) - ageFrom3rdJan;

				if(getstage(curr_stage) == 20 || getstage(curr_stage) == 0)
				{
					agingRecord.setFieldValue('custrecord_stage'+oldStageId+'_age',0);
					agingRecord.setFieldValue('custrecord_stageprevious_age',0);
				}
				else
				{
					agingRecord.setFieldValue('custrecord_stage'+oldStageId+'_age',oldStageAge_calcValue);
					agingRecord.setFieldValue('custrecord_stageprevious_age',oldStageAge_calcValue);
				}

				agingRecord.setFieldValue('custrecord_stageprevious_date',agingRecord.getFieldValue('custrecord_stage'+oldStageId+'_date'));
										
			}
			
			nlapiSubmitRecord(agingRecord);
		}// for search
	} // try
	catch(e)
	{
            if ( e instanceof nlobjError )
                nlapiLogExecution( 'ERROR', fx + ' system error', e.getCode() + '\n' + e.getDetails() )
            else
                nlapiLogExecution( 'ERROR', fx + ' unexpected error', e.toString() )

	} //catch
} //end

			