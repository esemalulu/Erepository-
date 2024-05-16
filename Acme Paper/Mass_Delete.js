/**
 *@NApiVersion 2.0
 *@NScriptType MassUpdateScript
 */
define(['N/record'],
    function(record) {
        function each(params) {
        	record.delete({
        	       type: params.type,
        	       id: params.id,
        	    });
        }
        return {
            each: each
        };
    });
