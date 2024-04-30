/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * @description Map/Reduce script used to send automated email notifications for product availability
 * @author Franklin Ilo (AddCore Software Corp.)
 */

define(['N/log', 'N/runtime', 'N/search', 'N/email', 'N/render'],
	(log, runtime, search, email, render) => {

		/**
		 * @description Get Input Stage
		 *
		 * @param inputContext
		 * @returns {Search|*[]}
		 */
		function getInputData(inputContext) {
			try {
				let currentScript = runtime.getCurrentScript();
				let updatedSpecialOrderItemsSearchId = currentScript.getParameter({name: 'custscript_ifd_updated_so_srch'});

				if (updatedSpecialOrderItemsSearchId) {
					return search.load({id: updatedSpecialOrderItemsSearchId});
				}
				else {
					log.error({title: 'getInputData() Error', details: 'Missing Updated Special Order Items search'});
					return [];
				}
			}
			catch (err) {
				log.error({title: 'getInputData() Error', details: err});
				throw err;
			}
		}

		/**
		 * @description Map Stage
		 *
		 * @param mapContext
		 */
		function map(mapContext) {
			try {
				let currentScript = runtime.getCurrentScript();
				let recentCustomersSearchId = currentScript.getParameter({name: 'custscript_ifd_so_items_cust_srch'});

				if (!recentCustomersSearchId) {
					log.error({title: 'map() Error', details: 'Missing Special Order Customers search'});
					return;
				}

				const CUSTOMER_SEARCH_PAGE_SIZE = 1000;

				let itemId = mapContext.key;
				let itemValues = JSON.parse(mapContext.value).values;
				log.debug({title: 'Item ID & Values: ' + itemId, details: JSON.stringify(itemValues)});

				let itemData = {};
				itemData.id = itemId;
				itemData.name = itemValues.itemid || '';
				itemData.displayName = itemValues.displayname || '';
				itemData.statusId = (itemValues.custitem_ifd_item_status) ? itemValues.custitem_ifd_item_status.value : '';
				itemData.statusText = (itemValues.custitem_ifd_item_status) ? itemValues.custitem_ifd_item_status.text : '';
				itemData.suggestedSubId = (itemValues.custitem_ifd_suggested_sub) ? itemValues.custitem_ifd_suggested_sub.value : '';
				itemData.suggestedSubText = (itemValues.custitem_ifd_suggested_sub) ? itemValues.custitem_ifd_suggested_sub.text : '';
				itemData.additionalSuggestedSubId = (itemValues.custitem_ifd_addtl_sug_subs) ? itemValues.custitem_ifd_addtl_sug_subs.value : '';
				itemData.additionalSuggestedSubText = (itemValues.custitem_ifd_addtl_sug_subs) ? itemValues.custitem_ifd_addtl_sug_subs.text : '';
				itemData.expectedRecoveryDate = itemValues.custitem_ifd_exp_rec_date || '';
				itemData.manufacturer = itemValues.manufacturer || '';

				log.debug({title: 'Item Data', details: JSON.stringify(itemData)});

				let recentCustomersSearch = search.load({id: recentCustomersSearchId});
				recentCustomersSearch.filters = (recentCustomersSearch.filters) ? recentCustomersSearch.filters : [];
				recentCustomersSearch.filters.push(search.createFilter({
					name: 'item',
					join: 'transaction',
					operator: search.Operator.ANYOF,
					values: [itemId]
				}));

				let recentCustomersSearchPagedData = recentCustomersSearch.runPaged({pageSize: CUSTOMER_SEARCH_PAGE_SIZE});
				let recentCustomersSearchTotalCount = recentCustomersSearchPagedData.count;
				log.debug({
					title: 'Recent Customers Search () - No of records returned',
					details: recentCustomersSearchTotalCount
				});

				if (recentCustomersSearchTotalCount > 0) {
					let recentCustomersSearchResultsData = []; //Array of all the recent customers search results

					let recentCustomersSearchTotalPages = Math.ceil(recentCustomersSearchTotalCount / CUSTOMER_SEARCH_PAGE_SIZE);
					log.debug({
						title: 'Recent Customers Search - Total number of pages',
						details: recentCustomersSearchTotalPages
					});

					let pageIndex;
					for (pageIndex = 0; pageIndex < recentCustomersSearchTotalPages && recentCustomersSearchTotalPages > 0; pageIndex++) {
						let recentCustomersSearchPage = recentCustomersSearchPagedData.fetch({index: pageIndex});
						recentCustomersSearchResultsData = recentCustomersSearchResultsData.concat(recentCustomersSearchPage.data);
					}

					recentCustomersSearchResultsData.forEach(function (result) {
						let customerData = {};

						customerData.id = result.getValue({name: 'internalid', summary: search.Summary.GROUP});
						customerData.entityId = result.getValue({name: 'entityid', summary: search.Summary.GROUP});
						customerData.customerName = result.getValue({name: 'altname', summary: search.Summary.GROUP});
						customerData.companyName = result.getValue({
							name: 'companyname',
							summary: search.Summary.GROUP
						});
						customerData.salesRepId = result.getValue({name: 'salesrep', summary: search.Summary.GROUP});
						customerData.salesRepName = result.getText({name: 'salesrep', summary: search.Summary.GROUP});
						customerData.itemId = result.getValue({
							name: 'item',
							join: 'transaction',
							summary: search.Summary.GROUP
						});
						customerData.itemText = result.getText({
							name: 'item',
							join: 'transaction',
							summary: search.Summary.GROUP
						});
						customerData.itemQuantity = result.getValue({
							name: 'quantity',
							join: 'transaction',
							summary: search.Summary.SUM
						});
						customerData.lastPurchaseDate = result.getValue({
							name: 'trandate',
							join: 'transaction',
							summary: search.Summary.MAX
						});

						log.debug({title: 'Customer Data', details: JSON.stringify(customerData)});

						//Write data to reduce stage
						mapContext.write({
							key: customerData.id,
							value: {
								'customerData': customerData,
								'itemData': itemData
							}
						});

					});
				}
			}
			catch (err) {
				log.error({title: 'map() Error', details: err});
				throw err;
			}
		}

		/**
		 * @description Reduce Stage
		 *
		 * @param reduceContext
		 */
		function reduce(reduceContext) {
			try {
				log.debug({
					title: 'Reduce Context Key: ' + reduceContext.key,
					details: JSON.stringify(reduceContext.values)
				});

				let customerId = reduceContext.key;
				let salesRepId = null;
				let salesRepCustomerData = [];
				let salesRepCustomerItemData = [];

				let currentScript = runtime.getCurrentScript();
				let customerContactsSearchId = currentScript.getParameter({name: 'custscript_ifd_so_items_cont_srch'});
				let notificationEmailTemplateId = currentScript.getParameter({name: 'custscript_ifd_updated_so_template'});
				let notificationEmailAuthor = currentScript.getParameter({name: 'custscript_ifd_updated_so_author'});

				if (!customerContactsSearchId) {
					log.error({title: 'reduce() Error', details: 'Missing Special Order Contacts search'});
					return;
				}

				if (!notificationEmailTemplateId || !notificationEmailAuthor) {
					log.error({title: 'reduce() Error', details: 'Missing Email Template or Email Author'});
					return;
				}

				let customerContacts = getCustomerContacts(customerId, customerContactsSearchId);

				if (!customerContacts || customerContacts.length < 1) {
					log.audit({
						title: 'No Contacts found for Customer',
						details: 'Internal ID: ' + customerId + '. Email Not Sent'
					});
					return;
				}

				let itemNotificationData = '<table>';


				//Process the values and retrieve all the item(s) purchased by the Customer
				for (let count = 0; count < reduceContext.values.length; count++) {
					let values = JSON.parse(reduceContext.values[count]);
					log.debug({title: 'Values', details: JSON.stringify(values)});

					//Get the Sales Rep
					if (count === 0) {
						salesRepId = values.customerData.salesRepId;
						log.debug({title: 'Sales Rep ID: ', details: salesRepId});
					}

					if (salesRepId) {
						salesRepCustomerData.push(values.customerData);
						salesRepCustomerItemData.push(values.itemData);
					}

					let itemName = values.itemData.name;
					let itemDisplayName = values.itemData.displayName;
					let manufacturer = values.itemData.manufacturer;
					let customerCompanyName = values.customerData.companyName || values.customerData.customerName;
					let customerPurchasedQuantity = values.customerData.itemQuantity;
					let customerPurchasedQuantityText = 'case';
					if (parseFloat(customerPurchasedQuantity) > 0) {
						customerPurchasedQuantityText = 'case(s)';
					}

					itemNotificationData += '<tr>';
					itemNotificationData += '<td style="padding-left: 20px;">';
					itemNotificationData += '<span style="color:blue; font-size:14px"><b>IFD #' + ': ' + itemName + ' ' + itemDisplayName + '</b></span><br /><br/>';
					itemNotificationData += '<span style="color:blue; font-size:14px"><b>Customer' + ': ' + customerCompanyName + '</b></span><br /><br/>';
					itemNotificationData += '<span style="color:blue; font-size:14px"><b>Manufacturer: </b>' + manufacturer + '</span><br /><br />';
					itemNotificationData += '<span style="color:red">Total case usage for accounts listed below over the last 9 months:' + customerPurchasedQuantity + ' ' + customerPurchasedQuantityText + '</span><br /><br /><br />';
					itemNotificationData += '</td>';
					itemNotificationData += '</tr>';
				}

				itemNotificationData += '</table>';

				//Create Email Merge
				let emailMergerResult = render.mergeEmail({
					templateId: notificationEmailTemplateId
				});

				//Send email to each contact
				for (let contactCount = 0; contactCount < customerContacts.length; contactCount++) {
					let contactFirstName = customerContacts[contactCount].firstName;
					let contactEmail = customerContacts[contactCount].email;
					let contactId = customerContacts[contactCount].id;

					let emailSubject = emailMergerResult.subject;
					emailSubject = emailSubject.replace(/##CONTACTNAME##/g, contactFirstName);

					let emailBody = emailMergerResult.body;
					emailBody = emailBody.replace(/##DATA##/g, itemNotificationData);

					email.send({
						author: notificationEmailAuthor,
						recipients: [contactEmail],
						subject: emailSubject,
						body: emailBody,
						relatedRecords: {
							entityId: contactId
						}
					});
				}

				if (salesRepId) {
					reduceContext.write({
						key: salesRepId,
						value: {
							customerData: salesRepCustomerData,
							itemData: salesRepCustomerItemData
						}
					});
				}

			}
			catch (err) {
				log.error({title: 'reduce() Error', details: err});
				throw err;
			}
		}

		/**
		 * @description Summarize Stage
		 *
		 * @param summaryContext
		 */
		function summarize(summaryContext) {
			try {
				if (summaryContext.inputSummary.error) {
					log.error({title: 'Input Stage Error: ', details: summaryContext.inputSummary.error});
				}

				summaryContext.mapSummary.errors.iterator().each(function (key, error, executionNo) {
					log.error({
						title: 'Map Stage Error for key ' + key,
						details: error + ', Execution No: ' + executionNo
					});
				});

				summaryContext.reduceSummary.errors.iterator().each(function (key, error, executionNo) {
					log.error({
						title: 'Reduce Stage Error for key ' + key,
						details: error + ', Execution No: ' + executionNo
					});
				});

				//Implement Summary Emails for Sales Reps - Start
				let currentScript = runtime.getCurrentScript();
				let notificationEmailTemplateId = currentScript.getParameter({name: 'custscript_ifd_updated_so_template'});
				let notificationEmailAuthor = currentScript.getParameter({name: 'custscript_ifd_updated_so_author'});

				let salesRepsData = {};

				summaryContext.output.iterator().each(function (key, value) {
					let salesRepId = key;

					if (salesRepId) {
						let salesRepValues = JSON.parse(value);

						//Check if the Sales Rep has been added to the global sales rep object
						if (!salesRepsData[salesRepId]) {
							salesRepsData[salesRepId] = {};
							salesRepsData[salesRepId].customers = [];
							salesRepsData[salesRepId].customerItems = [];
						}

						salesRepsData[salesRepId].customers.push(salesRepValues.customerData);
						salesRepsData[salesRepId].customerItems.push(salesRepValues.itemData);
					}

					return true;
				});

				log.debug({title: 'Summary Stage: Sales Rep Data', details: JSON.stringify(salesRepsData)});

				//Send Email to Sales Reps
				for (const salesRep in salesRepsData) {
					let salesRepName = '';
					let salesRepId = parseInt(salesRep);

					let itemNotificationData = '<table>';

					let salesRepsCustomers = salesRepsData[salesRep].customers;
					let salesRepsCustomerItems = salesRepsData[salesRep].customerItems;

					log.debug({title: 'Summary Stage: Sales Rep Customers', details: JSON.stringify(salesRepsCustomers)});
					log.debug({title: 'Summary Stage: Sales Rep Customer Items', details: JSON.stringify(salesRepsCustomerItems)});

					for (let count = 0; count < salesRepsCustomers.length; count++) {

						let customerData = salesRepsCustomers[count][0];
						let itemData = salesRepsCustomerItems[count][0];

						if (count === 0) {
							salesRepName = customerData.salesRepName;
						}

						let itemName = itemData.name;
						let itemDisplayName = itemData.displayName;
						let manufacturer = itemData.manufacturer;
						let customerCompanyName = customerData.companyName || customerData.customerName;
						let customerPurchasedQuantity = customerData.itemQuantity;
						let customerPurchasedQuantityText = 'case';

						if (parseFloat(customerPurchasedQuantity) > 0) {
							customerPurchasedQuantityText = 'case(s)';
						}

						itemNotificationData += '<tr>';
						itemNotificationData += '<td style="padding-left: 20px;">';
						itemNotificationData += '<span style="color:blue; font-size:14px"><b>IFD #' + ': ' + itemName + ' ' + itemDisplayName + '</b></span><br /><br/>';
						itemNotificationData += '<span style="color:blue; font-size:14px"><b>Customer' + ': ' + customerCompanyName + '</b></span><br /><br/>';
						itemNotificationData += '<span style="color:blue; font-size:14px"><b>Manufacturer: </b>' + manufacturer + '</span><br /><br />';
						itemNotificationData += '<span style="color:red">Total case usage for accounts listed below over the last 9 months:' + customerPurchasedQuantity + ' ' + customerPurchasedQuantityText + '</span><br /><br /><br />';
						itemNotificationData += '</td>';
						itemNotificationData += '</tr>';
					}

					itemNotificationData += '</table>';

					//Create Email Merge
					let salesRepEmailMergerResult = render.mergeEmail({
						templateId: notificationEmailTemplateId
					});

					let emailSubject = salesRepEmailMergerResult.subject;
					emailSubject = emailSubject.replace(/##CONTACTNAME##/g, salesRepName);

					let emailBody = salesRepEmailMergerResult.body;
					emailBody = emailBody.replace(/##DATA##/g, itemNotificationData);

					email.send({
						author: notificationEmailAuthor,
						recipients: [salesRepId],
						subject: emailSubject,
						body: emailBody,
						relatedRecords: {
							entityId: salesRepId
						}
					});
				}

				log.audit({
					title: 'Script Execution Details',
					details: 'Date Created: ' + summaryContext.dateCreated + ', Total Seconds: ' + summaryContext.seconds + ', Usage: ' + summaryContext.usage
				});
			}
			catch (err) {
				log.error({title: 'summarize() Error', details: err});
			}
		}

		/**
		 * @description Retrieves the Contacts associated with the Customer
		 *
		 * @param {Integer} customerId
		 * @param {string} contactSearchId
		 * @returns {Array}
		 */
		function getCustomerContacts(customerId, contactSearchId) {
			let customerContacts = [];

			if (customerId && contactSearchId) {
				let contactsSearch = search.load({id: contactSearchId});

				contactsSearch.filters = (contactsSearch.filters) ? contactsSearch.filters : [];
				contactsSearch.filters.push(search.createFilter({
					name: 'internalid',
					join: 'customer',
					operator: search.Operator.ANYOF,
					values: [customerId]
				}));

				contactsSearch.run().each(function (result) {
					let contactDetail = {};

					contactDetail.id = result.id;
					contactDetail.email = result.getValue({name: 'email'});
					contactDetail.customerId = result.getValue({name: 'internalid', join: 'customer'});
					contactDetail.customerName = result.getValue({name: 'altname', join: 'customer'});
					contactDetail.companyName = result.getValue({name: 'companyname', join: 'customer'});
					contactDetail.accountNumber = result.getValue({name: 'accountnumber', join: 'customer'});
					contactDetail.firstName = result.getValue({name: 'firstname'});

					customerContacts.push(contactDetail);
					return true;
				});
			}

			log.debug({
				title: 'Customer Contacts for Customer ID: ' + customerId,
				details: JSON.stringify(customerContacts)
			});
			return customerContacts;
		}

		return {getInputData, map, reduce, summarize};

	});
