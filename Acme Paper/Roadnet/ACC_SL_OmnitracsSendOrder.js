/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */

 define(["N/ui/serverWidget", "N/search", "N/runtime", "N/task", "N/record", 'N/redirect'], function (serverWidget, search, runtime, task, record, redirect) {
    function onRequest(context) {
        var params = context.request.parameters;
        var scriptObj = runtime.getCurrentScript();
        var orderDetailsSSScript = scriptObj.getParameter({
            name: "custscript_order_details_ss_script",
        });
        var richmondDeploymentSS = scriptObj.getParameter({
            name: "custscript_richmond_order_det_deployment",
        });
        var savageDeploymentSS = scriptObj.getParameter({
            name: "custscript_savage_order_details_deploy",
        });
        var routingDetailsMR = scriptObj.getParameter({
            name: "custscript_routing_details_mr_script",
        });

        log.debug("params", params);

        if (context.request.method === "GET") {
            if (params.hasOwnProperty("receiveOrders")) {
                var routesStatus = params?.routesStatus;

                if (params?.custpage_enviroment) {
                    var enviroment = search.lookupFields({
                        type: "customrecord_sdb_enviroments",
                        id: params?.custpage_enviroment,
                        columns: ["custrecord_sdb_username",
                            "custrecord_sdb_password",
                            "custrecord_sdb_recive",
                            "custrecord_sdb_loginurl"
                        ]
                    });

                    var username = enviroment.custrecord_sdb_username;
                    var password = enviroment.custrecord_sdb_password;
                    var loginurl = enviroment.custrecord_sdb_loginurl;
                    var routeurl = enviroment.custrecord_sdb_recive;
                } else {
                    var username = params?.custpage_username;
                    var password = params?.custpage_password;
                    var loginurl = params?.custpage_loginurl;
                    var routeurl = params?.custpage_routeurl;
                }

                log.debug("routeurl", routeurl)


                var inProgressMR = checkMRStatus(routingDetailsMR);
                var caseNumberReceived = numerationCasesOrders();
                var title = `<p id='roadnetTitle'>CASE ${caseNumberReceived} - ${(routesStatus == "All") ? 'Receiving Routing details for all statuses' : 'Receiving Routing details with status ' + routesStatus}...</p>`
                var form = serverWidget.createForm({ title: title });

                if (inProgressMR && inProgressMR > 0) {
                    form.title = "Previous Routing Details are processing...";
                    var busyMsg = "Script is currently processing orders. Please check back shortly.";
                    var busyMessageField = form.addField({
                        id: "custpage_user_message",
                        type: serverWidget.FieldType.LONGTEXT,
                        label: "Notice: ",
                    });
                    busyMessageField.defaultValue = busyMsg;
                    busyMessageField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });
                } else {
                    const taskId = callMrTask(routingDetailsMR, {
                        'custscript_sdb_route_status_to_receive': routesStatus,
                        'custscript_acc_odri_username': username,
                        'custscript_acc_odri_password': password,
                        'custscript_acc_odri_login_url': loginurl,
                        'custscript_acc_odri_route_url': routeurl
                    });

                    log.debug("taskId", taskId);

                    redirect.redirect({
                        url: '/app/common/scripting/mapreducescriptstatus.nl?sortcol=dcreated&sortdir=DESC&date=TODAY&scripttype='+routingDetailsMR+'&primarykey='
                    });
                    return;
                    /*form.addField({
                        id: "custpage_task_id",
                        type: serverWidget.FieldType.INLINEHTML,
                        label: "Task script",
                    }).defaultValue = getFormOrdersReceived(taskId, caseNumberReceived, routesStatus);*/
                }
                form.clientScriptModulePath = "./ACC_CL_OmnitracsSendOrder.js";
                form.addButton({
                    id: "custpage_startover",
                    label: "Start Over",
                    functionName: "returnHome()",
                });
                context.response.writePage(form);
            }
            else {
                var landingForm = serverWidget.createForm({
                    title: "Send Orders to Roadnet",
                });
                landingForm.clientScriptModulePath = "./ACC_CL_OmnitracsSendOrder.js";

                // Location field
                var locationFld = landingForm.addField({
                    id: "custpage_location",
                    type: serverWidget.FieldType.SELECT,
                    label: "Location to send",
                });
                locationFld.isMandatory = true;
                locationFld.addSelectOption({
                    value: "Richmond",
                    text: "Richmond",
                });
                locationFld.addSelectOption({
                    value: "Savage",
                    text: "Savage",
                });

                // Receive status type field
                var routesStatusFld = landingForm.addField({
                    id: "custpage_routes_status",
                    type: serverWidget.FieldType.SELECT,
                    label: "Received routes status",
                });
                routesStatusFld.isMandatory = true;

                routesStatusFld.addSelectOption({
                    value: -1,
                    text: "All",
                });

                routesStatusFld.addSelectOption({
                    value: "PlanningActive",
                    text: "PlanningActive",
                });

                routesStatusFld.addSelectOption({
                    value: "PlanningBuilt",
                    text: "PlanningBuilt",
                });

                routesStatusFld.addSelectOption({
                    value: "DispatchPending",
                    text: "DispatchPending",
                });

                routesStatusFld.addSelectOption({
                    value: "DispatchInProgress",
                    text: "DispatchInProgress",
                });

                routesStatusFld.addSelectOption({
                    value: "Arrived",
                    text: "Arrived",
                });

                routesStatusFld.addSelectOption({
                    value: "Completed",
                    text: "Completed",
                });

                routesStatusFld.addSelectOption({
                    value: "Schedule",
                    text: "Schedule",
                });

                routesStatusFld.addSelectOption({
                    value: "Plan",
                    text: "Plan",
                });

                routesStatusFld.addSelectOption({
                    value: "Dispatch",
                    text: "Dispatch",
                });

                routesStatusFld.addSelectOption({
                    value: "Archive",
                    text: "Archive",
                });

                routesStatusFld.addSelectOption({
                    value: "Strategic",
                    text: "Strategic",
                });

                routesStatusFld.defaultValue = "PlanningBuilt";

                //Add params field
                var enviromentFld = landingForm.addField({
                    id: "custpage_enviroment",
                    type: serverWidget.FieldType.SELECT,
                    label: "Environment to use",
                    source: "customrecord_sdb_enviroments"
                });
                enviromentFld.isMandatory = true;


                // var userFld = landingForm.addField({
                //     id: "custpage_username",
                //     type: serverWidget.FieldType.TEXT,
                //     label: "Username",
                // });
                // userFld.isMandatory = true;

                // var routeURLFld = landingForm.addField({
                //     id: "custpage_routeurl",
                //     type: serverWidget.FieldType.TEXT,
                //     label: "Route URL",
                // });
                // routeURLFld.isMandatory = true;

                // var loginURLFld = landingForm.addField({
                //     id: "custpage_loginurl",
                //     type: serverWidget.FieldType.TEXT,
                //     label: "Login URL",
                // });
                // loginURLFld.isMandatory = true;

                // var passwordFld = landingForm.addField({
                //     id: "custpage_password",
                //     type: serverWidget.FieldType.PASSWORD,
                //     label: "Password",
                // });
                // passwordFld.isMandatory = true;
                // end params fields //

                landingForm.addSubmitButton({
                    label: "Send Orders",
                });

                landingForm.addButton({
                    label: "Receive Routing Details",
                    id: "custpage_receive_routing_details",
                    functionName: "receiveOrders()",
                });

                context.response.writePage(landingForm);
            }
        }
        else if (params.submitter == "Send Orders") {
            var location = params.custpage_location;

            if (params?.custpage_enviroment) {
                var enviroment = search.lookupFields({
                    type: "customrecord_sdb_enviroments",
                    id: params?.custpage_enviroment,
                    columns: ["custrecord_sdb_username",
                        "custrecord_sdb_password",
                        "custrecord_sdb_routeurl",
                        "custrecord_sdb_loginurl"]
                });

                var username = enviroment.custrecord_sdb_username;
                var password = enviroment.custrecord_sdb_password;
                var loginurl = enviroment.custrecord_sdb_loginurl;
                var routeurl = enviroment.custrecord_sdb_routeurl;
            }

            if (location == "Richmond") {
                var caseNumber = getAndUpdateCaseNumber();

                var inProgressMR = checkSSStatus(
                    orderDetailsSSScript,
                    richmondDeploymentSS
                );
                var title = `<p id='roadnetTitle'>CASE: ${caseNumber} - Sending Richmond orders...</p>`
                var form = serverWidget.createForm({ title: title });
                /* if (inProgressMR && inProgressMR > 0) {
                     form.title = "Previous Richmond Orders processing...";
                     var busyMsg =
                         "Script is currently processing orders. Please check back shortly.";
                     var busyMessageField = form.addField({
                         id: "custpage_user_message",
                         type: serverWidget.FieldType.LONGTEXT,
                         label: "Notice: ",
                     });
                     busyMessageField.defaultValue = busyMsg;
                     busyMessageField.updateDisplayType({
                         displayType: serverWidget.FieldDisplayType.INLINE,
                     });
                 } else {
                     const taskId = callScheduledTask(orderDetailsSSScript, richmondDeploymentSS);
 
                     form.addField({
                         id: "custpage_task_id",
                         type: serverWidget.FieldType.INLINEHTML,
                         label: "Task script",
                     }).defaultValue = getFormOrders(taskId, caseNumber);
                 }*/
                const taskId = callScheduledTask(orderDetailsSSScript, richmondDeploymentSS, {
                    'custscript_acc_odoi_username': username,
                    'custscript_acc_odoi_password': password,
                    'custscript_acc_odoi_login_url': loginurl,
                    'custscript_acc_odoi_order_url': routeurl
                });

                form.addField({
                    id: "custpage_task_id",
                    type: serverWidget.FieldType.INLINEHTML,
                    label: "Task script",
                }).defaultValue = getFormOrders(taskId, caseNumber);
                form.clientScriptModulePath = "./ACC_CL_OmnitracsSendOrder.js";
                form.addButton({
                    id: "custpage_startover",
                    label: "Start Over",
                    functionName: "returnHome()",
                });
                
                redirect.redirect({
                    url: '/app/common/scripting/scriptstatus.nl?sortcol=dcreated&sortdir=DESC&date=TODAY&scripttype=1607'
                });
                context.response.writePage(form);
            } else if (location == "Savage") {

                var caseNumber = getAndUpdateCaseNumber();

                var inProgressMR = checkSSStatus(
                    orderDetailsSSScript,
                    savageDeploymentSS
                );
                var title = `<p id='roadnetTitle'>CASE: ${caseNumber} - Sending Savage orders...</p>`
                var form = serverWidget.createForm({ title: title });
                /*   if (inProgressMR && inProgressMR > 0) {
                       form.title = "Previous Savage Orders processing...";
                       var busyMsg =
                           "Script is currently processing orders. Please check back shortly.";
                       var busyMessageField = form.addField({
                           id: "custpage_user_message",
                           type: serverWidget.FieldType.LONGTEXT,
                           label: "Notice: ",
                       });
                       busyMessageField.defaultValue = busyMsg;
                       busyMessageField.updateDisplayType({
                           displayType: serverWidget.FieldDisplayType.INLINE,
                       });
                   } else {
                       const taskId = callScheduledTask(orderDetailsSSScript, savageDeploymentSS);
   
                       form.addField({
                           id: "custpage_task_id",
                           type: serverWidget.FieldType.INLINEHTML,
                           label: "Task script",
                       }).defaultValue = getFormOrders(taskId, caseNumber, true);
                   }*/
                const taskId = callScheduledTask(orderDetailsSSScript, savageDeploymentSS, {
                    'custscript_acc_odoi_username': username,
                    'custscript_acc_odoi_password': password,
                    'custscript_acc_odoi_login_url': loginurl,
                    'custscript_acc_odoi_order_url': routeurl
                });

                form.addField({
                    id: "custpage_task_id",
                    type: serverWidget.FieldType.INLINEHTML,
                    label: "Task script",
                }).defaultValue = getFormOrders(taskId, caseNumber, true);
                form.clientScriptModulePath = "./ACC_CL_OmnitracsSendOrder.js";
                form.addButton({
                    id: "custpage_startover",
                    label: "Start Over",
                    functionName: "returnHome()",
                });
                redirect.redirect({
                    url: '/app/common/scripting/scriptstatus.nl?sortcol=dcreated&sortdir=DESC&date=TODAY&scripttype=1607'
                });
                context.response.writePage(form);
            }
        }
    }

    function checkMRStatus(MR_SCRIPT) {
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

    function checkSSStatus(ssScript, deploymentId, returnStatus) {
        var ssScriptInstanceLookup = search.create({
            type: "scheduledscriptinstance",
            filters: [
                ["percentcomplete", "lessthan", "100"],
                "AND",
                ["script.internalid", "anyof", ssScript],
                "AND",
                ["scriptdeployment.scriptid", "is", deploymentId],
            ],
            columns: [
                search.createColumn({
                    name: "status",
                    label: "Status",
                }),
            ],
        });
        var searchResultCount = ssScriptInstanceLookup.runPaged().count || 0;
        var status;
        ssScriptInstanceLookup.run().each(function (result) {
            status = result.getValue("status");
            return true;
        });
        return returnStatus && status ? status : searchResultCount;
    }

    function callScheduledTask(scriptId, deploymentId, params = {}) {
        log.debug("callScheduledTask", {scriptId, deploymentId, params})
        var ssTask = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: scriptId,
            deploymentId: deploymentId,
            params: params
        });

        return ssTask.submit();
    }

    function callMrTask(scriptId, params = {}, deploymentId) {
        var mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: scriptId,
            deploymentId: deploymentId,
            params: params
        });

        return mrTask.submit();
    }

    function getFileContentOrdersReceived(folder, fileName) {
        var ordersReceived = "";
        var fileSearch = nlapiSearchRecord("file", null,
            [
                ["folder", "anyof", folder],
                "AND",
                ["name", "haskeywords", fileName]
            ],
            [
                new nlobjSearchColumn("name").setSort(false),
                new nlobjSearchColumn("folder"),
                new nlobjSearchColumn("documentsize"),
                new nlobjSearchColumn("url"),
                new nlobjSearchColumn("created"),
                new nlobjSearchColumn("modified"),
                new nlobjSearchColumn("filetype")
            ]
        );

        var domain = window.location.href.split("/")[2];
        var url = domain + fileSearch[0]?.valuesByKey?.url?.value;

        fetch(url).then(function (response) {
            return response.json();
        }).then(function (data) {
            debugger;
            ordersReceived = data;
            return ordersReceived;

        }).catch(function (error) {
            console.warn(error);
        });

        return ordersReceived;
    }

    function getFormOrders(taskId, caseNumber, isSavage = false) {
        var location = isSavage ? "Savage" : "Richmond";

        var formValue = `
                        <p id='total-send-qty'></p>
                        <p id='wait-message'>Please wait while orders are being sent, this can take a while.</p>
                        <p style="display: none" id='progress-completition'>Progress: <span id='remain-orders-complete'></span> / <span id='total-orders-complete'></span></p>
                        <p style="display: none" id='total-error-orders-progress'>Error Orders: <span id='remain-error-orders'></span></p>
                        <p style="display:none" id='saved-search-error-orders'>To see error orders click here: <a href="https://5774630.app.netsuite.com/app/common/search/searchresults.nl?rectype=1035&searchtype=Custom&Custom_CREATEDrange=ALL&Custom_CREATEDfrom=&Custom_CREATEDfromrel_formattedValue=&Custom_CREATEDfromrel=&Custom_CREATEDfromreltype=DAGO&Custom_CREATEDto=&Custom_CREATEDtorel_formattedValue=&Custom_CREATEDtorel=&Custom_CREATEDtoreltype=DAGO&CUSTRECORD_SDB_CASE_NUMBER_FOR_ROADNET=${caseNumber}&style=NORMAL&Custom_CREATEDmodi=WITHIN&Custom_CREATED=ALL&CUSTRECORD_SDB_CASE_NUMBER_FOR_ROADNETtype=STARTSWITH&report=&grid=&searchid=3117&dle=&sortcol=Custom_SCRIPTID_raw&sortdir=ASC&csv=HTML&OfficeXML=F&pdf=&size=500&_csrf=Xc1XZBMp1LeEXjd8BJD8Bm3UDvkLQllPrOlql-Op55LITCxi0Wb-bOR6nojh4RPnlCUUCZLYsenAQzXJ6OGiK2fFJTp5xF773HA0yTPaeqn8nuw61x-9ehx6hx73_0BS_EPeZH3wM9LNz-gqJZvNpuixX4LtviutTF6Wnlxd6wM%3D&twbx=F" target="_blank">SDB Road Net Orders Search</a></p>
                        
                        <script>
                            function getFileContentOrdersSent(folder, fileName)
                            {
                                var ordersSent = "";
                                var totalOrders = "";
                                var errorOrders = "";
    
                                var fileSearch = nlapiSearchRecord("file",null,
                                [
                                   ["folder","anyof",folder], 
                                   "AND", 
                                   ["name","haskeywords",fileName]
                                ], 
                                [
                                   new nlobjSearchColumn("name").setSort(false), 
                                   new nlobjSearchColumn("folder"), 
                                   new nlobjSearchColumn("documentsize"), 
                                   new nlobjSearchColumn("url"), 
                                   new nlobjSearchColumn("created"), 
                                   new nlobjSearchColumn("modified"), 
                                   new nlobjSearchColumn("filetype")
                                ]
                                );
                        
                                var domain = window.location.href.split("/")[2];
                                var url = "https://" + domain + fileSearch[0]?.valuesByKey?.url?.value;
    
                                jQuery.ajax({
                                    url: url,
                                    type: "GET",
                                    dataType: "json",
                                    async: false, // Set async option to false to make it synchronous
                                    success: function(data, status) {
                                      ordersSent = data?.ordersSent;
                                      totalOrders = data?.totalOrders;
                                      errorOrders = data?.errorOrders;
                                    },
                                    error: function(xhr, status, error) {
                                      // Handle error if the AJAX call fails
                                      console.error("AJAX request error:", status, error);
                                    }
                                });
    
                                return {ordersSent: ordersSent, totalOrders: totalOrders, errorOrders: errorOrders};
                            }
    
                            var tittleElement = document.getElementById("roadnetTitle");
                            var totalSentQty = document.getElementById("total-send-qty");
                            var totalErrorOrders = document.getElementById("total-error-orders-progress"); 
                            var waitMessage = document.getElementById("wait-message");
                            var progressCompletition = document.getElementById("progress-completition");
                            var progressErrorOrders = document.getElementById("remain-error-orders");
                            var remainOrders = document.getElementById("remain-orders-complete");
                            var savedSearchErrorLink = document.getElementById("saved-search-error-orders");
                            var outOfOrders = document.getElementById("total-orders-complete");
    
                            var idTask = "${taskId}"
                            if(idTask){
                                var SCHInterval = setInterval(function ()
                                {
                                jQuery.get("/app/site/hosting/scriptlet.nl?script=customscript_sdb_get_status_task&deploy=customdeploy_sdb_get_status_task&idTask=" + idTask, function (data, status)
                                {
                                    data = JSON.parse(data);
                                    var ordersSent = getFileContentOrdersSent(3393, "roadnet_orders_sent");
    
                                    progressCompletition.style.display = "block";
                                    totalErrorOrders.style.display = "block";
    
                                    remainOrders.innerHTML = ordersSent?.ordersSent;
                                    progressErrorOrders.innerHTML = ordersSent?.errorOrders;
                                    outOfOrders.innerHTML = ordersSent?.totalOrders;
    
                                    if (data && data.taskInformation && data.taskInformation.status == "COMPLETE")
                                    {
                                        waitMessage.style.display = "none";
                                        var ordersSent = getFileContentOrdersSent(3393, "roadnet_orders_sent");
                                        if (tittleElement) tittleElement.innerHTML = "CASE: ${caseNumber} - Sending ${location} orders completed";
                                        clearInterval(SCHInterval);
    
                                        // If there are error orders
                                        if(Number(progressErrorOrders.innerHTML) > 0){
                                            savedSearchErrorLink.style.display = "block";
                                        }
                                    }
                                });
                                }, 5000)
                            }
                            
                        </script>
                        
                        `;
        return formValue;
    }

    function getFormOrdersReceived(taskId, caseNumberReceived, routesStatus) {
        var formValue = `
                           <style>
   
                      .container-spinner{
                          width: 100vw;
                          height: 100vh;
                          background: gray;
                          z-index: 9990;
                          position: absolute;
                      }
                  
                      #spinner {
                          display: none;
                          position: fixed;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                          z-index: 9999;
                      }
                  
                      .spinner-border {
                          width: 3rem;
                          height: 3rem;
                          border: 3px solid rgba(0, 0, 0, 0.1);
                          border-top-color: #000;
                          border-radius: 50%;
                          animation: spin 1s linear infinite;
                      }
                  
                      @keyframes spin {
                          0% {
                              transform: rotate(0deg);
                          }
                  
                          100% {
                              transform: rotate(360deg);
                          }
                      }
                  </style>
                  <p id='wait-message'>Please wait while orders are being received, this can take a couple of minutes.</p>
                  <p style="display: none" id='progress-completition'>Progress: <span id='remain-orders-complete'></span></p>
                  <p id='total-received-qty'></p>
                  <p id='total-errors-qty'></p>
                  <p id='total-orders-processed'></p>
                  <p style="display:none" id='saved-search-received_orders'>To see report orders received: <a
                          href="https://5774630.app.netsuite.com/app/common/search/searchresults.nl?searchtype=Transaction&CUSTBODY_SDB_CASE_NUMBER_RECIB=${caseNumberReceived}&style=NORMAL&CUSTBODY_SDB_CASE_NUMBER_RECIBtype=STARTSWITH&report=&grid=&searchid=3371&dle=&sortcol=cfBODY_8400_raw&sortdir=DESC&csv=HTML&OfficeXML=F&pdf=&size=500&_csrf=Xc1XZBMp1LeEXjd8BJD8Bm3UDvkLQllPrOlql-Op55LITCxi0Wb-bOR6nojh4RPnlCUUCZLYsenAQzXJ6OGiK2fFJTp5xF773HA0yTPaeqn8nuw61x-9ehx6hx73_0BS_EPeZH3wM9LNz-gqJZvNpuixX4LtviutTF6Wnlxd6wM%3D&twbx=F"
                          target="_blank">SDB | Last transactions updated by Roadnet</a></p>
                  
                  
                  <div id="spinner">
                      <div class="spinner-border" role="status">
                          <span class="sr-only">...</span>
                      </div>
                  </div>
                  
                  <script>
                      function getFileContentOrdersReceived(folder, fileName) {
                          var returnObj = {};
                          var fileSearch = nlapiSearchRecord("file", null,
                              [
                                  ["folder", "anyof", folder],
                                  "AND",
                                  ["name", "haskeywords", fileName]
                              ],
                              [
                                  new nlobjSearchColumn("name").setSort(false),
                                  new nlobjSearchColumn("folder"),
                                  new nlobjSearchColumn("documentsize"),
                                  new nlobjSearchColumn("url"),
                                  new nlobjSearchColumn("created"),
                                  new nlobjSearchColumn("modified"),
                                  new nlobjSearchColumn("filetype")
                              ]
                          );
                  
                          var domain = window.location.href.split("/")[2];
                          var url = "https://" + domain + fileSearch[0]?.valuesByKey?.url?.value;
                              console.log(url)
                          jQuery.ajax({
                              url: url,
                              type: "GET",
                              dataType: "json",
                              async: false, // Set async option to false to make it synchronous
                              success: function (data, status) {
                                  returnObj.ordersReceived = data?.ordersReceived;
                                  returnObj.errorOrders = data?.errorOrders;
                              },
                              error: function (xhr, status, error) {
                                  // Handle error if the AJAX call fails
                                  console.error("AJAX request error:", status, error);
                              }
                          });
                  
                          return returnObj;
                     }
                      var tittleElement = document.getElementById("roadnetTitle");
                      var totalReceivedElement = document.getElementById("total-received-qty");
                      var totalOrdersProcessed = document.getElementById("total-orders-processed");
                      var totalErrorsElement = document.getElementById("total-errors-qty");
                      var waitMessage = document.getElementById("wait-message");
                      var progressCompletition = document.getElementById("progress-completition");
                      var remainOrders = document.getElementById("remain-orders-complete");
                      var searchReport = document.getElementById("saved-search-received_orders");
                      var spinner = document.getElementById('spinner');
                      spinner.style.display = 'block';
                      var btnStarOver = document.getElementById('custpage_startover');
                      var tb_btnStarOver = document.getElementById('tbl_custpage_startover');
                      btnStarOver.style.display = 'none';
                      tb_btnStarOver.style.display = 'none';
                  
                      var idTask = "${taskId}"
                      if (idTask) {
                          progressCompletition.style.display = "block";
                          remainOrders.innerHTML = 0;
                  
                          var SCHInterval = setInterval(function () {
                  
                              jQuery.get("/app/site/hosting/scriptlet.nl?script=customscript_sdb_get_status_task&deploy=customdeploy_sdb_get_status_task&idTask=" + idTask, function (data, status) {
                  
                                  data = JSON.parse(data);
                                  console.log(data)
                                  var fileContent = getFileContentOrdersReceived(3393, "roadnet_orders_received");
                                  var ordersReceived = fileContent.ordersReceived;
                                  var errorOrders = fileContent.errorOrders;
                                  console.log('fileContent', fileContent);
                  
                                  remainOrders.innerHTML = (Number(ordersReceived) + Number(errorOrders));
                  
                                  if (data && data.taskInformation && data.taskInformation.status == "COMPLETE") {
                                      if(spinner) spinner.style.display = 'none';
                                      var fileContent = getFileContentOrdersReceived(3393, "roadnet_orders_received");
                                      var ordersReceived = fileContent.ordersReceived;
                                      var errorOrders = fileContent.errorOrders;
                                      if (tittleElement) tittleElement.innerHTML = "CASE ${caseNumberReceived} - ${(routesStatus == "All") ? 'Receiving orders for all statuses' : 'Receiving orders with status ' + routesStatus} completed";
                                      if (totalReceivedElement) totalReceivedElement.innerHTML = "Total orders successfully received: " + Number(ordersReceived);
                                      if (totalErrorsElement && errorOrders > 0) totalErrorsElement.innerHTML = "Total errors: " + errorOrders;
                                      if (totalOrdersProcessed) totalOrdersProcessed.innerHTML = "Total orders processed: " + (Number(ordersReceived) + Number(errorOrders));
                                      if (searchReport) searchReport.style.display = 'block';
                                      btnStarOver.style.display = 'block';
                                      tb_btnStarOver.style.display = 'block';
                                      clearInterval(SCHInterval);
                                  } else if(data.taskInformation.status == "FAILED") {
                                        if(spinner) spinner.style.display = 'none';
                                        var fileContent = getFileContentOrdersReceived(3393, "roadnet_orders_received");
                                        var ordersReceived = fileContent.ordersReceived;
                                        if (totalOrdersProcessed) totalOrdersProcessed.innerHTML = "Total orders processed: " + (Number(ordersReceived) + Number(errorOrders));
                                        btnStarOver.style.display = 'block';
                                        tb_btnStarOver.style.display = 'block';
                                        clearInterval(SCHInterval);
                                  }
                              });
                          }, 5000)
                  
                      }
                  
                  </script>
                        `;

        return formValue;
    }

    function numerationCasesOrders() {
        // get number
        let numCounter = search.lookupFields({
            type: 'customrecord_sdb_order_counter_cases',
            id: '1',
            columns: 'custrecord_sdb_counter_received'
        });
        log.audit('numCounter', numCounter);
        //  Counter plus 1 for set at record, incremtental number
        numCounter = Number(numCounter.custrecord_sdb_counter_received) + 1;
        return numCounter
    }

    function getAndUpdateCaseNumber() {
        // Get case number
        var caseNumber = search.lookupFields({
            type: 'customrecord_sdb_order_counter_cases',
            id: '1',
            columns: ["custrecord_sdb_case_number_roadnet"]
        })?.custrecord_sdb_case_number_roadnet;

        caseNumber = Number(caseNumber);
        caseNumber += 1;

        record.submitFields({
            type: 'customrecord_sdb_order_counter_cases',
            id: 1,
            values: { custrecord_sdb_case_number_roadnet: caseNumber },
        });

        return caseNumber;
    }

    return {
        onRequest: onRequest,
    };
});