/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'], (record, search) => {
  /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type
     * @param {Form} context.form - Current form
     * @Since 2015.2
     */
  const beforeLoad = (context) => {
    const EVENT = context.type;
    const LOGTITLE = 'beforeLoad_' + EVENT;

    try {
      const FORM = context.form;
      const SUB = FORM.getSublist({ id: 'expense' });
      SUB.getField({ id: 'account' }).updateDisplayType({ displayType: 'DISABLED' });
    } catch (ERROR) {
      log.error(LOGTITLE, ERROR);
    }
  };

  return {
    beforeLoad
  };
});
