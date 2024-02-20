/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/redirect', 'N/xml', 'N/render', 'N/file'],
    /**
     * @param {record} record
     * @param {runtime} runtime
     * @param {redirect} redirect
     * @param {render} render
     * @param {xml} xml
     * @param {file} file
     */
    (record, runtime, xml, redirect, render, file) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (context) => {
            var mapData = [];
            try {
                var salesOrders = JSON.parse(runtime.getCurrentScript().getParameter({
                    name: 'custscriptgd_tranids'
                }));
                var pdfType = JSON.parse(runtime.getCurrentScript().getParameter({
                    name: 'custscriptgd_ordertype'
                }));
               
                for (var index in salesOrders) {
                    mapData.push({
                        mapOrderNo: salesOrders[index],
                        maptype: pdfType,
                        mapIndex: index
                    });
                }
            } catch (e) {
                log.error('getInputData', e);
            }
            return mapData
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (context) => {

            const PRINT_TYPES = {
                SALES_ORDER: 181,
                PRODUCTION_ORDER: 223,
            }
            var pdfMarkup = '<pdf>';

            var mapData = JSON.parse(context.value);
            log.debug('mapData', mapData);
            var orderNo = mapData.mapOrderNo;
            var soInternalId = parseInt(orderNo.salesOrderId);
            var index = mapData.mapIndex;

            var mType = mapData.maptype[0]
            var type = parseInt(mType.type);
            var mapping = []
            try {
                if (orderNo = !'') {
                    // Render Sales Orders
                    if (Number(type) === (PRINT_TYPES.SALES_ORDER)) {
                        log.debug('type', type);
                        var htmlFile = render.transaction({
                            entityId: soInternalId,
                            printMode: render.PrintMode.HTML,
                            formId: type,
                        });

                        var HTML = htmlFile.getContents();

                        pdfMarkup += HTML.substring(HTML.indexOf('<html>')) + '</pdf>';

                        mapping.push({index: index, pdf: pdfMarkup});
                    } else {
                        // Render Production Orders
                        let pdfFile = render.transaction({
                            entityId: soInternalId,
                            printMode: render.PrintMode.PDF,
                            formId: type,
                        });
                        pdfFile.name = `${unescape(runtime.getCurrentScript().getParameter({
                            name: 'custscriptgd_filename'
                        }))}_${soInternalId}.pdf`;
                        pdfFile.folder = runtime.envType === runtime.EnvType.PRODUCTION ? 47890143 : 46240080;
                        pdfFile.isOnline = true;
                        const fileId = pdfFile.save();
                        pdfFile = file.load(fileId);
                        mapping.push({index: index, pdf: pdfFile.url, pdfFileId: fileId});
                    }
                    context.write({
                        key: 0,
                        value: mapping
                    })
                }

            } catch (e) {
                log.debug('err', e)
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (context) => {
          
            let i;
            var reduceContext = [];

            var xml = '<?xml version="1.0"?>\n<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">\n<pdfset>';
            var fileName = unescape(runtime.getCurrentScript().getParameter({
                name: 'custscriptgd_filename'
            }));
            try {
                var runType = JSON.parse(runtime.getCurrentScript().getParameter({
                    name: 'custscriptgd_ordertype'
                }));
                const pdfType = parseInt(runType[0].type);
                const PRINT_TYPES = {
                    SALES_ORDER: 181,
                    PRODUCTION_ORDER: 223,
                }
                let pdfFile;
                for (i = 0; i < context.values.length; i++) {
                    reduceContext.push(
                        JSON.parse(context.values[i])[0]
                    );
                }

                reduceContext.sort((start, end) => {
                    return start.index - end.index;
                })

                if (Number(pdfType) === (PRINT_TYPES.SALES_ORDER)) {
                    for (i = 0; i < reduceContext.length; i++) {
                        xml += reduceContext[i].pdf;
                    }

                    // for (var i = 0; i < context.values.length; i++)
                    // {
                    //     xml += context.values[i].pdf;
                    // }
                    xml += '</pdfset>';
                    /* const encodeString = (input) => {
                         return input.replace(/:/g, '%3A').replace(/;/g, '%3B').replace(/&/g, '%26').replace(/</g, '%3C').replace(/>/g, '%3E');
                     }
                     xml = encodeString(xml);*/
                    pdfFile = render.xmlToPdf({
                        xmlString: xml
                    });
                    pdfFile.name = fileName;
                    pdfFile.folder = runtime.envType === runtime.EnvType.PRODUCTION ? 47890143 : 46240080;
                    pdfFile.save();
                } else {
                    for (i = 0; i < reduceContext.length; i++) {
                        log.debug('reduceContext[i].pdf', reduceContext[i].pdf);
                        xml += `<pdf src='${reduceContext[i].pdf.replace(/&/g, '&amp;')}'/>`;
                    }
                    xml += '</pdfset>';
                    const renderer = render.create();
                    renderer.templateContent = xml;
                    pdfFile = renderer.renderAsPdf();
                    pdfFile.name = fileName;
                    pdfFile.folder = runtime.envType === runtime.EnvType.PRODUCTION ? 47890143 : 46240080;
                    pdfFile.save();
                    try {
                        for (i = 0; i < reduceContext.length; i++) {
                            file.delete({
                                id: reduceContext[i].pdfFileId
                            });
                        }
                    } catch (e) {
                        log.error('error deleting files', e)
                    }
                }
                context.write({
                    key: 0,
                    value: pdfFile
                });  
            } catch (error) {
                log.debug('error', error);
            }
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            if (summaryContext.inputSummary.error) {
                log.error({title: 'Input Error', details: summaryContext.inputSummary.error});
            }
            summaryContext.mapSummary.errors.iterator().each(function (key, error) {
                log.error({title: `Map Error for key: ${key}`, details: error});
                return true;
            });
            summaryContext.reduceSummary.errors.iterator().each(function (key, error) {
                log.error({title: `Reduce Error for key: ${key}`, details: error});
                return true;
            });
        }

        return {getInputData, map, reduce, summarize}

    });
