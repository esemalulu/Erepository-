/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/error', 'N/runtime'], function (serverWidget, search, record, error, runtime) {
    function onRequest(context) {
        if (context.request.method === 'GET') {

            //build form and write response
            var form = serverWidget.createForm({
                title: 'SKU Import/Export Tool'
            });
            form.clientScriptFileId = runtime.getCurrentScript().getParameter({ name: 'custscript_csmediaitemid' });


            var selectOperation = form.addField({ id: 'custpage_selectoperation', type: serverWidget.FieldType.SELECT, label: 'Select Operation' });
            selectOperation.addSelectOption({ value: '', text: '' });
            selectOperation.addSelectOption({ value: '2', text: 'Import' });
            selectOperation.addSelectOption({ value: '1', text: 'Export' });

            var skuLookup = form.addField({ id: 'custpage_skulookup', type: serverWidget.FieldType.TEXT, label: 'Lookup SKU To Export' });

            var importExport = form.addField({
                id: 'custpage_importexport',
                type: serverWidget.FieldType.LONGTEXT,
                label: 'Import / Export'
            });
            importExport.updateDisplaySize({
                height: 30,
                width: 60
            });

            form.addSubmitButton({
                label: 'Submit'
            });

            context.response.writePage(form);
        }
        else {
            var request = context.request;
            var selectOperation = request.parameters.custpage_selectoperation;
            var skuLookup = request.parameters.custpage_skulookup;
            var importExport = request.parameters.custpage_importexport;

            polyFillArrayObject();

            var fieldsToSkip = [];
            fieldsToSkip.push('createddate');
            fieldsToSkip.push('lastmodifieddate');
            fieldsToSkip.push('internalid');
            fieldsToSkip.push('externalid');
            fieldsToSkip.push('id');
            fieldsToSkip.push('entryformquerystring');
            fieldsToSkip.push('itemidorig');
            fieldsToSkip.push('invt_dispname');
            fieldsToSkip.push('modifiableitemid');
            fieldsToSkip.push('storedetaileddescription');
            fieldsToSkip.push('custitemr7itemrenewalsku');
            fieldsToSkip.push('custitemr7itemnxlicensetype');
            fieldsToSkip.push('custitemr7itemmslicensetype1');
            fieldsToSkip.push('custitemr7itemmslicensetype');
            fieldsToSkip.push('custitemr7itemmblicensetype');
            fieldsToSkip.push('custitemr7itemuilicensetype');
            fieldsToSkip.push('custitemr7itemasplicensetype');
            fieldsToSkip.push('custitemr7itemmanagedservicetemplate');
            fieldsToSkip.push('custitemr7inplicensetype');
            fieldsToSkip.push('custitemmanagedsoftwaretemplate');

            log.debug({
                title: 'POST debug obj',
                details: JSON.stringify({
                    selectOperation: selectOperation,
                    skuLookup: skuLookup,
                    importExport: importExport
                })
            });
            
            if (selectOperation == '1') { //export

                //lookup item and export JSON object
                var itemColumns = [];
                itemColumns.push(search.createColumn({ name: 'internalid' }));
                var itemFilters = [];
                itemFilters.push(search.createFilter({ name: 'itemid', operator: search.Operator.IS, values: skuLookup }));
                var itemSearch = search.create({
                    type: 'serviceitem',
                    filters: itemFilters,
                    columns: itemColumns
                }).run().getRange({ start: 0, end: 1 });
                if (itemSearch && itemSearch.length) {
                    var itemIntId = itemSearch[0].getValue({ name: 'internalid' });
                    var itemRec = record.load({
                        type: record.Type.SERVICE_ITEM,
                        id: itemIntId
                    });
                    for (var i = 0; i < fieldsToSkip.length; i++) {
                        var fieldToClear = fieldsToSkip[i];
                        itemRec.setValue({
                            fieldId: fieldToClear,
                            value: ''
                        });
                    }
                    var itemJSON = JSON.stringify(itemRec);

                    //build form and write response
                    var form = serverWidget.createForm({
                        title: 'SKU Import/Export Tool'
                    });
                    var importExport = form.addField({
                        id: 'custpage_importexport',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'Export JSON'
                    });
                    importExport.updateDisplaySize({
                        height: 30,
                        width: 60
                    });
                    importExport.defaultValue = itemJSON;
                    context.response.writePage(form);
                }
                else {
                    throw error.create({
                        name: 'INVALID_ITEM',
                        message: 'The item entered was not found. Please check your entry and try again.'
                    });
                }
            }
            else if (selectOperation == '2') { //import

                //parse JSON object and create new item record
                var importJSON = JSON.parse(importExport);

                var importItemRec = record.create({
                    type: record.Type.SERVICE_ITEM,
                    isDynamic: false
                });

                for (var prop in importJSON.fields) {
                    if (!fieldsToSkip.includes(prop) && importJSON.fields[prop] != '' && importJSON.fields[prop] != null) {

                        //fix boolean data values
                        if (importJSON.fields[prop] == 'T') {
                            importJSON.fields[prop] = true;
                        }
                        if (importJSON.fields[prop] == 'F') {
                            importJSON.fields[prop] = false;
                        }
                        //fix percentage data values
                        if (typeof importJSON.fields[prop] == 'string' && importJSON.fields[prop].indexOf('%') != -1) {
                            importJSON.fields[prop] = importJSON.fields[prop].replace('%', '');
                        }

                        importItemRec.setValue({
                            fieldId: prop,
                            value: importJSON.fields[prop]
                        });
                    }
                }

                //fix netsuite defect requiring expense accounts on service sale items
                importItemRec.setValue({
                    fieldId: 'expenseaccount',
                    value: 246
                });

                importItemRec.save();

                //build form and write response
                var importItemJSON = JSON.stringify(importItemRec);
                var form = serverWidget.createForm({
                    title: 'SKU Import/Export Tool'
                });
                var importExport = form.addField({
                    id: 'custpage_importexport',
                    type: serverWidget.FieldType.LONGTEXT,
                    label: 'Export JSON'
                });
                importExport.updateDisplaySize({
                    height: 30,
                    width: 60
                });
                importExport.defaultValue = importItemJSON;
                context.response.writePage(form);
            }
            else { //no operation selected
                throw error.create({
                    name: 'INVALID_SUBMISSION',
                    message: 'Please select a valid operation before submitting the form.'
                });
            }
        }
    }

    //add 'includes' function to array object
    function polyFillArrayObject() {
        // https://tc39.github.io/ecma262/#sec-array.prototype.includes
        if (!Array.prototype.includes) {
            Object.defineProperty(Array.prototype, 'includes', {
                value: function (searchElement, fromIndex) {
                    if (this == null) {
                        throw new TypeError('"this" is null or not defined');
                    }
                    var o = Object(this);
                    var len = o.length >>> 0;
                    if (len === 0) {
                        return false;
                    }
                    var n = fromIndex | 0;
                    var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
                    function sameValueZero(x, y) {
                        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
                    }
                    while (k < len) {
                        if (sameValueZero(o[k], searchElement)) {
                            return true;
                        }
                        k++;
                    }
                    return false;
                }
            });
        }
    }

    return {
        onRequest: onRequest
    };
});