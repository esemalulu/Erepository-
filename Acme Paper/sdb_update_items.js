/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(["N/log", "N/record", "N/search"],
    function (log, record, search) {
        function getInputData() {
            try {             
                var mySearch =  search.create({
                    type: "customrecord_extend_files_aut",
                    filters:
                    [                   
                   
                    ],
                    columns:
                    [
                        search.createColumn({name: "custrecord_extfile_file_cabinet_id", label: "eXtendFiles - File Cabinet ID"})
                    ]
                 });
                return mySearch;
            } catch (e) {
                log.audit("ERROR getInputData: ", e);
            }
        }

        function map(context) {
            try {
                var ctx = JSON.parse(context.value);

                var item = record.load({
                    type: ctx.recordType,
                    id: ctx.id,
                });
                var idSave = item.save({
                    ignoreMandatoryFields: true
                });

                log.debug('idSave', idSave)
            } catch (e) {
                log.audit("ERROR map: " + ctx.id, e);
            }
        }

        return {
            getInputData: getInputData,
            map: map
        };
    });