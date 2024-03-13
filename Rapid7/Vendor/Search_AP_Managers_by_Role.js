/**
 * @napiversion 2.x
 * @nscripttype workflowactionscript
 * @nmodulescope sameaccount
 * author: ngrigoriev
 * date: 17.07.2019
 * version: 1.0
 */


define(['N/runtime','N/search', 'N/email', 'N/config'],

 /**
* @param {runtime} runtime
* @param {search} search
* @param {email} email
* @param {config} config
  */
    function(runtime, search, email, config) {

        /**
         * definition of the suitelet script trigger point.
         * @param {object} context
         * @param {record} context.newrecord - new record
         * @param {record} context.oldrecord - old record
         * @since 2016.1
         */
        function onAction(context) {
            log.debug('onaction',context);
            var apManRoleId = runtime.getCurrentScript().getParameter({name: 'custscriptr7_ap_man_role'});
            var columns = [search.createColumn({name:'email'})];
            var filters = [search.createFilter({name:'role', operator:search.Operator.ANYOF, values:apManRoleId})];
            var emailsArr = [];
            search.create({type:search.Type.EMPLOYEE, filters:filters, columns:columns}).run().each(function(result){
                emailsArr.push(result.getValue({name:'email'}));
               return true;
            });
            log.debug('onaction return array of emails', emailsArr.join());
            return emailsArr.join();
        }

        return {
            onAction: onAction
        }
    }
);