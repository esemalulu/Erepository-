/*

 */

var DEBUG = true;

function restlet_sendData(datain){

	try
	{
		// variables
		var stLoggerTitle = 'restlet_sendData';
		var arRecords = datain.records;
		var objData = {};
		var err = new Object();

		logExecution('DEBUG', stLoggerTitle, '>> Start Script Execution <<');

	    for (var i = 0; arRecords != null && i < arRecords.length; i++) {
	        record = cloneObject(arRecords[i]);
	        
	        logExecution('DEBUG', stLoggerTitle, 'Process record: ' + i);
	        
	        //process_record(record);
	    }

		logExecution('DEBUG', stLoggerTitle, '>> End Script Execution <<');

	}
	catch(error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR','Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}

}

function process_record(datain){

	try
	{
		// variables
		var stLoggerTitle = 'process_record';
		var intInternalId = datain.internalId;
		var stExternalId = datain.externalId;
		var stRecordType = datain.recordType;
		var objSubrecord = datai
		var objData = {};

		logExecution('DEBUG', stLoggerTitle, '>> Start Script Execution <<');

		// for loadRecord
		try
		{
			var objRecord = (!isEmpty(intInternalId)) ? nlapiLoadRecord(stRecordType, intInternalId, {recordmode: 'dynamic'}) : nlapiCreateRecord(stRecordType);

			logExecution('DEBUG', stLoggerTitle, stRecordType);
			logExecution('DEBUG', stLoggerTitle, intInternalId);

			if (!isEmpty(objRecord))
			{
				var bolRecordFound = true;
				logExecution('DEBUG', stLoggerTitle, 'entered');

				// loop through
				// main data
				for (var mainField in datain)
				{

					if (mainField == 'internalId' || mainField == 'recordType') continue

					logExecution('DEBUG', stLoggerTitle, 'Main fields and values [' + mainField + ' : ' + datain[mainField].value + ']');
					logExecution('DEBUG', stLoggerTitle, 'Main fields and texts [' + mainField + ' : ' + datain[mainField].text + ']');

					if (!isEmpty(datain[mainField].value))
					{
						objRecord.setFieldValue(mainField, setEmpty(datain[mainField].value));
					}
					else
					{
						objRecord.setFieldText(mainField, setEmpty(datain[mainField].text));
					}

					if (!isEmpty(objSubrecord))
					{
						// Check internal id for edit more; Currently only edit mode is supported
						if (isEmpty(intInternalId)) break;

						bolRecordFound = false;

						// Loop
						// through
						// subrecords
						for (var subrecord in objSubrecord)
						{
							var objSubrecordField = objSubrecord[subrecord];
							var intSubrecordFieldId = objSubrecordField['internalId'];
							var intSubrecordLineCount = objRecord.getLineItemCount(subrecord);

							logExecution('DEBUG', stLoggerTitle, 'Subrecord: ' + subrecord);
							logExecution('DEBUG', stLoggerTitle, 'Subrecord ID: ' + intSubrecordFieldId);
							logExecution('DEBUG', stLoggerTitle, 'Subrecord Line Count: ' + intSubrecordLineCount);

							// Loop
							// through
							// subrecord
							// line
							for (var intSubrecordLineCtr = 1; intSubrecordLineCtr <= intSubrecordLineCount; intSubrecordLineCtr++)
							{
								objRecord.selectLineItem(subrecord, intSubrecordLineCtr);
								var intCtrSubrecordId = objRecord.getCurrentLineItemValue(subrecord, 'internalid');

								// Continue
								// loop
								// if
								// not
								// the
								// subrecord
								// to
								// edit
								if (intSubrecordFieldId != intCtrSubrecordId) continue;

								bolRecordFound = true;

								// Loop
								// through
								// the
								// fields
								// of
								// subrecord
								for (var subrecordField in objSubrecordField)
								{
									// check
									// if
									// subrecord
									// field
									// is
									// internal
									// id
									if (subrecordField == 'internalId' || subrecordField == 'recordType') continue;

									// logExecution('DEBUG',
									// stLoggerTitle,
									// 'Subrecord
									// fields
									// and
									// values
									// [' +
									// subrecordField
									// + '
									// : '
									// +
									// objSubrecordField[subrecordField]
									// +
									// ']');
									var objSubrecordSetData = objRecord.editCurrentLineItemSubrecord(subrecord, objSubrecordField['recordType']);


									// Check
									// if
									// value
									// or
									// text
									if (isEmpty(objSubrecordField[subrecordField].value))
									{
										objSubrecordSetData.setFieldText(subrecordField, setEmpty(objSubrecordField[subrecordField].text));

										logExecution('DEBUG', stLoggerTitle, 'Subrecord text [' + subrecordField + ' : ' + objSubrecordField[subrecordField].text + ']');
									}
									else
									{
										objSubrecordSetData.setFieldValue(subrecordField, setEmpty(objSubrecordField[subrecordField].value));               
										logExecution('DEBUG', stLoggerTitle, 'Subrecord value [' + subrecordField + ' : ' + objSubrecordField[subrecordField].value + ']');
									}

									objSubrecordSetData.commit();

								}

								objRecord.commitLineItem(subrecord);

								// break;
							}
						}

					}
				}

				// check if
				// record found
				// is set to
				// true
				if (bolRecordFound)
				{
					objData.id = nlapiSubmitRecord(objRecord, true, true);

					logExecution('DEBUG', stLoggerTitle, stRecordType + ' id: ' + objData.id);

					return objData;
				}
				else
				{
					return null;
				}
			}

			logExecution('DEBUG', stLoggerTitle, '>> End Script Execution<<');

		}
		catch(error)
		{
			// code here
			if (error.getDetails != undefined)
			{
				nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
				throw error;
			}
			else
			{
				nlapiLogExecution('ERROR','Unexpected Error', error.toString());
				throw nlapiCreateError('99999', error.toString());
			}
		}


		logExecution('DEBUG', stLoggerTitle, '>> End Script Execution <<');

	}
	catch(error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR','Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}

}
/**
 * Return true if value is null, empty string, or undefined
 * 
 * @param stValue
 * @returns {Boolean}
 */
function isEmpty(stValue)
{
	if ((stValue == null) ||(stValue == undefined))
	{
		return true;
	}
	return false;
}

function setEmpty(stValue) {
	if ((stValue == 'null') || (stValue == '') || (stValue == null) || (stValue == undefined)) {
		return '';
	}
	return stValue;
}

function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function logExecution(stLog, stLoggerTitle, stMessage)
{

	if (DEBUG)
	{
		nlapiLogExecution(stLog, stLoggerTitle, stMessage);
	}

}