/* eslint-disable no-case-declarations */
/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/ui/serverWidget', './crypto-js.min.js'], (record, search, runtime, serverWidget, CryptoJS) => {
  const CURRENT_SCRIPT = runtime.getCurrentScript();

  const validateCategory = (context) => {
    const rec = context.newRecord;
    const { type } = rec;
    const AGENCY = CURRENT_SCRIPT.getParameter('custscript_agency_category');
    const POLICYHOLDER = CURRENT_SCRIPT.getParameter('custscript_policyholder_category');

    let category;
    const lookupCustomerCategory = () => {
      switch (type) {
        case ('invoice'):
          const lookup = search.lookupFields({
            type: 'customer',
            id: rec.getValue('entity'),
            columns: ['category']
          });

          category = lookup.category && lookup.category[0] && lookup.category[0].value;
          return (category === POLICYHOLDER);
        case ('customer'):
          category = rec.getValue('category');
          return (category === AGENCY);
        default:
          return false;
      }
    };

    const hideLink = () => {
      const { form } = context;
      let link;

      switch (type) {
        case ('invoice'):
          link = form.getField('custbody_stripe_invoice_paymentlink');
          break;
        case ('customer'):
          link = form.getField('custentity_stripe_agencypay_portal_link');
          break;
        default:
          break;
      }

      if (link) link.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
    };

    try {
      const isPolicyHolder = lookupCustomerCategory();
      if (!isPolicyHolder) hideLink();
    } catch (e) {
      log.error('Error', e);
    }
  };

  const encryptId = (context) => {
    const rec = context.newRecord;
    const secret = CURRENT_SCRIPT.getParameter('custscript_encryption_key');

    try {
      const idString = rec.id.toString();
      const hash = CryptoJS.AES.encrypt(idString, secret);
      let values = {};

      switch (rec.type) {
        case 'customer':
          values = { custentity_internalid_hash: encodeURIComponent(hash.toString()) };
          break;
        case 'invoice':
          values = { custbody_internalid_hash: encodeURIComponent(hash.toString()) };
          break;
        default:
          values = { custbody_internalid_hash: encodeURIComponent(hash.toString()) };
          break;
      }

      record.submitFields({
        type: rec.type,
        id: rec.id,
        values
      });
    } catch (e) {
      log.error('Error', e);
    }
  };

  return {
    beforeLoad: validateCategory,
    afterSubmit: encryptId
  };
});
