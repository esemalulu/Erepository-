/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.0      09 Apr 2014     David Norris 
 * * Company		Fourth Wave Consulting - www.fourthwc.com sales@fourthwc.com
 * 
 * Name of Script	Update-Coach-Bonus_Scheduled-Script.js
 * 
 * Date			4/9/2014
 * 
 * Version		1.0
 * 
 * Type			Scheduled script
 *
 * Sub-Type		Once per day. Scheduled scripts are always run in the Pacific time zone per NetSuite. 
 * 
 * Description		Server-Side SuiteScript that runs once per day. It  runs this  saved search:
 * https://system.netsuite.com/app/common/search/searchresults.nl?searchid=1756
 *  and builds an object with the rules for calculating the bonus percentage from this custom record: 'Coach bonus table' here:
 *  https://system.netsuite.com/app/common/search/searchresults.nl?searchid=1756&saverun=T&whence=
 *  It then runs this search: 
 *  https://system.netsuite.com/app/common/search/search.nl?cu=T&e=T&id=1529
 *  To build a list of all vendors (coaches), along with their points accumulated for the current quarter. The script then calculates the bonus percentage
 *   and updates the vendor record with the correct bonus percentage for the current quarter. All matching vendor/coach records will be updated, in all subsidiaries. 
 * 
 * Script record: https://system.sandbox.netsuite.com/app/common/scripting/script.nl?id=189
 * Deployment: https://system.sandbox.netsuite.com/app/common/scripting/scriptrecord.nl?id=389
 * 
 * Primary function: updateBonus
 * 
 * NetSuite Ver.	2013.2 or later 
 * 
 * 
 * License 		THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 *			EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 *			MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
 *			THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 *			SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
 *			OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 *			HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 *			TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *			SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
// define global variables
var bonusTable = new Array(); // stores bonus rates for location/points based on custom record

function calcBonus(locName, pointsInt) { // this function is called many times by the main function to calculate the proper bonus percentage
	// find proper bonus % for location & bonus points earned
	var bPctEarned = 0;
	var locRow = '';
	
	if (locName.length < 1 ) {
		nlapiLogExecution('ERROR', 'missing country name: ', locName);
		return -1;
	}
	
	switch (locName) {
	case "United Kingdom": locRow = "United Kingdom";
						break;
	case "United States": locRow = "United States";
	break;
	default: locRow = "Non US/UK";
	break;
	} 
	// nlapiLogExecution('AUDIT', 'country, then row in array: ', locName + ', ' + locRow);
	// loop through the correct row of the bonusTable array to find the highest achieved bonus %
	

	var bonusTableLine = bonusTable[locRow];
	for (var bonusPctEntry in bonusTableLine) {
		// important check that this is objects own property 
		// not from prototype prop inherited
		if(bonusTableLine.hasOwnProperty(bonusPctEntry)){
			// nlapiLogExecution('AUDIT', 'pointsInt: Min bonus points, and its %: ', pointsInt + ': ' + bonusPctEntry + ', ' + bonusTableLine[bonusPctEntry]);
		    if (parseInt(pointsInt) >= parseInt(bonusPctEntry) && bPctEarned < bonusTableLine[bonusPctEntry]) {
		    	//center of the onion
		    	bPctEarned = bonusTableLine[bonusPctEntry];
		    	// nlapiLogExecution('DEBUG', 'Updating bonus % to: ', bPctEarned);
		    }
		}
	}
	
	return bPctEarned;
}



