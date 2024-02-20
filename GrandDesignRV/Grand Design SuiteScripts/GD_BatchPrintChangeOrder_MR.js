/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
 define(['N/record', 'N/query', 'N/runtime',  'N/format', 'SuiteScripts/SSLib/2.x/SSLib_Task', 'N/render'],
 
/**
 * @param {record} record
 * @param {query} query
 * @param {runtime} runtime
 * @param {format} format
 * @param {render} render
 */
    function(record, query, runtime, format, SSLib_Task, render) {
        var scriptObj = runtime.getCurrentScript();
        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
        function getInputData(){
            var changeorderIds = scriptObj.getParameter({name: 'custscriptgd_changeorderids'})
            changeorderIds = JSON.parse(changeorderIds)
            var mapData = [];
            for(i = 0 ; i < changeorderIds.length ; i++ ){
                log.debug('parsed', changeorderIds)
                mapData.push({
                    changeOrderId: changeorderIds[i],
                    index: i
                })
            }
            return mapData
        }
        function map(context){
            try{
            var result = JSON.parse(context.value);
            var orderId = result.changeOrderId
            var index = result.index
            var changeOrderRecord = record.load({
                type: 'customrecordrvschangeorder',
                id: orderId
            })
            var renderer = render.create();
            renderer.setTemplateByScriptId('CUSTTMPLCHANGEORDERTEMPLATE')

            renderer.addRecord({templateName: 'record', record: changeOrderRecord});
            xmlString = renderer.renderAsString().substring(renderer.renderAsString().indexOf('<pdf>'))
            }
            catch(err){log.debug('error', err)}
            log.debug('end stage', xmlString)
            //var pdfFile = renderer.renderAsPdf();
            //var folderId = 47861061
            //pdfFile.folder = folderId
            //pdfFile.name = scriptObj.getParameter({name:'custscriptgd_filename'})
            //pdfFile.save();
            var mapping = [];
            mapping.push({
                file: xmlString,
                index: index
            })
            context.write({
                key: 0,
                value: mapping
            })
        }
        function reduce(context){
            log.debug('reached reduce', 'reduced')
            var reduceContext = [];
            var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdfset>";
            for (var i = 0; i < context.values.length; i++){
                reduceContext.push(
                    JSON.parse(context.values[i])[0]
                );
            };
            try{
                reduceContext.sort(function (start,end) { 
                    return start.index - end.index
                });
            }
            catch(err){
                log.debug(err)
            }
            for(var i = 0; i < context.values.length; i++){
                log.debug(reduceContext[i].file)
                xml += reduceContext[i].file
            }
            xml += '</pdfset>'
            log.debug('xml', xml)
            try{
                var pdfFile = render.xmlToPdf(xml);
                var folderId = 50421344;
                pdfFile.folder = folderId
                pdfFile.name = scriptObj.getParameter({name:'custscriptgd_pdfname'})
                pdfFile.save();
            }
            catch(err){
                log.debug('render error', err)
            }

        }
        function summarize(summary){

        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
});