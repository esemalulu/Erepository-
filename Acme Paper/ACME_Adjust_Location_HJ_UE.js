/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/log', 'N/record', 'N/currentRecord'],
	function (search, log, record, currentRecord)
	{

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {string} scriptContext.type - Trigger type
		 * @param {Form} scriptContext.form - Current form
		 * @Since 2015.2
		 */
		function beforeLoad(scriptContext)
		{

		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		function beforeSubmit(scriptContext)
		{

		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		function afterSubmit(context)
		{
			if (context.type != "create" && context.type != "copy" && context.type != "edit") return;

			try
			{
				var recordId = context.newRecord.id;
				var loc = context.newRecord.getValue("location");
				log.debug('Debug', ' location' + loc);
				var remaining_to_order_qty;

				if (loc != 103) return;

				var itemObj = record.load({
					type: record.Type.SALES_ORDER,
					id: recordId,
					isDynamic: true
				});
				if (!itemObj) return;

				//  var remainingArray=[],s0_line_items=[],backorder_items=[],itemObjaaray=[];
				var itemCount = itemObj.getLineCount("item");
				if (itemCount < 1) return;

				for (gg = 0; gg < itemCount; gg++)
				{
					var itmid = itemObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						line: gg
					});
					var richmond_qty = itemObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'quantityavailable',
						line: gg
					});
					var s0_qty = itemObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						line: gg
					});
					var so_location = itemObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'location',
						line: gg
					});
					log.debug('Debug', ' itmid=' + itmid + 's0_qty =' + s0_qty);

					if (Number(s0_qty) > Number(richmond_qty))
					{
						remaining_to_order_qty = Number(s0_qty) - Number(richmond_qty);//5-3 = 2;
					}
					else
					{
						remaining_to_order_qty = 0;
					}

					log.debug('Debug', ' remaining_to_order_qty' + remaining_to_order_qty);

					if (Number(remaining_to_order_qty) <= 0) return;

					//checking savage quantity
					var inventoryitemSearchObj = search.create({
						type: "item",
						filters:
							[
								["type", "anyof", "InvtPart"],
								"AND",
								["locationquantityavailable", "greaterthan", "0"],
								"AND",
								["inventorylocation", "anyof", "104"],
								"AND",
								["internalid", "anyof", itmid]
							],
						columns:
							[
								search.createColumn({ name: "locationquantityavailable", label: "Location Available" }),
								search.createColumn({ name: "inventorylocation", label: "Inventory Location" }),
								search.createColumn({
									name: "internalid",
									sort: search.Sort.ASC,
									label: "Internal ID"
								})
							]
					});
					var searchResultCount = inventoryitemSearchObj.runPaged().count;
					log.error('searchResultCount', searchResultCount);
					inventoryitemSearchObj.run().each(function (result)
					{
						var savage_qty = result.getValue({ name: "locationquantityavailable", label: "Location Available" });
						var locationAvail = result.getValue({ name: "inventorylocation", label: "Inventory Location" });
						var internlid = result.getValue({ name: "internalid", sort: search.Sort.ASC, label: "Internal ID" });
						var backorderqty = 0;

						log.debug('Debug', ' savage_qty=' + savage_qty + 'locationAvail' + locationAvail);

						// First Update Existing Richmond Line with correct quantity
						backorderqty = Number(remaining_to_order_qty) - Number(savage_qty);

						if (backorderqty < 0) backorderqty = 0;

						var total_quantity_richmond = Number(backorderqty) + Number(richmond_qty);

						var lineNumber = itemObj.findSublistLineWithValue({
							sublistId: 'item',
							fieldId: 'item',
							value: itmid
						});

						itemObj.selectLine({ sublistId: 'item', line: lineNumber });

						itemObj.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'quantity',
							value: total_quantity_richmond
						});
						itemObj.commitLine({
							sublistId: 'item'
						});

						log.debug('Debug', ' total_quantity_richmond =' + total_quantity_richmond);
						log.debug('Debug', ' backorderqty =' + backorderqty);
						log.debug('Debug', ' backorderqty =' + richmond_qty);

						var quantity_savage = 0;

						if (Number(remaining_to_order_qty) >= Number(savage_qty))
						{
							quantity_savage = Number(savage_qty);
						}
						else 
						{
							quantity_savage = Number(remaining_to_order_qty);
						}

						if (Number(savage_qty) > 0)
						{
							itemObj.selectNewLine({
								sublistId: 'item'
							});

							itemObj.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'item',
								value: itmid
							});

							itemObj.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'location',
								value: 104
							});
							itemObj.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'quantity',
								value: quantity_savage
							});

							itemObj.commitLine({
								sublistId: 'item'
							});
						}

						return true;

					});  // Search End

					//remaining quantity greater than 0
				} // Item Counter

				//Remove line with 0 quantity
				var itemCount = itemObj.getLineCount({
					sublistId: 'item'
				});
				if (itemCount < 1) return;

				for (gg = itemCount - 1; gg >= 0; gg--)
				{
					var itmid = itemObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						line: gg
					});
					var s0_qty = itemObj.getSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						line: gg
					});

					//	 log.debug('Debug', ' itmid='+itmid + 's0_qty ='+ s0_qty  );

					if (s0_qty == 0)
					{
						log.debug('Debug', ' gg=' + gg);

						itemObj.removeLine({
							sublistId: 'item',
							line: gg,
						});

					}

				}

				var id = itemObj.save();
				log.debug('Debug', ' Line removed');

			} catch (e)
			{
				log.error('error', e);
			}

		} // function aftersubmit
		return {
			//      beforeLoad: beforeLoad,
			//      beforeSubmit: beforeSubmit,
			afterSubmit: afterSubmit
		};

	});
