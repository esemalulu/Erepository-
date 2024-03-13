/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
    'N/log',
    'N/record',
    'N/ui/serverWidget',
    './r7-ecv-data'
], function (log, record, ui, data) {
    function onRequest(context) {
        const { recordType, recordId } = context.request.parameters;
        if (!recordId || !recordType) {
            throw 'Missing transaction type or id';
        }

        const transaction = record.load({
            type: recordType,
            id: recordId
        });

        const form = buildForm(transaction, recordType);

        context.response.writePage(form);
    }

    function buildForm(transaction) {
        const documentNumber = transaction.getValue({ fieldId: 'tranid' });
        const form = ui.createForm({ title: documentNumber });

        const formLayout = data.getFormLayout('transaction', transaction.type);

        formLayout.fieldGroups.forEach(addFieldGroup(form, transaction));
        formLayout.sublists.forEach(addSublist(form, transaction, formLayout));

        return form;
    }

    function addFieldGroup(form, transaction) {
        return function (group) {
            const { id, label, fields } = group;
            form.addFieldGroup({ id, label });
            fields.forEach(field => {
                const uiField = form.addField({ ...field, container: id })
                    .updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });

                uiField.defaultValue = transaction.getValue({ fieldId: field.id });
            });
        }
    }

    function addSublist(form, transaction, formLayout) {
        return function (sublistLayout) {
            const { id, label } = sublistLayout;
            const { maps, defaults } = formLayout;

            // Add the sublist
            const sublist = form.addSublist({ id, label, type: ui.SublistType.LIST })

            // Add all the defined columns for the sublist
            sublistLayout.fields.forEach(field => sublist.addField(field)
                .updateDisplayType({ displayType: ui.FieldDisplayType.INLINE })
            );

            const lineCount = transaction.getLineCount({ sublistId: id });
            const fieldIds = sublistLayout.fields.map(field => field.id);

            for (let line = 0; line < lineCount; line++) {
                fieldIds.forEach(fieldId => {
                    // Get the value for this field
                    let value = transaction.getSublistValue({ sublistId: id, fieldId, line });

                    // Map the value to a new value if defined
                    value = maps[value] || value;

                    // Provide a default value if empty and default is defined;
                    value = value || defaults[fieldId] || null;

                    // if no value at this point, skip
                    if (!value) {
                        return;
                    }

                    sublist.setSublistValue({ id: fieldId, value, line });
                });
            }
        }
    }

    return {
        onRequest
    };
});