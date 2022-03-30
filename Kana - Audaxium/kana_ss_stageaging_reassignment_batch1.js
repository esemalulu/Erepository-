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

function isOldStatus(stat)
{
	for(var k=0; k < oldStatus.length; k++)
	{
		if(stat == oldStatus[k])
			return true;
	}
	return false;
}

function getOldestDate(d1, d2)
{
	if(d1)
	{
		var date1 = nlapiStringToDate(d1);
		var date2 = nlapiStringToDate(d2);

		if(date2.getTime() > date1.getTime())
			return d1;
		else
			return d2;
	} else {
		return d2;
	}
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
				
			
			var stage_1Interest_Age = 0;
			var flagFoundOldStageAge = false;
			var stage_1Interest_Date='';
			var stage_1Interest_Amount='';
			var stage_1Interest_Amount_USD='';
			var stage_1Interest_Exp_Close_Date='';


			for(var j=2; j<=8; j++) 
			{
				if(agingRecord.getFieldValue('custrecord_stage'+j+'_age')) 
				{
					//Calculate summation of Old Stage Ages
					stage_1Interest_Age += parseInt(agingRecord.getFieldValue('custrecord_stage'+j+'_age'));
					flagFoundOldStageAge = true;
				}

				//Dump the retired stage data into 1 Interest
				if(agingRecord.getFieldValue('custrecord_stage'+j+'_date')) 
				{
					stage_1Interest_Date = getOldestDate(stage_1Interest_Date,agingRecord.getFieldValue('custrecord_stage'+j+'_date'));
				}
				if(agingRecord.getFieldValue('custrecord_stage'+j+'_amount')) 
				{
					stage_1Interest_Amount = agingRecord.getFieldValue('custrecord_stage'+j+'_amount');
				}
				if(agingRecord.getFieldValue('custrecord_stage'+j+'_amountusd')) 
				{
					stage_1Interest_Amount_USD = agingRecord.getFieldValue('custrecord_stage'+j+'_amountusd');
				}
				if(agingRecord.getFieldValue('custrecord_stage'+j+'_exp_close')) 
				{
					stage_1Interest_Exp_Close_Date = agingRecord.getFieldValue('custrecord_stage'+j+'_exp_close');
				}
			
			}//for j
			
			if(flagFoundOldStageAge)
				agingRecord.setFieldValue('custrecord_stage6_age',stage_1Interest_Age);

			if(stage_1Interest_Date)
				agingRecord.setFieldValue('custrecord_stage6_date',stage_1Interest_Date);
			
			if(stage_1Interest_Amount)
				agingRecord.setFieldValue('custrecord_stage6_amount',stage_1Interest_Amount);
			
			if(stage_1Interest_Amount_USD)
				agingRecord.setFieldValue('custrecord_stage6_amountusd',stage_1Interest_Amount_USD);
			
			if(stage_1Interest_Exp_Close_Date)
				agingRecord.setFieldValue('custrecord_stage6_exp_close',stage_1Interest_Exp_Close_Date);

			var prev_stage = agingRecord.getFieldValue('custrecord_stageprevious');
			var curr_stage = agingRecord.getFieldValue('custrecord_stagecurrent');			
	
			if(isOldStatus(prev_stage) || prev_stage == '23')
			{
				//set previous stage to 1 Interest
				agingRecord.setFieldValue('custrecord_stageprevious','23');

				//update Age and Date information
				if(flagFoundOldStageAge)
					agingRecord.setFieldValue('custrecord_stageprevious_age',stage_1Interest_Age);

				if(stage_1Interest_Date)
					agingRecord.setFieldValue('custrecord_stageprevious_date',stage_1Interest_Date);

			}

			if(isOldStatus(curr_stage) || curr_stage == '23')
			{
				//set current stage to 1 Interest
				agingRecord.setFieldValue('custrecord_stagecurrent','23');

				//update Age and Date information
				if(flagFoundOldStageAge)
					agingRecord.setFieldValue('custrecord_stagecurrent_age',stage_1Interest_Age);

				if(stage_1Interest_Date)
					agingRecord.setFieldValue('custrecord_stagecurrent_date',stage_1Interest_Date);
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

			