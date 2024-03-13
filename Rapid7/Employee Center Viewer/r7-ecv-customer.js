/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
    'N/log',
    'N/record',
    'N/search',
    'N/ui/serverWidget',
    './r7-ecv-data'
], function (log, record, search, ui, data) {
    function onRequest(context) {
        const { recordId } = context.request.parameters;
        if (!recordId) {
            throw 'Missing customer id';
        }

        const customer = record.load({
            type: record.Type.CUSTOMER,
            id: recordId
        });

        const form = buildForm(customer)

        context.response.writePage(form);
    }

    function buildForm(customer) {
        const companyName = customer.getValue({ fieldId: 'companyname' });
        const form = ui.createForm({ title: companyName });
        form.clientScriptModulePath = './r7-ecv-customer-cs.js';

        passDataToGlobal(form, customer);

        const formLayout = data.getFormLayout('entity', 'customer');

        formLayout.fieldGroups.forEach(addFieldGroup(form, customer));
        formLayout.sublists.forEach(addCustomerSublist(form, formLayout, customer));
        formLayout.buttons.forEach(button => form.addButton(button));

        return form;
    }

    function addFieldGroup(form, customer) {
        return function (group) {
            const { id, label, fields } = group;
            form.addFieldGroup({ id, label });
            fields.forEach(field => {
                const uiField = form.addField({ ...field, container: id })
                    .updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });

                let value = customer.getValue({ fieldId: field.id });
                if (typeof value === 'boolean' && field.type === ui.FieldType.CHECKBOX) {
                    value = value ? 'T' : 'F';
                }

                uiField.defaultValue = value;
            });
        }
    }

    function addCustomerSublist(form, formLayout, customer) {
        return function (sublistLayout, sublistIndex) {
            const { id, label } = sublistLayout;
            const { maps, defaults } = formLayout;

            // Add the sublist
            const sublist = form.addSublist({ id, label, type: ui.SublistType.LIST })

            // Add all the defined columns for the sublist
            sublistLayout.fields.forEach(field => {
                const updatedField = {...field, id: getUIColumnName(field.id, sublistIndex)};

                sublist.addField(updatedField)
                        .updateDisplayType({ displayType: ui.FieldDisplayType.INLINE })
                }
            );

            if (!sublistLayout.search) {
                return;
            }

            // Apply the customer ID specific filter to the sublist search
            const sublistSearch = search.create(sublistLayout.search);
            const customerFilterField = sublistLayout.customerFilterField;

            if (customerFilterField) {
                const updatedFilters = sublistSearch.filterExpression;

                updatedFilters.push('and');
                updatedFilters.push([customerFilterField, 'anyof', customer.id]);

                sublistSearch.filterExpression = updatedFilters
            }

            // Execute the defined search and load the results
            sublistSearch
                .run()
                .getRange({ start: 0, end: 1000 })
                .forEach((result, index) => {
                    // For each result, loop through the list of columns to load the results
                    sublistLayout.search.columns
                        .map(column => typeof column === 'string' ? column : column.name)
                        .forEach(column => {
                        // Get the value for this field
                        let value = result.getValue(column);

                        // Map the value to a new value if defined
                        value = maps[value] || value;

                        // Provide a default value if empty and default is defined;
                        value = value || defaults[column] || null;

                        // if no value at this point, skip
                        if (!value) {
                            return;
                        }

                        // Set the column value for the current row
                        const prefixedColumnName = getUIColumnName(column, sublistIndex);
                        sublist.setSublistValue({
                            id: prefixedColumnName,
                            value: value,
                            line: index
                        });
                    });
                });
        }
    }

    /**
     * This function makes variables available on the `window` object so they can be accessed
     * in the client script that is attached to the form.
     *
     * @param form
     * @param customer
     */
    function passDataToGlobal(form, customer) {
        form.addField({
            id: 'custpage_global_data',
            label: 'Global Data',
            type: ui.FieldType.INLINEHTML
        }).defaultValue = `<script>
            window.employeeCenterCustomerId = ${customer.id};
        </script>`;
    }

    /**
     * This function ensures that each sublist column name is specific to the current sublist.  If we have two
     * sublists with a "type" column, this prefix ensures that each column is unique across all sublists.
     *
     * @param columnName
     * @param sublistIndex
     * @returns {string}
     */
    function getUIColumnName(columnName, sublistIndex) {
        return `s${sublistIndex}${columnName}`.replace('custrecord', '');
    }

    return {
        onRequest
    };
});