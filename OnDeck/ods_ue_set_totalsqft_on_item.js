/**
 * @author JoeSon
 * User Event script to fire on Roll Record custom record.
 * Script will fire for each time a roll record is edited/created/deleted 
 * - Run "SUM" summary search of square footage field and update item parent record.
 */
var rollrec, oldrec;
var logger;
var msg, sbj;
var toEmail='ondeck@audaxium.com';
var from='-5';
function setSqFtOnItem(type) {
	try {
		//init Logger
		logger = new Logger();
		logger.enableDebug();
		
		rollrec=nlapiGetNewRecord();
		//Mod: 12/10/2013 - If type is xedit, Load the record
		if (type == 'xedit') {
			rollrec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		}
		oldrec=nlapiGetOldRecord();
		
		//execute only if record is deleted or create or length, width or item link values have changed
		if (type=='delete' || type=='create' || rollrec.getFieldValue('custrecord_length') != oldrec.getFieldValue('custrecord_length') || 
			rollrec.getFieldValue('custrecord_width') != oldrec.getFieldValue('custrecord_width') || 
			rollrec.getFieldValue('custrecord_item') != oldrec.getFieldValue('custrecord_item') || 
			rollrec.getFieldValue('isinactive') != oldrec.getFieldValue('isinactive')) {
			
			var itmobj = getValue(type,oldrec);
			//call summary (SUM) search for Roll Record(s) for linked item
			if (itmobj && itmobj.itmid > 0) {
				var sumsqft = totalSqft(itmobj.itmid);
				if(!sumsqft) {
					sumsqft=0;
				}
				if (sumsqft >= 0) {
					//update item field
					nlapiSubmitField(itmobj.recordtype,itmobj.itmid,'custitem_total_sqft',sumsqft);
					logger.debug('New SQFT',itmobj.itmid+'::'+sumsqft);
				} else {
					//summary search return -1 
					//send error email
					sbj='Total SQFT Calculation Returned No Result';
					msg='Total SQFT Calc for Item Type:'+itmobj.recordtype+'/Item ID:'+itmobj.itmid+
						' return no result set.';
					nlapiSendEmail(from, toEmail, sbj,msg);
				}	
			} else {
				logger.debug('No need to update','Roll record not attached to any item skip this process');
			}
			
			//when item linkage have changed, need to make sure previously linked items' total sqft needs to get updated
			if (rollrec && oldrec && oldrec.getFieldValue('custrecord_item') && rollrec.getFieldValue('custrecord_item') != oldrec.getFieldValue('custrecord_item')) {
				logger.debug('Updating SQFT for Old Item','Old Item ID:'+oldrec.getFieldValue('custrecord_item'));
				var oldrectype = nlapiLookupField('item',oldrec.getFieldValue('custrecord_item'),'recordtype');
				var oldsqft = totalSqft(oldrec.getFieldValue('custrecord_item'));
				if (!oldsqft) {
					oldsqft=0;
				}
				
				//update item field
				nlapiSubmitField(oldrectype,oldrec.getFieldValue('custrecord_item'),'custitem_total_sqft',oldsqft);
				logger.debug('Old SQFT',oldrec.getFieldValue('custrecord_item')+'::'+oldsqft);
			}
		}	
	} catch (e) {
		sbj='ods_ue_set_totalsqft_on_item';
		
		if (e.getDetails() != undefined) {
			sbj+=' Runtime Error';
			msg='Runtime Error Occured: '+
				'RollRecID:'+rollrec.getId()+'-'+e.getCode()+':'+e.getDetails();
			logger.error('Runtime Error','RollRecID:'+rollrec.getId()+'-'+e.getCode()+':'+e.getDetails());	
		} else {
			sbj+=' Unexpected Error';
			msg='Unexpected Error Occured: '+
				'RollRecID:'+rollrec.getId()+'-'+e.toString();
			logger.error('Unexpected Error','RollRecID:'+rollrec.getId()+'-'+e.toString());	
		}
		
		//send error email to admins	
		nlapiSendEmail(from, toEmail, sbj,msg);
	}
	
}

//private
/**
 * Returns total sqft for all Roll Records by item
 * @param (_itm) currently updated linked item value
 * @author Joe Son
 * @version 1.0
 */
function totalSqft(_itm) {
	var flt=new Array();
	flt[0]=new nlobjSearchFilter('custrecord_item',null,'is',_itm);
	//Mod 12/10/2013 - Add filter to NOT count inactive roll record
	flt[1]=new nlobjSearchFilter('isinactive',null,'is','F');
	var col=new Array();
	col[0]=new nlobjSearchColumn('custrecord_squarefootage',null,'sum');
	var rslt = nlapiSearchRecord('customrecord_rollrecord',null,flt,col);
	if (rslt && rslt.length>0) {
		return rslt[0].getValue('custrecord_squarefootage',null,'sum');
	} else {
		return -1;
	}
}

//private
/**
 * Returns latest item
 * @author Joe Son
 * @version 1.0
 */
function getValue(_type,_oldrec) {
	var itmobj=new Object();
	if (_type!='delete') {
		itmobj.itmid=nlapiLookupField('customrecord_rollrecord',nlapiGetRecordId(),'custrecord_item');	
	} else {
		//if record is deleted, get item value from old record
		itmobj.itmid = _oldrec.getFieldValue('custrecord_item');
	}
	
	//check to make sure item record exists for this roll record.
	if (itmobj.itmid) {
		//lookup item type
		itmobj.recordtype = nlapiLookupField('item',itmobj.itmid,'recordtype');
		return itmobj;	
	} else {
		return null;
	}
		
}
