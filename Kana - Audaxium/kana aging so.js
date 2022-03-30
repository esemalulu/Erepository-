/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
* @ FILENAME      : kana_aging_so.js
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
Change		: CH#NEW_STAGE_2011
Author		: Sagar Shah
Date		: 01/04/2011
Description	: Implement new Sales Stages suggested by Chip
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2012
Author		: Sagar Shah
Date		: 02/15/2012
Description	: Implement new Sales Stages for 2012
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#CHANGE_OPPDATE
Author		: Sagar Shah
Date		: 07/31/2012
Description	: Change the code such that the system takes today's date as status change date instead of transaction date
			  This would avoid generation of negative age value
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2012_NOV
Author		: Sagar Shah
Date		: 11/01/2012
Description	: Implement new Sales Stages suggested by Jim Bureau
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var fx = 'kana_aging so';

//CH#NEW_STAGE_2012 - start
//var status = new Array(33,19,20,21,22,23,24,25,26,27,29,30);
//var status0 = new Array(17,7,6);
//var status20 = new Array(31,32,18);

//var status = new Array(33,34,20,21,22,23,24,25,26,27,29,30);//19 replaced by 34
//var status0 = new Array(17,7,6);
//var status20 = new Array(31,32,18);
//CH#NEW_STAGE_2012 - end

//CH#NEW_STAGE_2011 - start
var oldStatus = new Array(19,20,21,22,24,25);
//Stage ids not in use : 19, 20, 21, 22, 24, 25
//'status' array index : 2,3,4,5,7,8

//CH#NEW_STAGE_2012_NOV - start
var statusSequence = new Array(33,34,20,21,22,23,24,25,26,27,35,36,37,29,38,30);//This is needed to determine higher stage in fn 'gethigher'
var status = new Array(33,34,20,21,22,23,24,25,26,27,29,30,35,36,37,38);//added 35,36,37 and 38
var status0 = new Array(17,7,6); 
var status20 = new Array(31,32,18);
var sNetsuiteEmailId = 16921; //appscriptnotification@kana.com

//CH#NEW_STAGE_2012_NOV - end

function isOldStatus(stat)
{
	for(var k=0; k < oldStatus.length; k++)
	{
		if(stat == oldStatus[k])
			return true;
	}
	return false;
}
//CH#NEW_STAGE_2011 - end


function gethigher(id, high)
{
	var retval = high;
	var curr = 0;
	var new1 = 0;
	var i;

	//CH#NEW_STAGE_2011 - start	
	if(isOldStatus(high))
		return id;
	//CH#NEW_STAGE_2011 - end

	//CH#NEW_STAGE_2012_NOV - start
	//Use statusSequence instead of status array
	for (i = 0; statusSequence != null && i < statusSequence.length; i++ )
	{
		if(id == statusSequence[i])
		{
			new1 = i;
		}

		if(high == statusSequence[i])
		{
			curr = i;
		}		
	}
//CH#NEW_STAGE_2012_NOV - end

	if(new1 > curr)
	{
		retval = id;
	}
	
	return retval;
}

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

function afterSubmit(type)
{
	var so;
	var opp;
	var prevhigh;
	var newhigh;
	
	var currentRecord;
	var oldRecord;	
	var cstage;
	var ostage;
	var oppid;
	var oppdate;
	var stageid;
	var stageage;
	
	var expclose;
	var amt;
	var rate;
	var conv;

	fx = 'kana aging so aftersubmit';

	var crec;
	var id;

	var fields = new Array();
	var values = new Array();
	var ctr = 0;

	try
	{
	   	if ( type == 'create' )
   		{
			nlapiLogExecution('DEBUG', fx + ' 100', 'Begin');
		
			so = nlapiGetNewRecord();
			opp = so.getFieldValue('opportunity');
			if(!opp){ return;} //no aging data
			
			//SO Data
			rate = parseFloat(so.getFieldValue('exchangerate'));
			if(isNaN(rate)) { rate = 1;} 
			
			//CH#CHANGE_OPPDATE
			expclose = nlapiDateToString(new Date());			
			//expclose = so.getFieldValue('trandate'); //same as so date
			amt = getnumber(so.getFieldValue('subtotal'));
			
			//Opportunity Data
			currentRecord = nlapiLoadRecord('opportunity', opp);
			oppid = currentRecord.getId();
			oppdate = expclose; //same as so date
			
			crec = findstagerec(oppid);
			if(crec == null) //CH#NEW_STAGE_2012_NOV
			{ 
				return; 
			}//No Aging Record found - return
				
			//Always edit as opportunity exists
			cstage = crec.getFieldValue('custrecord_stage_oppstatus');
			ostage = crec.getFieldValue('custrecord_stagecurrent');
			nlapiLogExecution('DEBUG', fx + ' 300', 'Old Stage: ' + ostage);
			
			if(getstage(ostage) == 20) //There are multiple closed stages; return if the opportunity was already marked as closed
			{				
				return;
			}
		
			conv = rate * amt;
			fields[ctr] = 'custrecord_stage_stalled';
			values[ctr] = 'F';
			ctr++;

			fields[ctr] = 'custrecord_stagecurrent';
			values[ctr] = cstage;
			ctr++;

			fields[ctr] = 'custrecord_stagecurrent_date';
			values[ctr] = oppdate;
			ctr++;
								
			fields[ctr] = 'custrecord_stageprevious';
			values[ctr] = ostage;
			ctr++;

			// Prev Stage
			stageid = getstage(ostage);
			nlapiLogExecution('DEBUG', fx + ' 320', 'Old Stage #: ' + stageid);
		
					
			//CH#NEW_STAGE_2012_NOV - start
			//removed the redundant switch statement
			fields[ctr] = 'custrecord_stageprevious_date';
			values[ctr] = crec.getFieldValue('custrecord_stage'+stageid+'_date');
			ctr++;

			stageage = findstageage(crec.getFieldValue('custrecord_stage'+stageid+'_date'), oppdate);
			fields[ctr] = 'custrecord_stage'+stageid+'_age';
			values[ctr] = stageage;
			ctr++;

			fields[ctr] = 'custrecord_stageprevious_age';
			values[ctr] = stageage;
			ctr++;
			
			//CH#NEW_STAGE_2012_NOV - end

			// New Stage
			stageid = 20; //getstage(cstage); Always set to 20
			nlapiLogExecution('DEBUG', fx + ' 360', 'New Stage #: ' + stageid);
					
			fields[ctr] = 'custrecord_stage20_date';
			values[ctr] = oppdate;
			ctr++;
											
			fields[ctr] = 'custrecord_stage20_age';
			values[ctr] = 0;
			ctr++;
							
			fields[ctr] = 'custrecord_stagecurrent_age';
			values[ctr] = 0;
			ctr++;

			fields[ctr] = 'custrecord_stage20_amount';
			values[ctr] = amt.toFixed(2);
			ctr++;

			fields[ctr] = 'custrecord_stage20_exp_close';
			values[ctr] = expclose;
			ctr++;
							
			fields[ctr] = 'custrecord_stage20_amountusd';
			values[ctr] = conv.toFixed(2);
			ctr++;		
			
			nlapiSubmitField('customrecord_opp_stages', crec.getId(), fields, values);
	
		}// if type
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


function findstagerec(oppid)
{
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'custrecord_opp_id', null, 'anyof', oppid, null);
	filters[1] = new nlobjSearchFilter( 'isinactive', null, 'anyof', 'F', null);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	//CH#NEW_STAGE_2012_NOV - start
	//removed redundant code
	var searchresults = nlapiSearchRecord( 'customrecord_opp_stages', null, filters, columns);
	
	if(searchresults)
	{ 
		return nlapiLoadRecord('customrecord_opp_stages', searchresults[0].getValue('internalid'));
	}
	
	return null;	
	//CH#NEW_STAGE_2012_NOV - end

} // end findstagerec

function findstageage(date1, date2)
{
	var diff = 0;
	
	if(date1 && date2)
	{
		var d1 = nlapiStringToDate(date1);
		var d2 = nlapiStringToDate(date2);
	
		nlapiLogExecution('DEBUG', fx + ' 350', 'D1: ' + date1 + ', D2: ' + date2);
		nlapiLogExecution('DEBUG', fx + ' 360', 'D1: ' + d1 + ', D2: ' + d2);
	
		var day = 1000*60*60*24;
		diff = Math.round((d2.getTime() - d1.getTime())/(day));	

		nlapiLogExecution('DEBUG', fx + ' 350', 'Date 1: ' + d1 + ', Date 2: ' + d2 + ', Date Diff #: ' + diff);
	}

	return diff;
	
}

function getnumber(id)
{
	var ret;
	ret = parseFloat(id);
	if(isNaN(ret))
	{
		ret = 0;
	}
	return ret;

}// getnumber