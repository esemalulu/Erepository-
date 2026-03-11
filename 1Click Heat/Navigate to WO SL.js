/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/ui/serverWidget', 'N/log', 'N/redirect'], 
function(record, search, ui, log, redirect) {

  function onRequest(context) {
    const request = context.request;
    const response = context.response;

    const equipServiceId = request.parameters.equipServiceId;
    if (!equipServiceId) {
      response.write('Missing Equipment Service ID.');
      return;
    }

    const tripSearch = search.create({
      type: 'customrecord_cmms_tech_time_allocation',
      filters: [
        ['custrecord_cmms_techtimealloc_srvc_order', 'anyof', equipServiceId],
        'AND',
        ['custrecord_navigate_to_wo', 'isempty', '']
      ],
      columns: ['internalid', 'custrecord_cmms_techtimealloc_tech_email', 'custrecord_cmms_techtimealloc_srvc_order']
    });

    const baseUrl = 'https://shepherdcmms.azurewebsites.net/163r/#/?scriptId=348'
      + '&pageParameter=AAEJ7tMQEOrRJzW8BxuTeHyyBINWemLWd9LTvNN1oqYMpeke8M0'
      + '&account=7662002'
      + '&lookAheadDays=90'
      + '&language=en'
      + '&bypassAddToHome=T';

    let updatedCount = 0;

    tripSearch.run().each(result => {
      const tripId = result.getValue('internalid');
      const techEmail = result.getValue('custrecord_cmms_techtimealloc_tech_email');
      const serviceOrder = result.getValue('custrecord_cmms_techtimealloc_srvc_order');

      if (!tripId || !techEmail || !serviceOrder) return true;

      const fullUrl = `${baseUrl}&email=${techEmail}&serviceOrderId=${serviceOrder}&tripId=${tripId}`;

      try {
        record.submitFields({
          type: 'customrecord_cmms_tech_time_allocation',
          id: tripId,
          values: {
            custrecord_navigate_to_wo: fullUrl
          }
        });
        updatedCount++;
      } catch (e) {
        log.error('Stamp Failed', `Trip ${tripId}: ${e.message}`);
      }

      return true;
    });

    if (updatedCount === 0) {
      redirect.toRecord({
        type: 'customrecord_cmms_equipment_service',
        id: equipServiceId
      });
    } else {
      const html = `
        <html>
          <body style="font-family: sans-serif; padding: 20px;">
            <h3>Stamp Navigate to WO Complete</h3>
            <p>✅ ${updatedCount} Technician Trip(s) were stamped successfully.</p>
            <p><a href="/app/common/custom/custrecordentry.nl?rectype=customrecord_cmms_equipment_service&id=${equipServiceId}">Back to Equipment Service</a></p>
          </body>
        </html>
      `;
      response.write(html);
    }
  }

  return { onRequest };
});
