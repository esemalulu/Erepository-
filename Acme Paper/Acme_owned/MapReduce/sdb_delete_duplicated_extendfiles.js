/** 
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record"], function (search, record) {

    function getInputData() {
        try{
            return search.load({
                id: 'customsearch_sdb_find_extendfiles_to_del',
            });
        }catch(getInputDataError){
            log.error("getInputData() ERROR", getInputDataError);
        }
    }
    function map(context) {
        try {
            var value = JSON.parse(context.value);
            log.debug("map() value is: ", value);
            var values = value.values;
            var ids = values["MAX(formulatext)"];
            var url = values["GROUP(custrecord_extfile_link)"];
            ids = ids.split(",");
            for(var i = 0; i < ids.length; i++){
                var name = search.lookupFields({
                    type: "customrecord_extend_files_aut",
                    id: ids[i],
                    columns: "name"
                }).name;
                if(name == url){
                    var deletedID = record.delete({
                        type: "customrecord_extend_files_aut",
                        id: ids[i],
                    });
                    log.audit("map() deleted record id: ", deletedID);
                }else{
                }
            }
        } catch (error) {
            log.error("Error in map", error);
        }
    }

    function summarize(summary) {
        
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    }
});
