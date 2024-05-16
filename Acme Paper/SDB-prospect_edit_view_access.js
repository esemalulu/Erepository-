/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/record","N/runtime","N/currentRecord",'N/search'], function (record,runtime,currentRecord,search) {
    const customSubTabFieldsToDisable = ['custentity_aq_id','custentity_auto_quote_customer_id','custentity_auto_quote_celigo_customeradr','custentity_dt_rest365_account_number','custentity_customer_price_updated','custentity_sdb_acme_statement_w_o_credit','custentity_create_history_guide']
    const commissionSubTabFieldsToDisable = ['custentity_acc_is_network_cust','custentity_acc_rebate','custentity_acc_net_perc','custentity_acc_is_cc','custentity_acc_cc_percent','custentity_acc_rebate_percent','custentity_commissionable'] 
    var rolesPermissionList=[];

    function pageInit(context) {
        try {
            var thisRecord = context.currentRecord;             
            const fieldLookUp = search.lookupFields({
              type: "customrecord_sdb_assign_roles_prospect",
              id: 1,
              columns: ["custrecord_sdb_prospect_role_permission"],
            });
            rolesPermissionList = JSON.stringify(fieldLookUp?.custrecord_sdb_prospect_role_permission);

            var currentRoleId = runtime.getCurrentUser().role;
            if(rolesPermissionList && rolesPermissionList.includes(currentRoleId)){
                var marketingSubTab = document.getElementById('marketinglnk')
                if(marketingSubTab) marketingSubTab.style.display = 'none'
                console.log('subtab hiddem')
                disableFields(thisRecord)
            }
        } catch (error) {
            console.log('pageInit' , error)   
        }
     }

    //Limit the address and restricted items substabs to only view-mode 
    function validateLine(context){
        try {
            var thisRecord = context.currentRecord;
            var currentRoleId = runtime.getCurrentUser().role;

            if((rolesPermissionList.includes(currentRoleId)) && (context.sublistId=='addressbook'||context.sublistId=='recmachcustrecord_acme_ri_customer')){
                alert('Error: You need a higher permission to do this action');
                return false;
            }
            
            return true;
        } catch (error) {
            console.log("validateLine error",error)
        }
    }
    function validateDelete(context) {
        try {
            var thisRecord = context.currentRecord;
            var currentRoleId = runtime.getCurrentUser().role;

            if((rolesPermissionList.includes(currentRoleId)) && (context.sublistId=='addressbook'||context.sublistId=='recmachcustrecord_acme_ri_customer')){
                alert('Error: You need a higher permission to do this action');
                return false;
            }
            
            return true;
        } catch (error) {
            console.log('validateDelete error',error)
        }
    }
    function validateInsert(context) {
        try {
            var thisRecord = context.currentRecord;
            var currentRoleId = runtime.getCurrentUser().role;

            if((rolesPermissionList.includes(currentRoleId)) && (context.sublistId=='addressbook'||context.sublistId=='recmachcustrecord_acme_ri_customer')){
                alert('Error: You need a higher permission to do this action');
                return false;
            }
            
            return true;
        } catch (error) {
            console.log('validateDelete error',error)
        }
    }
    // function validateField(context){
    //     try {
            // console.log('validateField')
            // console.log(context.sublistId)
            // var thisRecord = context.currentRecord;
            // var currentRoleId = runtime.getCurrentUser().role;
            // if((rolesPermissionList.includes(currentRoleId)) &&  (context.sublistId=='addressbook'||context.sublistId=='recmachcustrecord_acme_ri_customer')){
            //     alert('Error: You need a higher permission to do this action');
            //     return false;
            // }
            
    //         return true;
    //     } catch (error) {
    //         console.log("validateField error",error)
    //     }
    // }

    //Disable Custom and Commissions fields 
    function disableFields(thisRecord){
        try {
            for (let i = 0; i < customSubTabFieldsToDisable.length; i++) {
                try {
                    var field = thisRecord.getField(customSubTabFieldsToDisable[i])
                    if(field) field.isDisabled=true;
                } catch (error) {
                    console.log("disableFields customSubTabFieldsToDisable  error", field, error)
                }
            }
            for (let i = 0; i < commissionSubTabFieldsToDisable.length; i++) {
                try {
                    var field = thisRecord.getField(commissionSubTabFieldsToDisable[i])
                    if(field) field.isDisabled=true;
                } catch (error) {
                    console.log("disableFields commissionSubTabFieldsToDisable error", field, error)
                }
            }
        } catch (error) {
            console.log("disableFields",error)
        }
    }

    return {
        pageInit,
        validateLine:validateLine,
        validateDelete:validateDelete,
        validateInsert:validateInsert
        // validateField:validateField
    };
});