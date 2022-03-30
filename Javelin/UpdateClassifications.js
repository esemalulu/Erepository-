function beforeSubmit(type) {
	// Make sure you turn off inline editing on the custom record type so we don't have to handle xedit events OR script solution

	log('beforeSubmit', 'type = ' + type);
	var context = nlapiGetContext();
	if (context.getExecutionContext() == 'userinterface') {
		if (type == 'create' ) { 

			var classificationID = nlapiGetRecordId();
			var classificationName = nlapiGetFieldValue('custrecord_classificationname');
			var parentID = nlapiGetFieldValue('custrecord_classificationparent');
			var hasParent = parentID.length == 0 ? false : true;
			var classificationFullName;

			if (hasParent == true) {
				log('ClassificationUpdate', 'Classification with ID = ' + classificationID + ' has a parent classification with ID = ' + parentID);
				var parentFullName = nlapiLookupField('customrecord_classification', parentID, 'custrecord_classificationfullname');
				classificationFullName = parentFullName + ' : ' + classificationName;
			}
			else {
				classificationFullName = classificationName;
				log('ClassificationUpdate', 'Classification with ID = ' + classificationID + ' does not have a parent classification');
			}
			nlapiSetFieldValue('custrecord_classificationfullname', classificationFullName);
		}

		else  if (type = 'edit') {
			var classificationID = nlapiGetRecordId();
			var previousClassificationRecord = nlapiGetOldRecord();

			var oldClassificationFullName = previousClassificationRecord.getFieldValue('custrecord_classificationfullname');
			log('beforeSubmit', 'oldClassificationFullName = ' + oldClassificationFullName);

			//nlapiLookupField('customrecord_classification', classificationID, 'custrecord_classificationfullname');

			var classificationName = nlapiGetFieldValue('custrecord_classificationname');

			var parentID = nlapiGetFieldValue('custrecord_classificationparent');

			var hasParent = parentID.length == 0 ? false : true;
			var classificationFullName;
			if (hasParent == true) {
				log('ClassificationUpdate', 'Classification with ID = ' + classificationID + ' has a parent classification with ID = ' + parentID);
				var parentFullName = nlapiLookupField('customrecord_classification', parentID, 'custrecord_classificationfullname');
				classificationFullName = parentFullName + ' : ' + classificationName;
			}
			else {
				classificationFullName = classificationName;
				log('ClassificationUpdate', 'Classification with ID = ' + classificationID + ' does not have a parent classification');
			}
			log('beforeSubmit', 'classificationFullName = ' + classificationFullName);
			nlapiSetFieldValue('custrecord_classificationfullname', classificationFullName);

			var filters = new Array();
			var columns = new Array();
			filters[0] = new nlobjSearchFilter( 'custrecord_classificationfullname', null, 'startswith', oldClassificationFullName );
			filters[1] = new nlobjSearchFilter( 'internalid', null, 'noneof', classificationID );
			columns[0] = new nlobjSearchColumn( 'custrecord_classificationfullname' );	
			var affectedClassifications = nlapiSearchRecord( 'customrecord_classification', null, filters, columns );
			for ( var i = 0; affectedClassifications != null && i < affectedClassifications.length; i++ ) {
				log('beforeSubmit', 'Entering loop i = ' + i + ' of ' + affectedClassifications.length);
				var subClassificationToFix = affectedClassifications[i];
				var subClassificationToFixID = subClassificationToFix.getId();
				var subClassificationToFixRecord = nlapiLoadRecord('customrecord_classification', subClassificationToFixID);
				var subClassificationToFixOldFullName = subClassificationToFixRecord.getFieldValue('custrecord_classificationfullname');

				var subClassificationToFixNewFullName = subClassificationToFixOldFullName.replace(oldClassificationFullName, classificationFullName);
				subClassificationToFixRecord.setFieldValue('custrecord_classificationfullname', subClassificationToFixNewFullName);
				var id = nlapiSubmitRecord(subClassificationToFixRecord, false);
			}
		}
	}
}


function log(title, details) {
	nlapiLogExecution('DEBUG',title,details);
}