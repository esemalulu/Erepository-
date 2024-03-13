/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define([], function () {
    function pageInit(context) {
        console.log(context);
        if (context.mode == 'create') {
            var fieldSkuLookup = context.currentRecord.getField({ fieldId: 'custpage_skulookup' });
            var fieldImportExport = context.currentRecord.getField({ fieldId: 'custpage_importexport' });
            fieldSkuLookup.isDisplay = false;
            fieldImportExport.isDisplay = false;
            fieldImportExport.label = 'Import JSON';
        }
    }

    function fieldChanged(context) {
        console.log(context);
        var fieldSelectOperationValue = context.currentRecord.getValue({ fieldId: 'custpage_selectoperation' });
        var fieldSkuLookup = context.currentRecord.getField({ fieldId: 'custpage_skulookup' });
        var fieldImportExport = context.currentRecord.getField({ fieldId: 'custpage_importexport' });
        if (fieldSelectOperationValue == '1') {
            fieldSkuLookup.isDisplay = true;
            fieldImportExport.isDisplay = false;
        }
        else if (fieldSelectOperationValue == '2') {
            fieldSkuLookup.isDisplay = false;
            fieldImportExport.isDisplay = true;
        }
        else {
            fieldSkuLookup.isDisplay = false;
            fieldImportExport.isDisplay = false;
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
    };
});