/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/log',
    'N/runtime',
    './Common/r7.opportunity.serverside',
    './Common/r7.opportunity.update.contact.roles',
    './Common/r7.opportunity.profile.task.sync',
    './Common/r7.opportunity.set.line.id',
    './Common/r7.opportunity.validate.inline.editing'
    ],
    (log, runtime, serverside, updateContact, profileTask, setLineId, validateInline) => {

        const beforeLoad = (context) => {
            setClientScript(context);
            serverside.beforeLoad(context);
        }

        const beforeSubmit = (context) => {
            validateInline.beforeSubmit(context);
            serverside.beforeSubmit(context);
            setLineId.beforeSubmit(context);
        }

        const afterSubmit = (context) => {
            serverside.afterSubmit(context);
            updateContact.afterSubmit(context);
            profileTask.afterSubmit(context);
        }

        //////////////////////////////////////////////

        function setClientScript(context){
            const scriptId = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_opportunity_cs_fileid'});

            if (!scriptId) {
                log.debug({ title: 'No Client Script', details: 'No client script file id set for this script' });
                return;
            }

            context.form.clientScriptFileId = scriptId;
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });