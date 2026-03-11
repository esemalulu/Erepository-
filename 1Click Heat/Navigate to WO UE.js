/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'], function(record, log) {

  function afterSubmit(context) {
    try {
      const rec = context.newRecord;
      const tripId = rec.id;
      if (!tripId) return;

      const techEmail = rec.getValue('custrecord_cmms_techtimealloc_tech_email');
      const serviceOrder = rec.getValue('custrecord_cmms_techtimealloc_srvc_order');
      const existingLink = rec.getValue('custrecord_navigate_to_wo');

      if (!techEmail || !serviceOrder) {
        log.debug('Missing Data', `Email or Service Order missing for record ${tripId}`);
        return;
      }

      const baseUrl = 'https://shepherdcmms.azurewebsites.net/163r/#/?scriptId=348'
        + '&pageParameter=AAEJ7tMQEOrRJzW8BxuTeHyyBINWemLWd9LTvNN1oqYMpeke8M0'
        + '&account=7662002';

      const fullUrl = `${baseUrl}`
        + `&email=${techEmail}`
        + `&lookAheadDays=90`
        + `&language=en`
        + `&serviceOrderId=${serviceOrder}`
        + `&tripId=${tripId}`
        + `&bypassAddToHome=T`;

      if (existingLink !== fullUrl) {
        record.submitFields({
          type: 'customrecord_cmms_tech_time_allocation',
          id: tripId,
          values: {
            custrecord_navigate_to_wo: fullUrl
          }
        });
        log.audit('Hyperlink Updated', `Record ${tripId} stamped/updated with: ${fullUrl}`);
      } else {
        log.debug('No Update Needed', `Record ${tripId} already has correct hyperlink.`);
      }

    } catch (e) {
      log.error('Error in afterSubmit', e);
    }
  }

  return {
    afterSubmit
  };
});
