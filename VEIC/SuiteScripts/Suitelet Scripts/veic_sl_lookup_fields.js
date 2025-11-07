/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/record'], (search, record) => {
  function onRequest(context) {
    const request = context.request;
    const response = context.response;

    if (request.method === 'GET') {
      log.debug('onRequest: GET request received', JSON.stringify(request.parameters));
      // recordId is the internl id of the record
      const recordId = request.parameters.recordId;
      if (!recordId) {
        response.write(JSON.stringify({ error: 'Missing recordId' }));
        return;
      }
      // recordType is the record type, e.g. customer, job, vendorbill etc.
      const recordType = request.parameters.recordType;
      if (!recordType) {
        response.write(JSON.stringify({ error: 'Missing recordType' }));
        return;
      }
      // fieldIds is a comma separated list of fields to lookup
      const fieldIds = request.parameters.fieldIds;
      if (!fieldIds) {
        response.write(JSON.stringify({ error: 'Missing fieldIds' }));
        return;
      }

      let columns = fieldIds.split(',').map(fieldId => fieldId.trim());
      if (columns.length === 0) {
        response.write(JSON.stringify({ error: 'No fields to lookup' }));
        return;
      }

      response.setHeader({
        name: 'Content-Type',
        value: 'application/json'
      });
      try {
        let results = search.lookupFields({
          id: recordId,
          type: recordType,
          columns: columns
        });
        log.debug("onRequest: Lookup results", JSON.stringify(results));
        response.write(JSON.stringify(results));
      } catch (e) {
        log.error('onRequest: Error looking up fields', e);
        response.write(JSON.stringify({ error: e.message }));
      }
    }
  }

  return {
    onRequest: onRequest
  };
});
