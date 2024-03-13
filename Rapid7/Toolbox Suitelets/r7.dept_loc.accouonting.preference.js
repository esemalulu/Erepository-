/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
    'N/log',
    'N/record',
    'N/ui/serverWidget',
    'N/url',
    'N/config',
    'N/runtime',
    'N/ui/message',
    '../Transaction/Common/r7.check.custom.permissions'
], function(log, record, ui, url, config, runtime, message, customPermission) {
    function onRequest(context) {
        const form = buildForm();

        if (context.request.method === 'POST') {
            updateDeptAndLocPreference(form, context);
        }
        // noinspection JSCheckFunctionSignatures
        context.response.writePage(form);
    }

    function buildForm() {
        const form = ui.createForm({ title: 'Manage Department and Locations Mandatory Preference' });
        form.addSubmitButton({ label: 'Submit' });
        addRefreshButton(form);

        const deptField = form.addField({
            id: 'custpage_ac_department',
            type: ui.FieldType.CHECKBOX,
            label: 'MAKE DEPARTMENTS MANDATORY'
        });
        //deptField.padding = 1;

        const locField = form.addField({
            id: 'custpage_ac_location',
            type: ui.FieldType.CHECKBOX,
            label: 'MAKE LOCATIONS MANDATORY'
        });

        // Hidden field to force previous fields into a single column
        form.addField({
            id: 'custpage_new_column',
            type: ui.FieldType.INLINEHTML,
            label: 'New Column'
        }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });

        const configRecObj = config.load({
            type: config.Type.ACCOUNTING_PREFERENCES
        });

        const ac_dept = configRecObj.getValue({
            fieldId: 'DEPTMANDATORY'
        });
        log.debug('DEPTMANDATORY', ac_dept);
        const ac_location = configRecObj.getValue({
            fieldId: 'LOCMANDATORY'
        })
        log.debug('LOCMANDATORY', ac_location);

        deptField.defaultValue = ac_dept ? 'T' : 'F';
        locField.defaultValue = ac_location ? 'T' : 'F';

        if (!customPermission.userHasPermission('department_and_location_mandatory_preference')) {

            deptField.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            locField.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });
        }

        return form;
    }

    function updateDeptAndLocPreference(form, context) {
        const ac_dept = context.request.parameters['custpage_ac_department'];
        const ac_location = context.request.parameters['custpage_ac_location'];

        log.debug('DEPTMANDATORY Post', ac_dept);
        log.debug('LOCMANDATORY Post', ac_location);

        try{
            const configRecObj = config.load({
                type: config.Type.ACCOUNTING_PREFERENCES
            });

            configRecObj.setValue({
                fieldId: 'DEPTMANDATORY',
                value: ac_dept === 'T'
            })

            configRecObj.setValue({
                fieldId: 'LOCMANDATORY',
                value: ac_location === 'T'
            })

            configRecObj.save();

        }catch (ex) {
            form.addPageInitMessage({
                type: message.Type.ERROR,
                title: 'Error Updating Preferences',
                message: 'There was an error updating the Preferences: ' + ex.message
            });
        }
    }

    function addRefreshButton(form) {
        const scriptUrl = url.resolveScript({
            scriptId: runtime.getCurrentScript().id,
            deploymentId: runtime.getCurrentScript().deploymentId
        });

        form.addButton({
            id: 'cuspage_refresh_button',
            label: 'Refresh',
            functionName: `window.open("${scriptUrl}", "_self")`
        });
    }

    return {
        onRequest
    };
});