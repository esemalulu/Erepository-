/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * Author: Facundo Mieres
 */
define(['N/record', 'N/search', 'N/log'],
    (record, search, log) => {
        const getInputData = (inputContext) => {
            try {
                // Cargar la búsqueda de forma síncrona
                const mySearch = search.load({
                    id: "customsearch4487"
                });
                return mySearch; // Devolver la búsqueda cargada
            } catch (error) {
                console.error('Error occurred:', error);
                return null; // O manejar el error apropiadamente
            }
        };
        const map = (mapContext) => {
            try {
                const custRec = record.load({
                    type: record.Type.CUSTOMER,
                    id: mapContext.key,
                    isDynamic: false
                });
                const lineCount = custRec.getLineCount({
                    sublistId: "itempricing"
                });

                for (var i = lineCount - 1; i >= 0; i--) {
                    var lineKey = custRec.getSublistValue({
                        sublistId: "itempricing",
                        fieldId: "item",
                        line: i,
                    });
                    log.debug("Info", { lineKey, customer: mapContext.key })
                    custRec.removeLine({
                        sublistId: "itempricing",
                        line: i,
                    });

                }
                var custid = custRec.save({ ignoreMandatoryFields: true });
                log.debug("Finish", { custid, lineCount })
            } catch (e) {
                log.error({
                    title: "Error en la función map",
                    details: e
                });
            }
        };
        return { getInputData, map };
    });