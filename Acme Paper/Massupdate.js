function massUpdate_Delete_Records(type, id) {
	try {
		nlapiDeleteRecord(type, id);

	} catch (e) {
		nlapiLogExecution('debug', 'Error', e.toString());
	}
}
