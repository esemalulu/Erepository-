/**
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
*/
define(['N/record',"N/runtime",'N/search','N/ui/serverWidget'], function(record,runtime,search,serverWidget) {

     function beforeLoad(context) {
            try {
                var thisRecord = context.newRecord;
                var form = context.form;
        
                var fieldLookUp = search.lookupFields({
                    type: "customrecord_sdb_assign_roles_prospect",
                    id: 1,
                    columns: ["custrecord_sdb_prospect_role_permission"],
                  });
                  rolesPermissionList = JSON.stringify(fieldLookUp?.custrecord_sdb_prospect_role_permission);
      
                  var currentRoleId = runtime.getCurrentUser().role;
                  
                  if(rolesPermissionList && rolesPermissionList.includes(currentRoleId)){
                    let field = form.addField({
                        id: 'custpage_marketing_subtab_hide',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: ' ',
                    });
                    field.defaultValue =
                    `<script>
                            require(['N/ui/message'], (m_message) => {
                               document.getElementById('marketinglnk').style.display = 'none' ;
                            });
                    </script>`

                    // setTimeout(() => {
                    //     document.getElementById('tr_newrecrecmachcustrecord_celigo_logger_customer').style.visibility='hidden'
                    //     document.getElementById('tr_newrecrecmachcustrecord_celigo_logger_customer').style.display = 'none' ;
                    //    }, 4000);
                    log.debug('subtab hidden')
        
                }

            } catch (error) {
                log.debug('beforeLoad',error)
            }
        }

        return {
            beforeLoad: beforeLoad,
        };
    });


