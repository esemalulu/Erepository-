/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/format'],

	function (search, record, log, runtime, format) {

		function beforeSubmit(scriptContext) {
			try {
				var currentRoleId = runtime.getCurrentUser().id
				var newRec = scriptContext.newRecord;
				// new addition to prevent to break the print
				if (newRec.getValue('otherrefnum')) {
					var poNumb = newRec.getValue('otherrefnum').replace(/-/gi, "")
					newRec.setValue('otherrefnum', poNumb)
				}
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
					var shipDateObj = getNextBusinessDay(new Date());
					shipDateObj = String(new Date(shipDateObj))
					var shipDateString = String(new Date(shipDate))
					log.audit('shipDateObj', { shipDateObj, shipDateString })
					//if today is friday or saturday and shipDay is monday
					if (((today.getDay() == 5 || today.getDay() == 6) && shipDay == 1 && shipDate < nex_week) || (shipDateObj == shipDateString)) valueToSet = 1;
					var itemCount = newRec.getLineCount({ "sublistId": "item" });
					log.audit("FIRST OPTION: ", { orderId: newRec.id, itemCount, valueToSet });
					for (var i = 0; i < itemCount; i++) {
						var hasForceBo = newRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_force_bo', line: i }); //https://app.clickup.com/t/86azm56ax
						var hasForceBoDate = newRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_force_bo_date', line: i }); //https://app.clickup.com/t/86azm56ax

						newRec.setSublistValue({ sublistId: 'item', fieldId: 'commitinventory', line: i, value: hasForceBo ? 3 : valueToSet });
						newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_force_bo_date', line: i, value: hasForceBo && !hasForceBoDate ? new Date() : "" });

						// newRec.setSublistValue({ sublistId: 'item', fieldId: 'commitinventory', line: i, value: valueToSet });
					}
					// if (valueToSet == 1) newRec.setValue("custbody_a1wms_dnloadtimestmp", new Date()); COMMENTED 08/05/2024 
				} else { //if (shipDate <= tomorrow) {
					var itemCount = newRec.getLineCount({ "sublistId": "item" });
					log.audit("SECOND OPTION: ", { orderId: newRec.id, itemCount });
					for (var i = 0; i < itemCount; i++) {
						var hasForceBo = newRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_force_bo', line: i }); //https://app.clickup.com/t/86azm56ax
						var hasForceBoDate = newRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_force_bo_date', line: i }); //https://app.clickup.com/t/86azm56ax

						newRec.setSublistValue({ sublistId: 'item', fieldId: 'commitinventory', line: i, value: hasForceBo ? 3 : 1 });
						newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_force_bo_date', line: i, value: hasForceBo && !hasForceBoDate ? new Date() : "" });

						// newRec.setSublistValue({ sublistId: 'item', fieldId: 'commitinventory', line: i, value: 1 });
					}
					// newRec.setValue("custbody_a1wms_dnloadtimestmp", new Date()); COMMENTED 08/05/2024 
				}
				//}
			}
			catch (e) {
				log.error('Error', e);
			}
		}

		function loadHolidaysPageInit() {
			var aHolidays = [];
			var holidays = search.create({
				type: "customrecord_acme_official_holidays",
				filters:
					[],
				columns:
					['custrecord_aoh_holiday_date']
			});
			holidays.run().each(function (result) {
				aHolidays.push(result.getValue('custrecord_aoh_holiday_date'));
				return true;
			});
			return aHolidays;
		}

		function getNextBusinessDay(sDate) {
			var aHolidays = loadHolidaysPageInit();
			var dDate = new Date(sDate);
			var sReturn;
			do {
				dDate.setDate(dDate.getDate() + 1);
				sReturn = dDate;
				sReturn = getFormatDate(sReturn)
			} while (aHolidays.indexOf(sReturn) >= 0 || dDate.getDay() == 6 || dDate.getDay() == 0);

			return sReturn;
		}

		function getFormatDate(d) {
			return [d.getMonth() + 1 < 10 ? "0" + (d.getMonth() + 1) : d.getMonth(),
			d.getDate() < 10 ? "0" + d.getDate() : d.getDate(),
			d.getFullYear()].join('/')
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
