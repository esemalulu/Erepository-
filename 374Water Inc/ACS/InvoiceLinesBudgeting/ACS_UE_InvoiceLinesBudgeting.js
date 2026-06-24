/**
 * Version    Date              Author              Remarks
 * 1.00       14 Nov 2025       Andres Rivero       Case 6572738, Initial Commit
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * @Author andres.rivero@oracle.com
 *
 */

define(['N/search'],
	(search) => {
		const beforeSubmit = ({newRecord, type, UserEventType}) => {
			try {
				const validEvents = [
					UserEventType.CREATE,
					UserEventType.EDIT
				];
				
				if (!validEvents.includes(type)) return;
				
				const salesOrderId = newRecord.getValue({fieldId: 'createdfrom'});
				const currentTranDate = newRecord.getValue({fieldId: 'trandate'});
				const currentTranId = newRecord.id;
				
				const totalBudgetMapping = getTotalBudgetMapping(salesOrderId);
				const invoicedToDateMapping = getInvoicedToDateMapping(salesOrderId, currentTranDate, currentTranId, type, UserEventType);
				
				const lineCount = newRecord.getLineCount({sublistId: 'item'});
				
				const invoiceItemKeys = new Set();
				
				for (let i = 0; i < lineCount; i++) {
					const item = newRecord.getSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						line: i
					});
					const description = newRecord.getSublistValue({
						sublistId: 'item',
						fieldId: 'description',
						line: i
					});
					
					const itemKey = `${item}|${description}`;
					invoiceItemKeys.add(itemKey);
					
					const totalBudgetObj = totalBudgetMapping.find(obj => obj.item === item && obj.description === description);
					const invoicedToDateObj = invoicedToDateMapping ? invoicedToDateMapping.find(obj => obj.item === item && obj.description === description) : null;
					
					const previouslyInvoiced = invoicedToDateObj ? invoicedToDateObj.amount : 0;
					
					if (totalBudgetObj) {
						newRecord.setSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_totalbudget',
							line: i,
							value: totalBudgetObj.amount
						});
					} else {
						newRecord.setSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_totalbudget',
							line: i,
							value: 0
						});
					}
					
					newRecord.setSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_374_total_inv_to_date',
						line: i,
						value: previouslyInvoiced
					});
					
					if (totalBudgetObj && totalBudgetObj.amount !== 0) {
						const percentageCompleted = (previouslyInvoiced / totalBudgetObj.amount) * 100;
						
						newRecord.setSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_acs_percentage_completed',
							line: i,
							value: percentageCompleted.toFixed(2)
						});
					} else {
						newRecord.setSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_acs_percentage_completed',
							line: i,
							value: 0
						});
					}
				}
				
				const missingSOItems = getMissingSOItems(totalBudgetMapping, invoicedToDateMapping, invoiceItemKeys);
				
				newRecord.setValue({
					fieldId: 'custbody_acs_inv_missing_items',
					value: JSON.stringify({items: missingSOItems})
				});
				
			} catch (e) {
				log.error({
					title: 'ERROR | beforeSubmit',
					details: e
				});
			}
		};
		
		const getTotalBudgetMapping = (salesOrderId) => {
			const totalBudgetMapping = [];
			
			search.create({
				type: 'salesorder',
				filters:
					[
						['internalid', 'anyof', salesOrderId],
						'AND',
						['mainline', 'is', 'F'],
						'AND',
						['taxline', 'is', 'F'],
						'AND',
						['shipping', 'is', 'F'],
						'AND',
						['cogs', 'is', 'F']
					],
				columns:
					[
						'item',
						'amount',
						'memo'
					]
			}).run().each(result => {
				totalBudgetMapping.push({
					item: result.getValue({name: 'item'}),
					itemName: result.getText({name: 'item'}),
					amount: +result.getValue({name: 'amount'}),
					description: result.getValue({name: 'memo'})
				});
				return true;
			});
			
			return totalBudgetMapping;
		};
		
		const getInvoicedToDateMapping = (salesOrderId, currentTranDate, currentTranId, eventType, UserEventType) => {
			const invoicedToDateMapping = [];
			
			const filters = [
				['type', 'anyof', 'CustInvc'],
				'AND',
				['createdfrom', 'anyof', salesOrderId],
				'AND',
				['mainline', 'is', 'F'],
				'AND',
				['shipping', 'is', 'F'],
				'AND',
				['taxline', 'is', 'F'],
				'AND',
				['cogs', 'is', 'F']
			];
			
			if (eventType === UserEventType.EDIT) {
				filters.push('AND');
				filters.push(['internalid', 'noneof', currentTranId]);
			}
			
			const transactionSearchObj = search.create({
				type: 'invoice',
				filters,
				columns: [
					'item',
					'amount',
					'memo',
					'trandate',
					'tranid',
					'internalid'
				]
			});
			
			const searchResults = [];
			transactionSearchObj.run().each(result => {
				searchResults.push({
					internalId: result.getValue({name: 'internalid'}),
					tranDate: result.getValue({name: 'trandate'}),
					tranId: result.getValue({name: 'tranid'}),
					item: result.getValue({name: 'item'}),
					description: result.getValue({name: 'memo'}),
					amount: +result.getValue({name: 'amount'})
				});
				return true;
			});
			
			const currentDateObj = new Date(currentTranDate).getTime();
			
			searchResults.forEach(result => {
				const resultDateObj = new Date(result.tranDate).getTime();
				
				if (resultDateObj <= currentDateObj) {
					const found = invoicedToDateMapping.find(obj => obj.item === result.item && obj.description === result.description);
					
					if (found) {
						found.amount += result.amount;
					} else {
						invoicedToDateMapping.push({
							item: result.item,
							description: result.description,
							amount: result.amount
						});
					}
				}
			});
			
			if (invoicedToDateMapping.length === 0) return null;
			
			return invoicedToDateMapping;
		};
		
		const getMissingSOItems = (totalBudgetMapping, invoicedToDateMapping, invoiceItemKeys) => {
			const missingItems = [];
			
			totalBudgetMapping.forEach(soItem => {
				const itemKey = `${soItem.item}|${soItem.description}`;
				
				if (!invoiceItemKeys.has(itemKey)) {
					const invoicedToDateObj = invoicedToDateMapping
						? invoicedToDateMapping.find(obj => obj.item === soItem.item && obj.description === soItem.description)
						: null;
					
					const invoicedToDate = invoicedToDateObj ? invoicedToDateObj.amount : 0;
					const totalBudget = soItem.amount;
					
					let percentageCompleted = 0;
					if (totalBudget !== 0) {
						percentageCompleted = +((invoicedToDate / totalBudget) * 100).toFixed(2);
					}
					
					missingItems.push({
						item: soItem.itemName,
						description: soItem.description,
						totalBudget: totalBudget,
						invoicedToDate: invoicedToDate.toFixed(2),
						percentageCompleted: percentageCompleted
					});
				}
			});
			
			return missingItems;
		};
		
		return {
			beforeSubmit
		};
	});