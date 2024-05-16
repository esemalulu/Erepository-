/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */

 define(["N/url", "N/search", "N/record"], function (url, search, record)
 {
     function pageInit()
     {
         // var titleElement = document.getElementById("airclickTitle");
         // var mr_script_name = document.getElementById("mr_script_name")?.innerHTML;
 
         // document.title = "Send Orders to Airclic";
 
         // if (!titleElement || !mr_script_name) return;
 
         // var SCHInterval = setInterval(function ()
         // {
         //     debugger;
         //     var statusMR = checkMRStatus(mr_script_name);
         //     if (statusMR <= 0)
         //     {
         //         titleElement.innerHTML = "Sending completed!";
         //         clearInterval(SCHInterval);
         //     }
 
         // }, 3000)
 
         // setTimeout(function ()
         // {
         //     clearInterval(SCHInterval);
         // }, 1200000);
     }
 
 
     function checkMRStatus(MR_SCRIPT)
     {
         var mrScriptInstanceLookup = search.create({
             type: "scheduledscriptinstance",
             filters: [
                 ["percentcomplete", "lessthan", "100"],
                 "AND",
                 ["script.internalid", "anyof", MR_SCRIPT],
             ],
             columns: [
                 search.createColumn({
                     name: "status",
                     label: "Status",
                 }),
             ],
         });
         var searchResultCount = mrScriptInstanceLookup.runPaged().count || 0;
         return searchResultCount;
     }
 
     function returnHome()
     {
         const DEPLOYMENT_ID = "customdeploy_acc_sl_airclic_send_order";
         const SCRIPT_ID = "customscript_acc_sl_airclic_send_order";
         window.location = url.resolveScript({
             deploymentId: DEPLOYMENT_ID,
             scriptId: SCRIPT_ID,
         });
     }
 
     function retryOrdersAirclic()
     {
         try
         {
             debugger;
             var checkBoxCount = document.querySelectorAll(".checkboximage")?.length;
             if (checkBoxCount <= 0) return;
 
             for (var i = 0; i < checkBoxCount; i++)
             {
                 var sublistElement = document.getElementById("custpage_sublistidrow" + i);
                 if (!sublistElement) continue;
 
                 var checkedOrder = sublistElement?.children[2]?.firstChild?.firstChild?.checked;
                 if (!checkedOrder) continue;
 
                 var orderId = sublistElement.firstChild.innerHTML;
                 if (!orderId) continue;
 
                 if(document.getElementById("custpage_sublistidrow" + i).children[1].innerHTML.indexOf('INV') != -1){
                     record.submitFields({
                         type: 'invoice',
                         id: orderId,
                         values: {
                             'custbody_aps_sent_to_airclick': false
                         },
                         options: {
                             ignoreMandatoryFields: true
                         }
                     });
                } else {
                    record.submitFields({
                        type: search.Type.RETURN_AUTHORIZATION,
                        id: orderId,
                        values: {
                            'custbody_aps_sent_to_airclick': false
                        },
                        options: {
                            ignoreMandatoryFields: true
                        }
                    });
                }
             }
 
             returnHome();
         }
         catch (error)
         {
             console.log('error', error);
         }
     }
 
     return {
         pageInit: pageInit,
         returnHome: returnHome,
         retryOrdersAirclic: retryOrdersAirclic
     };
 });
 