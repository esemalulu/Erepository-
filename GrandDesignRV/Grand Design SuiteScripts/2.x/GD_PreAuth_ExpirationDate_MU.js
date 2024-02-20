/**
 /**
 * @NApiVersion 2.1
 * @NScriptType MassUpdateScript
 */
  define(['N/record'],

  (record) => {
      /**
       * Defines the Mass Update trigger point.
       * @param {Object} params
       * @param {string} params.type - Record type of the record being processed
       * @param {number} params.id - ID of the record being processed
       * @since 2016.1
       */
      const each = (params) => {
          log.debug('Current PreAuth: ', params.id);

          let expirationDate = new Date('02 / 17 / 2017');
          //submit the record to have an expiration date and status set to denied
          record.submitFields({
              type: 'customrecordrvspreauthorization',
              id: params.id,
              values: {'custrecordgd_expirationdate': expirationDate, 
                       'custrecordpreauth_status': 4}
          });
      }

      return { each }
  });