/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Mar 2016     json
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function fldChgLogicTestAftSub(type)
{

	log('debug','Testing Logic','Start');
	if ( (nlapiGetContext().getExecutionContext()=='userinterface' || 
		  nlapiGetContext().getExecutionContext()=='csvimport' || 
		  (type=='xedit' && nlapiGetContext().getExecutionContext()=='userevent')) && 
		 type != 'view' && type != 'delete')
	{
		
		/********************************************************************************/
		var updFld = false;
		
		if (type == 'create')
		{
			updFld = true;
		}
		else
		{
			//ONLY trigger for none create updates.
			//Grab old and new record just before saving
			var oldRec = nlapiGetOldRecord(),
				newRec = nlapiGetNewRecord();
			
			//Load it if it is xedit
			if (type == 'xedit')
			{
				newRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			}
			
			log('debug','Old/New Name',oldRec.getFieldValue('name')+' // '+newRec.getFieldValue('name'));
			
			//record types sync fields
			var ctrFlds = ['name',
			               'custrecord_lmsct_activestatus',
			               'custrecord_lmsct_accessregion',
			               'custrecord_lmsct_availregions',
			               'custrecord_lmsct_ctmanager',
			               'custrecord_lmsct_type',
			               'custrecord_lmsct_startdate',
			               'custrecord_lmsct_endate',
			               'custrecord_lmsct_contactfname',
			               'custrecord_lmsct_contactlname',
			               'custrecord_lmsct_contactemail',
			               'custrecord_lmsct_istest'],
				praFlds = ['custrecord_lmsp_contract',
				           'custrecord_lmsp_istest'],
				licFlds = ['custrecord_lmslc_status',
				           'custrecord_lmslc_lossreason',
				           'custrecord_lmslc_enablereason',
				           'custrecord_lmslc_startdt',
				           'custrecord_lmslc_enddt',
				           'custrecord_lmslc_istest',
				           'custrecord_lmslc_contract'],
				fldsByRecType = null;
		
			if (nlapiGetRecordType() == 'customrecord_lmsc')
			{
				fldsByRecType = ctrFlds;
			}
			else if (nlapiGetRecordType() == 'customrecord_lmslic')
			{
				fldsByRecType = licFlds;
			}
			else if (nlapiGetRecordType() == 'customrecord_lmsp')
			{
				fldsByRecType = praFlds;
			}
			
			//ONLY check when there is need to. Location is excluded from this list
			if (fldsByRecType)
			{
				//Go through monitor fields and check value
				for (var br=0; br < fldsByRecType.length; br+=1)
				{
					log('debug','Old Value',oldRec.getFieldValue(fldsByRecType[br]));
					log('debug','New Value',newRec.getFieldValue(fldsByRecType[br]));
					
					if (oldRec.getFieldValue(fldsByRecType[br]) != newRec.getFieldValue(fldsByRecType[br]))
					{
						updFld = true;
						break;
					}
				}
			}
			
		}
		
		log('debug','updFld',updFld);
		
		/********************************************************************************/
	}
	
}
