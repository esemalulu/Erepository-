/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime'],

	function (search, record, log, runtime) {

		function beforeSubmit(scriptContext) {
			try {
				var currentRoleId = runtime.getCurrentUser().id
				var newRec = scriptContext.newRecord;
				// new addition to prevent to break the print
				// if (newRec.getValue('otherrefnum')) {
				// 	var poNumb = newRec.getValue('otherrefnum').replace(/-/gi, "")
				// 	newRec.setValue('otherrefnum', poNumb)
				// }
				if (currentRoleId == 75190) return; //* This is HighJump User
				if (todayIsHoliday()) return;

				var shipDate = newRec.getValue({ fieldId: 'startdate' });
				const today = new Date(); //10/19/2023
				const nex_week = new Date(today);//10/19/2023
				const tomorrow = new Date(today);//10/19/2023

				nex_week.setDate(nex_week.getDate() + 5);
				tomorrow.setDate(tomorrow.getDate() + 1);
				var shipDay = new Date(shipDate).getDay();

				log.debug("DATA: ", { orderId: newRec.id, shipDate, tomorrow, today });

				// we need to validate this case, we need to ask if today is sunday and shipping date is monday
				if (shipDate > tomorrow) {
					var valueToSet = 3
					//if today is friday or saturday and shipDay is monday
					if ((today.getDay() == 5 || today.getDay() == 6) && shipDay == 1 && shipDate < nex_week) valueToSet = 1;
					var itemCount = newRec.getLineCount({ "sublistId": "item" });
					log.audit("FIRST OPTION: ", { orderId: newRec.id, itemCount, valueToSet });
					for (var i = 0; i < itemCount; i++) {
						newRec.setSublistValue({ sublistId: 'item', fieldId: 'commitinventory', line: i, value: valueToSet });
					}
					// if (valueToSet == 1) newRec.setValue("custbody_a1wms_dnloadtimestmp", new Date()); COMMENTED 08/05/2024 
				} else { //if (shipDate <= tomorrow) {
					var itemCount = newRec.getLineCount({ "sublistId": "item" });
					log.audit("SECOND OPTION: ", { orderId: newRec.id, itemCount });
					for (var i = 0; i < itemCount; i++) {
						newRec.setSublistValue({ sublistId: 'item', fieldId: 'commitinventory', line: i, value: 1 });
					}
					// newRec.setValue("custbody_a1wms_dnloadtimestmp", new Date()); COMMENTED 08/05/2024 
				}
				//}
			}
			catch (e) {
				log.error('Error', e);
			}

		}

		function todayIsHoliday() {
			try {
				var holidaySearch = search.create({
					type: "customrecord_acme_official_holidays",
					filters:
						[
							["custrecord_aoh_holiday_date", "on", "today"]
						],
					columns:
						[
						],
				});
				return holidaySearch.runPaged().count != 0;
			} catch (error) {
				log.error("isHoliday() ERROR", error);
			}
		}

		return {
			beforeSubmit: beforeSubmit
		};

	});
