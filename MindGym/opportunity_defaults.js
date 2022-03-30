// BEGIN SCRIPT DESCRIPTION BLOCK  ==================================
{
/*
   	Script Name: 	opportunity_default.js
	Author: 		Brian Moores
	Company: 		NetSuite
	Date: 			2008-01-29
	Version: 		1.0

Below is a summary of the process controls enforced by this script file.  The control logic is described
more fully, below, in the appropriate function headers and code blocks.
  
	
     PAGE INIT
		Capture opportunity form name to be used in searching by type.


     SAVE RECORD
		- NOT USED


	
     VALIDATE FIELD
		- NOT USED


	
     FIELD CHANGED
		- NOT USED


	
     VALIDATE LINE
		- NOT USED


     
     RECALC
		- NOT USED
		

     POSTSOURCING
		- NOT USED
		
		
     LINEINIT
		- NOT USED
		
		


     SUB-FUNCTIONS
		- The following sub-functions are called by the above core functions in order to maintain code
            modularization:
			
               - NOT USED

*/            
}
// END SCRIPT DESCRIPTION BLOCK  ====================================	



// BEGIN GLOBAL VARIABLE BLOCK  =====================================
{
	//
	//  Initialize any Global Variables, in particular, debugging variables...
	//
	
	
	//  Initialize standard event debug flags
	var debugPageInit	= false;	// allows independent testing of Page Init scripts
	var debugSave		= false;	// allows testing of On Save scripts, without actually saving
	var debugValField	= false;	// allows independent testing of Validate Field scripts
	var debugFldChanged = false;	// allows independent testing of Field Changed scripts
	var debugValLine	= false;	// allows independent testing of Validate Line scripts
	var debugRecalc	= false;	// allows independent testing of Recalc scripts
	

	//  Initialize specialized debug flags
	var debugScriptRev	= false;	// pop an alert box on form init with script rev. level
	
	
	//  Initialize script rev level...
	//  Change this number with each version increase.  An alert box will pop on page init.
	var scriptVersion = "1.0";	// Pops an alert box on page init with this rev #


	// Set Global Environment Variables
	
	
}
// END GLOBAL VARIABLE BLOCK  =======================================





// BEGIN PAGE INIT ==================================================

function pageInit()
{

	/*  On page init:
		
          Capture opportunity form name to be used in searching by type.
		
          
		FIELDS USED:
		
          --Field Name--				--ID--
          Form Name						customform
          Opportunity Type				custbody_opportunity_type
		
          
	*/
	

	//
	//  LOCAL VARIABLES
	//
	
	
	
	//
	//  PAGE INIT CODE BODY
	//
	var varName = nlapiGetFieldText('customform');
	nlapiSetFieldValue('custbody_custom_form',varName);	
	
	//  Pops an alert box on page init with the script version number defined as a Global variable.
	if (debugScriptRev) alert("Script version number: " + scriptVersion);
	
	
}

// END PAGE INIT ====================================================





// BEGIN SAVE RECORD ================================================

function saveRecord(type, fld)
{

	/*  On save record:
		
          - EXPLAIN THE PURPOSE OF THIS FUNCTION 
		
		
          FIELDS USED:
		
          --Field Name--				--ID--
		
		
    */


	//
	//  LOCAL VARIABLES
	//
	
	
	
	//	
	//  SAVE RECORD CODE BODY
	//
	
	
	
	//  allows testing of On Save scripts, without actually saving...
	if ( debugSave )
	{
		return confirm("Are you sure you want to save this record?");
	}
	else
	{
		return true;  	// if you have not returned false yet, the return true
	};

}

// END SAVE RECORD ==================================================





// BEGIN VALIDATE FIELD =============================================

function validateField(type, fld)
{

	/*  On validate field:
		
          - EXPLAIN THE PURPOSE OF THIS FUNCTION 
		
		
          FIELDS USED:
		
          --Field Name--				--ID--
		
		
    */


	//
	//  LOCAL VARIABLES
	//
	
	
	
	//
	//  VALIDATE FIELD CODE BODY
	//
	
	return true;

}

// END VALIDATE FIELD ===============================================





// BEGIN FIELD CHANGED ==============================================

function fieldChanged(type, fld)
{

	/*  On field changed:
		
          - EXPLAIN THE PURPOSE OF THIS FUNCTION 
		
		
          FIELDS USED:
		
          --Field Name--				--ID--
		
		
    */


	//
	//  LOCAL VARIABLES
	//
	
	
	
	//	
	//  FIELD CHANGED CODE BODY
	//
	

}

// END FIELD CHANGED ================================================





// BEGIN VALIDATE LINE ==============================================

function validateLine(type)
{

	/*  On validate line:
		
          - EXPLAIN THE PURPOSE OF THIS FUNCTION 
		
		
          FIELDS USED:
		
          --Field Name--				--ID--
		
		
    */


	//
	//  LOCAL VARIABLES
	//
	
	
	
	//	
	//  VALIDATE LINE CODE BODY
	//
	
	return true;
	
}

// END VALIDATE LINE ================================================





// BEGIN RECALC =====================================================

function recalc(type)
{

	/*  On recalc:
		
          - EXPLAIN THE PURPOSE OF THIS FUNCTION 
		
		
          FIELDS USED:
		
          --Field Name--				--ID--
		
		
    */


	//
	//  LOCAL VARIABLES
	//
	
	
	
	//	
	//  RECALC CODE BODY
	//
	
	
	
}

// END RECALC =======================================================





// BEGIN POST SOURCING =====================================================

function postSourcing(type,fld)
{

	/*  On recalc:
		
          - EXPLAIN THE PURPOSE OF THIS FUNCTION 
		
		
          FIELDS USED:
		
          --Field Name--				--ID--
		
		
    */


	//
	//  LOCAL VARIABLES
	//
	
	
	
	//	
	//  POST SOURCING CODE BODY
	//
	
	
	
}

// END POST SOURCING =======================================================



// BEGIN LINE INIT =====================================================

function lineInit(type)
{

	/*  On recalc:
		
          - EXPLAIN THE PURPOSE OF THIS FUNCTION 
		
		
          FIELDS USED:
		
          --Field Name--				--ID--
		
		
    */


	//
	//  LOCAL VARIABLES
	//
	
	
	
	//	
	//  LINE INIT CODE BODY
	//
	
	
	
}

// END LINE INIT =======================================================





// BEGIN FUNCTION ===================================================

function f1()
{

	/*	On function call:
		
          - EXPLAIN THE PURPOSE OF THIS FUNCTION 
		
		
          CALLED FROM:
			
			- ??
          
          
          FIELDS USED:
		
          --Field Name--				--ID--
		
		
	*/
	

	//
	//  LOCAL VARIABLES
	//
	
	
	
	//
	//  CODE BODY
	//
	
	
	
}

// END FUNCTION =====================================================
