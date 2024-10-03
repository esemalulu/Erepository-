/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log", "N/config", "N/format"],
    /**
   * @param{record} record
   * @param{search} search
   */
    (record, search, log, config, format) => {
       
        const getInputData = (inputContext) => {
            try {
              log.debug("Start",new Date())
                return search.load({
                    id: "customsearch6559",
                });
            } catch (error) {
                log.error('getInputData',error)
            }
           
        }

        const map = (mapContext) => {
            try {
                var json = JSON.parse(mapContext.value);
              
                var soRecord = record.load({
                    type: 'salesorder',//json.values["GROUP(type)"].text,
                    id: json.values["GROUP(internalid)"].value,
                });

                var recordId = soRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });
                log.debug("recordId", recordId)
            } catch (e) {
                log.error({
                    title: json.values["GROUP(internalid)"].value,
                    details: e,
                })
            }
        }
        return { getInputData, map }
    });