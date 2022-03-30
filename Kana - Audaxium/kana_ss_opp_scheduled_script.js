/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
* @ FILENAME      : kana_opp_scheduled_script.js
* @ AUTHOR        : Upaya
* @ DATE          : 2008/12/28
*
* Copyright (c) 2007-2009 Upaya - The Solution Inc. 
* 10530 N. Portal Avenue, Cupertino CA 95014
* All Rights Reserved.
*
* This software is the confidential and proprietary information of 
* Upaya - The Solution Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with Upaya.
*
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#ELIMINATE_CLOSED_OPPTY
Author		: Sagar Shah
Date		: 02/15/2012
Description	: Filter the search to eliminate closed oppty or those that are already processed
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2012
Author		: Sagar Shah
Date		: 02/15/2012
Description	: Implement new Sales Stages for 2012
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#ELIMINATE_OLD_SUBSIDIARY
Author		: Sagar Shah
Date		: 03/29/2012
Description	: Filter the search to eliminate oppty belonging to old subsidiary
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2012_NOV
Author		: Sagar Shah
Date		: 11/01/2012
Description	: Implement new Sales Stages suggested by Jim Bureau
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var fx = 'kana_opp_scheduled';

//CH#NEW_STAGE_2012 - start
//var status = new Array(33,19,20,21,22,23,24,25,26,27,29,30);
//var status0 = new Array(17,7,6);
//var status20 = new Array(31,32,18);

//var status = new Array(33,34,20,21,22,23,24,25,26,27,29,30);//19 replaced by 34
//var status0 = new Array(17,7,6);
//var status20 = new Array(31,32,18);
//CH#NEW_STAGE_2012 - end

//CH#NEW_STAGE_2012_NOV - start
var status = new Array(33,34,20,21,22,23,24,25,26,27,29,30,35,36,37,38);//added 35,36,37 and 38
var status0 = new Array(17,7,6); 
var status20 = new Array(31,32,18);
var sNetsuiteEmailId = 16921; //appscriptnotification@kana.com

//CH#NEW_STAGE_2012_NOV - end

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


function findstageage(date1)
{
	var d1 = nlapiStringToDate(date1);
	var d2 = new Date();
	
	var day = 1000*60*60*24;
	//var diff = Math.round((d2.getTime() - d1.getTime())/(day));	
	var diff = Math.floor((d2.getTime() - d1.getTime())/(day));	

	return diff;
	
}

function kana_opp_scheduled()
{
	var columns = new Array();
	var filters = new Array();//CH#ELIMINATE_CLOSED_OPPTY
	var rec;
	var recid; 
		
	var stage;
	var stageid;
	var stagedate;
	var stageage;

	var otherage;

	var ctr = 0;

	var ncflag = 'F';

	var today = nlapiDateToString(new Date());

	try{

		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('custrecord_opp_id');
		columns[2] = new nlobjSearchColumn('custrecord_stagecurrent');
		columns[3] = new nlobjSearchColumn('custrecord_stagecurrent_date');
		columns[4] = new nlobjSearchColumn('custrecord_stagecurrent_age');
		columns[5] = new nlobjSearchColumn('custrecord_stageprevious');
		columns[6] = new nlobjSearchColumn('custrecord_stageprevious_date');
		columns[7] = new nlobjSearchColumn('custrecord_stageprevious_age');
		columns[8] = new nlobjSearchColumn('custrecord_stageaging_script');
		columns[9] = new nlobjSearchColumn('custrecord_stage_stalled');
				

		//CH#ELIMINATE_CLOSED_OPPTY -start
		filters[0] = new nlobjSearchFilter( 'probability','custrecord_stagecurrent', 'between', '1','99');//do not
		filters[1] = new nlobjSearchFilter( 'custrecord_stageaging_script',null, 'noton', 'today');
		//CH#ELIMINATE_OLD_SUBSIDIARY - start
		var subList = new Array();
		subList[0] = "Kana Software Netherlands";
		subList[1] = "Lagan Technologies Ltd (UK)";
		filters[2] = new nlobjSearchFilter( 'subsidiary','custrecord_opp_id', 'noneof', subList);
		//CH#ELIMINATE_OLD_SUBSIDIARY - end

		columns[0].setSort();
		//CH#ELIMINATE_CLOSED_OPPTY - end

		// Calculate Current Age
		var searchresults = nlapiSearchRecord('customrecord_opp_stages', 'customsearch_aging_age', filters, columns);////CH#ELIMINATE_CLOSED_OPPTY
		
		if(searchresults != null) {
			nlapiLogExecution('DEBUG', fx + ' 110', 'Search Size : '+searchresults.length);
		}
	
		for (i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			rec  = searchresults[i]; 
			recid = rec.getValue('internalid');
			stagedate = rec.getValue('custrecord_stagecurrent_date');
			
			var fields = new Array();
			var values = new Array();
			ctr = 0;
			ncflag = 'F';

			if(stagedate)
			{
				stageage = findstageage(stagedate);
			}
			else
			{
				stageage = 0;
			}
			
			stage = rec.getValue('custrecord_stagecurrent');
			stageid = getstage(stage);

			nlapiLogExecution( 'DEBUG', fx + ' 20-' + i, 'Rec Id: ' + recid + ' Current Stage: ' + stage + ' Stage Id: ' + stageid);
			//nlapiLogExecution( 'DEBUG', fx + ' 21-' + i, 'Stage Date: ' + stagedate + ' Stage Age: ' + stageage);

			fields[ctr] = 'custrecord_stagecurrent_age';
			values[ctr] = stageage;
			ctr++;

			//CH#NEW_STAGE_2012_NOV - start
			//removed the redundant switch statement
			if(stageid >0 && stageid<20) 
			{
				fields[ctr] = 'custrecord_stage'+stageid+'_age';
				values[ctr] = stageage;
				ctr++;			
			}

			//CH#NEW_STAGE_2012_NOV - end
			
			fields[ctr] = 'custrecord_stageaging_script';
			values[ctr] = today;
			ctr++;

			nlapiSubmitField('customrecord_opp_stages', recid, fields, values);
		}// for search
	} // try
	catch(e)
	{
			var errorText='';
            if ( e instanceof nlobjError )
				errorText = e.getCode() + '\n' + e.getDetails();
            else
				errorText = e.toString();

			nlapiLogExecution( 'ERROR', fx + ' unexpected error', errorText);
			nlapiSendEmail(sNetsuiteEmailId, 'kana-app-notification@kana.com', 'Error Message', errorText, null, null);
	} //catch
} //end
			