function updateBonus(type) { // This is the primary function called by the scheduled script
	// set up variables
	/**
	 * 16/2/2015.
	 * Parameterize Saved Search custom entity field so that it can be deployed to different result sets.
	 * Saved Search MUST be based off of customsearch_talent_bonusscriptthisqtr and MUST be marked as Public
	 * Entity Field ID to update MUST be internal ID of the field.
	 */
	var paramSavedSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct193_ssid');
	var paramUpdEntityFieldId = nlapiGetContext().getSetting('SCRIPT','custscript_sct193_entfldid');
	
	//THROW Error Notifying admins the Deployment Need Saved Search and Update Entity ID
	if (!paramSavedSearchId || !paramUpdEntityFieldId) {
		throw nlapiCreateError('UPDBONUS-ERR', 'Please make sure each deployment records for Update Coach Bonus has Saved Search and Entity Field ID to update reference', false);
		return;
	}
	
	var invalidCoaches = new Array();
	invalidCoaches = ["Multiple Coaches", "- None -"];
	
	// Extract bonus rules from custom record
	var searchresultsBR = nlapiSearchRecord('customrecord_coach_bonus_table', 'customsearch_all_coach_bonus_rules', null, null);
	if (searchresultsBR && searchresultsBR.length > 0 ) {
		nlapiLogExecution('ERROR', 'Search SUCCESS for bonus rules: ', JSON.stringify(searchresultsBR));
	} else {
		// no item fulfillments found 
		nlapiLogExecution('ERROR', 'Search FAIL for bonus rules: ', JSON.stringify(searchresultsBR));	
	}

	// build object of the data
	for ( var i = 0; searchresultsBR != null && i < searchresultsBR.length; i++ ) 
	{ 
		var searchresultBR = searchresultsBR[i];
		// nlapiLogExecution('DEBUG', 'strigified - one row of search results BR', i + ' ' + JSON.stringify(searchresultBR));
        var loc = searchresultBR.getText('custrecord_location'); // Location
        var locID = parseInt(searchresultBR.getValue('custrecord_location')); // Location internal ID
        var bonusPct = searchresultBR.getValue('custrecord_bonus'); // Bonus Percentage
        bonusPct = parseInt(bonusPct); // convert to integer
        var minPoints = searchresultBR.getValue('custrecord_min_points'); // Minimum points required for this bonus %
        // nlapiLogExecution('DEBUG', 'record #: location:  bonus% -  minimum points', i + ': ' + loc + ': ' + bonusPct + ' - ' + minPoints);
        
        var searchColsBR = searchresultBR.getAllColumns(); // 3 columns
        // build object for each location - or one big one? 
        if (loc in bonusTable == false) 
        {
        	// initialize array
        	bonusTable[loc] = {};
        }
       bonusTable[loc][minPoints] = bonusPct;        
      // nlapiLogExecution('DEBUG', ' bonusTable['+ loc + '][' + minPoints + ']: ',  bonusTable[loc][minPoints]);
      // nlapiLogExecution('DEBUG', 'loc: ', loc); 
	}
	// nlapiLogExecution('DEBUG', 'bonusTable object: ', JSON.stringify(bonusTable["Non US/UK"]));
	
	// run the main saved search customsearch_talent_bonusscript, which is already set to current quarter. Date is temporarily set to last quarter!!!
	// var searchresultsP = nlapiSearchRecord('job', 'customsearchcst_bookings_pend_coach_21_8', null, null); this is for sandbox
	
	//JS: Parameter ize this one.
	//Original Reference: 'customsearch_talent_bonusscriptthisqtr'
	var searchresultsP = nlapiSearchRecord('job', paramSavedSearchId, null, null); 
	if (searchresultsP && searchresultsP.length > 0 ) 
	{
		nlapiLogExecution('DEBUG', 'Search SUCCESS for bonus points: ', JSON.stringify(searchresultsP));
	}
	else 
	{		
		// no item fulfillments found 
		nlapiLogExecution('ERROR', 'Search FAIL for bonus points: ', JSON.stringify(searchresultsP));	
	}
	
	for ( var j = 0; searchresultsP != null && j < searchresultsP.length; j++ ) 
	{ 
		// re-enable this to run on the full set when going live!!
		// for ( var j = 0; searchresultsP != null && j < 5; j++ ) { // for each coach...
		var searchresultP = searchresultsP[j];
		var coachName = '';
		var countryName = '';
		var bonusPoints = 0;
		var bonusEarned = 0;
		
		nlapiLogExecution('DEBUG', 'strigified - one row of search results POINTS', j + ' ' + JSON.stringify(searchresultP));
		// gather data from search
		var pointsSearchCols = searchresultP.getAllColumns();
		
		/* this loop is exploratory 
		for ( var k = 0; pointsSearchCols != null && k < pointsSearchCols.length; k++ ) {
			nlapiLogExecution('AUDIT', 'pointsSearchCols[' + k + '].getName(): ', pointsSearchCols[k].getName());
			nlapiLogExecution('AUDIT', 'pointsSearchCols[' + k + ']: ', pointsSearchCols[k]);
			nlapiLogExecution('AUDIT', 'pointsSearchCols[' + k + '].getLabel(): ', pointsSearchCols[k].getLabel());
			nlapiLogExecution('AUDIT', 'pointsSearchCols[' + k + '].getFormula(): ', pointsSearchCols[k].getFormula());
			nlapiLogExecution('AUDIT', 'pointsSearchCols[' + k + '].getName(): ', pointsSearchCols[k].getFunction());

			}  end exploratory loop */
		
		// get coach name
		var coachCol = pointsSearchCols[0]; // first column has coach name
		if (searchresultP.getValue(coachCol).length > 0 && pointsSearchCols[0].getLabel() == 'Coach') {
			// coachName = searchresultP.getValue(coachCol);
			coachName = searchresultP.getText(coachCol);
			// nlapiLogExecution('DEBUG', 'coach name success: ', coachName);
		} else {
			nlapiLogExecution('DEBUG', 'coach name FAIL: ', coachName);
			//Coach name is not valid. go to next
			continue;
		}
		
		
		// skip the rest of the work in this loop if the coach name is on the invalid list
		var skipThis = 0;
		for (var g=0; g < invalidCoaches.length; g++) 
		{
			if (invalidCoaches[g] == coachName ) 
			{
				nlapiLogExecution('AUDIT', 'Invalid coach name, skipping: ', coachName);
				skipThis = 1;
			}
		}
		
		if (skipThis > 0) continue; 
		
		// get primary delivery country 
		var countryCol = pointsSearchCols[1]; // Second column has country name
		if (searchresultP.getValue(countryCol).length > 0 && pointsSearchCols[1].getLabel() == 'Country') {
			countryName = searchresultP.getText(countryCol);
			// nlapiLogExecution('DEBUG', 'countryName success: ', countryName);
		} else nlapiLogExecution('DEBUG', 'countryName FAIL: ', countryName);

		// Extract the total session points for this time period -  called total bonus in search
		var PointsCol = pointsSearchCols[6]; // 7th column has bonus points earned
		if (searchresultP.getValue(PointsCol) > 0 && PointsCol.getLabel() == 'Total bonus') {
			 bonusPoints = searchresultP.getValue(PointsCol); // Bonus Points earned 
			 // nlapiLogExecution('DEBUG', 'Bonus Points success: ', bonusPoints);
			} else nlapiLogExecution('DEBUG', 'Bonus Points FAIL: ', searchresultP.getValue(PointsCol));
				
		// Calculate the bonus percentage based on the chart - based on total bonus points and location	
		bonusEarned = calcBonus(countryName, bonusPoints);
		nlapiLogExecution('AUDIT', 'Coach, Location: Bonus Points, bonus %: ', coachName + ', ' + countryName + ': ' + bonusPoints + ', ' + bonusEarned);

		// find all the coach records for this coach
		var filters = new Array();
		filters[0] = new nlobjSearchFilter('name','custentity_coach_groupingname', 'is', coachName);
		var coachRecords = nlapiSearchRecord('vendor', 'customsearch_find_coach', filters, null);
		if (coachRecords == null) {
			nlapiLogExecution('DEBUG', 'No matching coaches found for: ', coachName);
			continue;
		} else {
			nlapiLogExecution('DEBUG', 'matching coaches for: ' + coachName, JSON.stringify(coachRecords));
			for (var z = 0; coachRecords != null && z < coachRecords.length; z++ ) { // for each matching coach record, set the bonus % custom field
				var coachRecord = coachRecords[z];
				var coachInternalId = coachRecord.getId();
				nlapiLogExecution('DEBUG', 'matching coach internal ID: ' + coachInternalId);
				// open the entity record
				//17/2/2015 - Duplicate variable declaration here. 
				//	Remove var declaration.
				//coachRecord = nlapiLoadRecord('vendor', coachInternalId);
				//Original: custentity_coach_bonusthisqtr
				//var currBonusPct = coachRecord.getFieldValue(paramUpdEntityFieldId); // load current bonus level
				
				/* bug fix for advanced projects - the work calendar field is mandatory, and sometimes NetSuite thinks it is know on a certain vendor record.
				 *  To get around this, I pull in the existing work calendar field, check to see if it is null, and if so, change it to 1 ( which is the default value)
				 *   then submit it  with the bonus level. 
				 
				var workCal = coachRecord.getFieldValue('workcalendar'); // work calendar for some reason
				if (workCal == null) { 
					workCal = 1; // set work calendar to default 
					nlapiLogExecution('DEBUG', 'workCal is null for vendor ID: ' + coachInternalId);
				} 
				nlapiLogExecution('DEBUG', 'current bonus level, work calendar: ' + currBonusPct + ', ' + workCal);
				*/
				// update bonus level in coach object
				
				// submit record to NS
				try {
					//JS: Param THIS parameter 
					//Original: custentity_coach_bonusthisqtr
					//4/19/2015 - SUbmit Field not load record and submit
					nlapiSubmitField('vendor', coachInternalId, paramUpdEntityFieldId, bonusEarned, false);
					//coachRecord.setFieldValue(paramUpdEntityFieldId, bonusEarned);
					/* NetSuite bug details:  I originally wrote the code to use nlapiSubmitField (which is commented below).  this would generate a user error
					 *  saying ' please provide a value for work schedule'.  On the vendor record, the work schedule is a mandatory field,  and the custom form
					 *  cannot be edited to change this.  Even though nlapiSubmitField  has a flag you can use to ignore mandatory fields, it was still failing on
					 *  about half of the vendor records.  When I load the record above,the work calendar field is sometimes null. Those other vendors for which
					 *  a normal insert would fail.  so I added the code above to check to see if the work calendar is null,  and if so, set it to 1.  This is the 
					 *  internal ID  of the default work calendar, which is the only one currently being used. If multiple work calendars are used at some point down
					 *  the road, this script might cause problems by reassigning some vendors back to the default.
					 */
					// coachRecord.setFieldValue('workcalendar', workCal); part of bug fix above
					//var id = nlapiSubmitRecord(coachRecord, true, true); // not sourcing dependant fields, and ignoring mandatory fields 
					// var id = nlapiSubmitField('vendor', coachInternalId, 'custentity_coach_bonusthisqtr', bonusEarned, false); 
					nlapiLogExecution('AUDIT', 'Updated coach with internaID: ' + coachInternalId+' Bonus Earned Value: '+bonusEarned);
				}
				catch (e){
					//handling the error
					if (e instanceof nlobjError) {
	                    nlapiLogExecution('ERROR', 'system error', e.getCode() + '\n' + e.getDetails());
					}
	               else {
	                    nlapiLogExecution('ERROR', 'unexpected error', e.toString());
	               }
				}

				 
				// fail 1 var id = nlapiSubmitRecord(coachRecord, true, true); // sourcing fields, and ignoring read-only fields.

			}
	
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((j+1) / searchresultsP.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
	} // end coach loop
		
	
	var endUsage = nlapiGetContext().getRemainingUsage();
	nlapiLogExecution('AUDIT', 'Final usage units remaining: ' + endUsage);
	
	return;
}
