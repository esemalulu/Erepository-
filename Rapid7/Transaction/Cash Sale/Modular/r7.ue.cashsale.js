/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
        'N/log',
        'N/runtime',
        './Common/r7.cashsale.ss.js',
        '../../Common/r7.ratable.process.dates.only.button',
        '../../Common/r7.delete.journal.entries.button',
        '../../Common/r7.update.header'
    ],
    (log, runtime, serverSide, ratableProcess, deleteJournal, header) => {

        const beforeLoad = (context) => {
            setClientScript(context);
            serverSide.beforeLoad(context);
            ratableProcess.beforeLoad(context);
            deleteJournal.beforeLoad(context);
        }

        const beforeSubmit = (context) => {
            serverSide.beforeSubmit(context);
            header.beforeSubmit(context);
        }

        //////////////////////////////////////////////

        const setClientScript = (context) => {
            const scriptId = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_cashsale_cs_fileid'});

            if (!scriptId) {
                log.debug({ title: 'No Client Script', details: 'No client script file id set for this script' });
                return;
            }

            context.form.clientScriptFileId = scriptId;
        }

        return {beforeLoad, beforeSubmit}

    });