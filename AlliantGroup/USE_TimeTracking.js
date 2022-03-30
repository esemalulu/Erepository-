// BEGIN SCRIPT DESCRIPTION BLOCK  ==================================
{
/*
   	Script Name:
	Author:
	Company:
	Date:
	Description:


	Script Modification Log:

	-- Date --			-- Modified By --				--Requested By--				-- Description --



Below is a summary of the process controls enforced by this script file.  The control logic is described
more fully, below, in the appropriate function headers and code blocks.


     BEFORE LOAD
		- beforeLoadRecord(type)



     BEFORE SUBMIT
		- beforeSubmitRecord(type)


     AFTER SUBMIT
		- afterSubmitRecord(type)



     SUB-FUNCTIONS
		- The following sub-functions are called by the above core functions in order to maintain code
            modularization:

               - NOT USED

*/
}
// END SCRIPT DESCRIPTION BLOCK  ====================================



// BEGIN GLOBAL VARIABLE BLOCK  =====================================
{
	//  Initialize any Global Variables, in particular, debugging variables...




}
// END GLOBAL VARIABLE BLOCK  =======================================





// BEGIN BEFORE LOAD ==================================================

function beforeLoadRecord(type)
{

	/*  On before load:

          - EXPLAIN THE PURPOSE OF THIS FUNCTION

		-


		FIELDS USED:

          --Field Name--				--ID--


	*/



	//  LOCAL VARIABLES

    //  BEFORE LOAD CODE BODY


	return true;



}

// END BEFORE LOAD ====================================================





// BEGIN BEFORE SUBMIT ================================================

function beforeSubmitRecord(type)
{
    /*  On before submit:

          - PURPOSE
		-

          FIELDS USED:

          --Field Name--				--ID--
    */


    //  LOCAL VARIABLES


    //  BEFORE SUBMIT CODE BODY


	return true;

}

// END BEFORE SUBMIT ==================================================





// BEGIN AFTER SUBMIT =============================================

function afterSubmitRecord(type)
{
    /*  On after submit:

          - PURPOSE
		-

	FIELDS USED:

          --Field Name--				--ID--


    */

	//  LOCAL VARIABLES

	//  AFTER SUBMIT CODE BODY
	
	var Job_filter = new Array();
	var Job_column = new Array();
	
	var internalid = nlapiGetRecordId();
	nlapiLogExecution('DEBUG', 'After Submit', 'internalid='+ internalid+"  type= "+nlapiGetRecordType());
	
	var TimeObj = nlapiGetNewRecord();
	
	nlapiLogExecution('DEBUG', 'After Submit', 'TimeObj='+ TimeObj);
	var id = TimeObj.getId();
	nlapiLogExecution('DEBUG', 'After Submit', 'id='+ id);
	
	var project = TimeObj.getFieldValue('customer');
	nlapiLogExecution('DEBUG', 'After Submit', 'project='+ project);
	var taskid = TimeObj.getFieldValue('casetaskevent');
	nlapiLogExecution('DEBUG', 'After Submit', 'taskid='+ taskid);
	
	
	if (taskid != null && taskid != 'undefined' && taskid != '') 
	{
		var taskObj = nlapiLoadRecord('projecttask', taskid);
		nlapiLogExecution('DEBUG', 'After Submit', 'taskObj='+ taskObj);
		
		
		///*********************************************//
		var jobinternalid = taskObj.getFieldValue('company');
		nlapiLogExecution('DEBUG', 'After Submit', 'jobinternalid='+ jobinternalid);
		//var taskid = nlapiGetRecordId();
		
		var projMileComp = 0.0;
		var percenttimecomplete = 0;
		var weighted = 0;
		var percentprojtimecomplete = 0;
		
		
		//var taskObj = nlapiLoadRecord('projecttask', taskid);
		percenttimecomplete = taskObj.getFieldValue('percenttimecomplete');
		
		
		weighted = taskObj.getFieldValue('custevent_weightedfactor');
		taskStatus = taskObj.getFieldValue('status');
		
		if (percenttimecomplete != '' && percenttimecomplete != null && percenttimecomplete != 'undefined') 
		{
			if(weighted!='' && weighted!=null && weighted!='undefined')
			{
				if(weighted!='' && weighted!=null && weighted!='undefined')
				{
					if (taskStatus != 'COMPLETE') 
					{
						projMileComp=(parseFloat(percenttimecomplete)*(parseFloat(weighted)/100));	
					}
					else if (taskStatus == 'COMPLETE')
					{
						projMileComp=(parseFloat(100)*(parseFloat(weighted)/100));
					}
						
				}
			}
		}
		nlapiLogExecution('DEBUG', 'After Submit', 'projMileComp='+ projMileComp);
		if (projMileComp != null && projMileComp != '' && projMileComp != 'undefined') 
		{
			taskObj.setFieldValue('custevent_projecttaskmilestonecomplete', parseFloat(projMileComp))
		}
		else 
		{
			taskObj.setFieldValue('custevent_projecttaskmilestonecomplete', parseFloat(projMileComp))
		}
		
		Job_filter[0] = new nlobjSearchFilter('company', null, 'is', jobinternalid);
		
		Job_column[0] = new nlobjSearchColumn('custevent_projecttaskmilestonecomplete');
		Job_column[1] = new nlobjSearchColumn('internalid');
		
		searchresults = nlapiSearchRecord('projecttask', null, Job_filter, Job_column);
		nlapiLogExecution('DEBUG', 'After Submit', 'searchresults='+ searchresults);
		
		if (searchresults != null) 
		{
		
			for (var m = 0; searchresults != null && m < searchresults.length; m++) 
			{
				var projtaskmilestone = searchresults[m].getValue('custevent_projecttaskmilestonecomplete')
				if (projtaskmilestone != null && projtaskmilestone != 'undefined' && projtaskmilestone != '') 
				{
					if (taskid != searchresults[m].getValue('internalid')) 
					{
						percentprojtimecomplete += parseFloat(projtaskmilestone);
					}
				}
				
			}
			percentprojtimecomplete += parseFloat(projMileComp);
			nlapiLogExecution('DEBUG', 'After Submit', 'percentprojtimecomplete='+ percentprojtimecomplete);
			if (percentprojtimecomplete != null && percentprojtimecomplete != 'undefined' && percentprojtimecomplete != '') 
			{
				var jobObj = nlapiLoadRecord('job', jobinternalid);
				jobObj.setFieldValue('custentity_percentmilecomp', percentprojtimecomplete)
				nlapiSubmitRecord(jobObj, false, true);
			}
		}
		nlapiSubmitRecord(taskObj, false, true);
	}
}

// END AFTER SUBMIT ===============================================





// BEGIN FUNCTION ===================================================
{



}
// END FUNCTION =====================================================
