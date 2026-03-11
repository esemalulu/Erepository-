/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/search','N/file','N/record','N/log'], function(search, file, record, log) {

  function execute(context) {
    var imgSearch = search.create({
      type: 'customrecord_cmms_eventimages',
      filters: [
        ['custrecord_cmms_eventimages_image','noneof','@NONE@'],
        'AND',
        ['custrecord_size','isempty','']
      ],
      columns: [
        'internalid',
        'custrecord_cmms_eventimages_image'
      ]
    });

    imgSearch.run().each(function(result) {
      var recId  = result.getValue('internalid');
      var fileId = result.getValue('custrecord_cmms_eventimages_image');

      try {
        var f      = file.load({ id: fileId });
        var sizeMB = parseFloat((f.size / 1024 / 1024).toFixed(2));

        record.submitFields({
          type:   'customrecord_cmms_eventimages',
          id:     recId,
          values: { custrecord_size: sizeMB }
        });

        log.audit({
          title:   'Set Image Size',
          details: 'Rec ' + recId + ' → ' + sizeMB + ' MB'
        });
      } catch (e) {
        log.error({
          title:   'Error updating size for rec ' + recId,
          details: e
        });
      }

      return true;
    });
  }

  return {
    execute: execute
  };
});
