/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([], () => {
  return {
    beforeLoad: (params) => {
      //for dropship form (id: custform_424_5774630_351 or 300),
      //setup Warehouse(id:location) field to Dropship Warehouse (id: 129)
      const newRecord = params.newRecord;

      if (newRecord.getValue("customform") == "300") {
        newRecord.setValue({
          fieldId: "location",
          value: 129,
          ignoreFieldChange: true,
          forceSyncSourcing: true,
        });
      }
    },
  };
});
