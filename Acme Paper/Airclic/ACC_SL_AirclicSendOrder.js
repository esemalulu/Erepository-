/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/ui/serverWidget", "N/search", "N/runtime", "N/task", "N/record", "N/redirect"], function (
	serverWidget,
	search,
	runtime,
	task,
	record,
	redirect
) {
	function onRequest(context) {
		try {
			const CURRENT_SCRIPT = runtime.getCurrentScript();
			const MR_SCRIPT = CURRENT_SCRIPT.getParameter("custscript_acc_airclic_mr_status");
			var params = context.request.parameters;
			if (context.request.method === "GET") {
				var title = "<p id='airclickTitle'>Send Orders to Airclic</p>";
				var landingForm = serverWidget.createForm({ title: title });
				landingForm.clientScriptModulePath = "./ACC_CL_AirclicSendOrder.js";

				landingForm.addFieldGroup({
					id: "custpage_filters",
					label: "Filters",
				});
				var startDate = landingForm.addField({
					id: "custpage_start_date",
					type: serverWidget.FieldType.DATE,
					label: "Start Date.",
					container: "custpage_filters",
				});
				var endDate = landingForm.addField({
					id: "custpage_end_date",
					type: serverWidget.FieldType.DATE,
					label: "End Date.",
					container: "custpage_filters",
				});

				var routeNoFld = landingForm.addField({
					id: "custpage_route_no",
					type: serverWidget.FieldType.TEXT,
					label: "Start Route No.",
					container: "custpage_filters",
				});
				routeNoFld.isMandatory = true;

				var endRouteNoFld = landingForm.addField({
					id: "custpage_end_route_no",
					type: serverWidget.FieldType.TEXT,
					label: "End Route No.",
					container: "custpage_filters",
				});
				endRouteNoFld.isMandatory = true;

				//Add environment field//
				var enviromentFld = landingForm.addField({
					id: "custpage_enviroment",
					type: serverWidget.FieldType.SELECT,
					label: "Environment to use",
					source: "customrecord_sdb_enviroments_airclic"
				});
				enviromentFld.isMandatory = true;

				
				//Add Shipment Date field//
				var shipmentDate = landingForm.addField({
					id: "custpage_shipment_date",
					type: serverWidget.FieldType.DATE,
					label: "Shipment date."
				});
				shipmentDate.isMandatory = true;
				//
				landingForm.addSubmitButton({
					label: "Send Orders",
				});

				showSentOrders(landingForm, context);

				context.response.writePage(landingForm);
			}
			else if (params.submitter == "Send Orders") {
				var routeNo = params.custpage_route_no;
				var routeNoEnd = params.custpage_end_route_no;
				var startDate = params.custpage_start_date;
				var endDate = params.custpage_end_date;
				var enviroment = params.custpage_enviroment;
				var shipmentDate = params.custpage_shipment_date;
				var inProgressMR = checkMRStatus();
				var title = "<p id='airclickTitle'>Sending Orders...</p>";
				//Adding MR Task to check status
				title = title + "<p id='mr_script_name' style='display: none'>" + MR_SCRIPT + "</p>"
				var form = serverWidget.createForm({ title: title });
				if (inProgressMR && inProgressMR > 0) {
					form.title = "<p id='airclickTitle'>Previous Orders processing...</p>";
					form.title = form.title + "<p id='mr_script_name' style='display: none'>" + MR_SCRIPT + "</p>"
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
				}
				else {
					const CURRENT_SCRIPT = runtime.getCurrentScript();
					const MR_SCRIPT = CURRENT_SCRIPT.getParameter(
						"custscript_acc_airclic_mr_status"
					);
					const taskId = callMrTask(routeNo, startDate, endDate, enviroment, shipmentDate, routeNoEnd);

					redirect.redirect({
						url: '/app/common/scripting/mapreducescriptstatus.nl?sortcol=dcreated&sortdir=DESC&date=TODAY&scripttype=' + MR_SCRIPT + "&primarykey="
					});
					return;
					/*form.addField({
						id: "custpage_task_id",
						type: serverWidget.FieldType.INLINEHTML,
						label: "Task script",
					}).defaultValue =
						`
				<p id='total-send-qty'></p></br>
				<p id='total-failed'></p>
				<script>
					function getFileContentOrdersSent(folder, fileName)
					{
						var ordersSent = "";
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
							  ordersSent = data?.OrdersSent;
							},
							error: function(xhr, status, error) {
							  // Handle error if the AJAX call fails
							  console.error("AJAX request error:", status, error);
							}
						});

						return ordersSent;
					}

					function getFileContentOrdersFailed(folder, fileName)
					{
						var ordersSent = "";
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
							  ordersFailed = data;
							},
							error: function(xhr, status, error) {
							  // Handle error if the AJAX call fails
							  console.error("AJAX request error:", status, error);
							}
						});

						return ordersFailed;
					}

					var tittleElement = document.getElementById("airclickTitle");
					var totalSentQty = document.getElementById("total-send-qty");
					var totalFailed = document.getElementById("total-failed");
					var idTask = "${taskId}"
					if(idTask){
						var SCHInterval = setInterval(function ()
						{
						jQuery.get("/app/site/hosting/scriptlet.nl?script=customscript_sdb_get_status_task&deploy=customdeploy_sdb_get_status_task&idTask=" + idTask, function (data, status)
						{
							data = JSON.parse(data);
							if (data && data.taskInformation && data.taskInformation.status == "COMPLETE")
							{
								var ordersSent = getFileContentOrdersSent(3392, "airclic_orders_sent");
								if (tittleElement) tittleElement.innerHTML = "Sending Orders Completed";
								if (ordersSent) totalSentQty.innerHTML = "Orders sent successfully: "+ ordersSent;
								var ordersFailedJSON = getFileContentOrdersFailed(3392, "orders_that_failed");
								var failedOrdersKeys = Object.keys(ordersFailedJSON)
								if (failedOrdersKeys.length > 0) {
									totalFailed.innerHTML = 'To see error orders click here: <a href="https://5774630.app.netsuite.com/app/common/search/searchresults.nl?searchid=3630&saverun=T&whence=" target="_blank">SDB Failed Airclic Orders Search</a>'
								}
								clearInterval(SCHInterval);
							}
						});
						}, 5000)

						setTimeout(function ()
						{
							clearInterval(SCHInterval);
						}, 1200000);
					}
					
				</script>
				
				`;*/
				}

				form.clientScriptModulePath = "./ACC_CL_AirclicSendOrder.js";

				form.addButton({
					id: "custpage_startover",
					label: "Start Over",
					functionName: "returnHome()",
				});

				context.response.writePage(form);
			}
		} catch (error) {
			log.error("ERROR: ", error);
		}
	}

	//--------------------------------------- AUXILIAR FUNCTIONS -------------------------------------------

	function checkMRStatus() {
		const CURRENT_SCRIPT = runtime.getCurrentScript();
		const MR_SCRIPT = CURRENT_SCRIPT.getParameter(
			"custscript_acc_airclic_mr_status"
		);
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

	function callMrTask(routeNo, startDate, endDate, enviroment, shipmentDate, routeNoEnd) {
		const CURRENT_SCRIPT = runtime.getCurrentScript();
		const MR_SCRIPT = CURRENT_SCRIPT.getParameter(
			"custscript_acc_airclic_mr_status"
		);

		var enviromentData = search.lookupFields({
			type: "customrecord_sdb_enviroments_airclic",
			id: enviroment,
			columns: ["custrecord_sdb_air_username",
				"custrecord_sdb_air_password",
				"custrecord_sdb_air_routeurl",
				"custrecord_sdb_air_xmltemplate"]
		});
		var username = enviromentData.custrecord_sdb_air_username;
		var password = enviromentData.custrecord_sdb_air_password;
		var routeurl = enviromentData.custrecord_sdb_air_routeurl;
		var xmlTemplateFile = enviromentData.custrecord_sdb_air_xmltemplate[0]?.value;

		var mrTask = task.create({
			taskType: task.TaskType.MAP_REDUCE,
			scriptId: MR_SCRIPT,
			deploymentId: "",
			params: {
				custscript_acc_air_routeno_end: routeNoEnd,
				custscript_acc_air_routeno: routeNo,
				custscript_start_date: startDate,
				custscript_end_date: endDate,
				custscript_acc_air_username: username,
				custscript_acc_air_password: password,
				custscript_acc_air_order_url: routeurl,
				custscript_acc_air_xml_template: xmlTemplateFile,
				custscript_acc_air_shipmentDate: shipmentDate
			},
		});
		return mrTask.submit();
	}

	function isEmpty(stValue) {
		if (
			stValue == null ||
			stValue == "" ||
			stValue == " " ||
			stValue == undefined
		) {
			return true;
		} else {
			return false;
		}
	}

	function showSentOrders(form, context) {
		var ordersSent = getOrdersAlreadySent();
		if (!ordersSent.length) return;

		//---------------COLUMNS---------------------
		var sublistOrders = form.addSublist({
			id: 'custpage_sublistid',
			type: serverWidget.SublistType.LIST,
			label: 'Orders Already Sent'
		});

		sublistOrders.addField({
			id: 'custpage_column_sales_order_id',
			type: serverWidget.FieldType.TEXT,
			label: 'Internal ID'
		});

		sublistOrders.addField({
			id: 'custpage_column_sales_order_name',
			type: serverWidget.FieldType.TEXT,
			label: 'Name'
		});

		sublistOrders.addField({
			id: 'custpage_column_sales_order_sent',
			type: serverWidget.FieldType.CHECKBOX,
			label: 'Send again?'
		});

		//--------------VALUES----------------------
		ordersSent.forEach(function (order, i) {
			//Set internal id
			sublistOrders.setSublistValue({
				id: 'custpage_column_sales_order_id',
				line: i,
				value: order.id
			});

			//Set order name
			sublistOrders.setSublistValue({
				id: 'custpage_column_sales_order_name',
				line: i,
				value: order.orderName
			});

			//Set checkbox to false so the user can check it later
			sublistOrders.setSublistValue({
				id: 'custpage_column_sales_order_sent_testhola',
				line: i,
				value: 'F'
			});
		});

		sublistOrders.addButton({
			id: 'custpage_sent_orders_again',
			label: 'Retry orders',
			functionName: "retryOrdersAirclic()"
		});


	}//End showSentOrders

	function getOrdersAlreadySent() {
		var resultArray = [];

		var invoiceSearchObj = search.create({
			type: search.Type.TRANSACTION,
			filters:
				[
					["type", "anyof", "CustInvc", "RtnAuth"],
					"AND",
					["custbody_aps_sent_to_airclick", "is", "T"],
					"AND",
					["mainline", "is", "T"]
				],
			columns:
				[
					search.createColumn({ name: "tranid", label: "Document Number" })
				]
		}).run();

		var resultRange = invoiceSearchObj.getRange({
			start: 0,
			end: 1000
		});
		log.debug('resultRange', resultRange)
		resultRange.forEach(function (result) {
			var obj = {};
			obj.id = result.id;
			obj.orderName = result.getValue("tranid");

			resultArray.push(obj);

			return true;
		});

		return resultArray;

	}//getOrdersAlreadySent

	return {
		onRequest: onRequest,
	};
});
