/*thisifilename="ES_LIB_Item_Adjustment_Automation_NS_Constants.js"*/
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Jan 2016     Richard Cai
 *
 */
var ELIM = ELIM || {};
ELIM.CONSTANT = ELIM.CONSTANT || {
		DROPLIST : {
			TransactionType : {
				   "Bill" : "17",
				   "Bill Credit" : "20",
				   "Bill Payment" : "18",
				   "CCard Refund" : "22",
				   "Cash Refund" : "29",
				   "Cash Sale" : "5",
				   "Cheque" : "3",
				   "Credit Card" : "21",
				   "Credit Memo" : "10",
				   "Currency Revaluation" : "36",
				   "Customer Deposit" : "40",
				   "Customer Refund" : "30",
				   "Deposit" : "4",
				   "Deposit Application" : "41",
				   "Estimate" : "6",
				   "Expense Report" : "28",
				   "Finance Charge" : "52",
				   "Inventory Adjustment" : "11",
				   "Inventory Cost Revaluation" : "51",
				   "Inventory Count" : "57",
				   "Inventory Distribution" : "14",
				   "Inventory Transfer" : "12",
				   "Inventory Worksheet" : "13",
				   "Invoice" : "7",
				   "Item Fulfillment" : "32",
				   "Item Receipt" : "16",
				   "Journal" : "1",
				   "Opportunity" : "37",
				   "Paycheck Journal" : "56",
				   "Payment" : "9",
				   "Purchase Order" : "15",
				   "Return Authorisation" : "33",
				   "Sales Order" : "31",
				   "Sales Tax Payment" : "23",
				   "Statement Charge" : "8",
				   "Tegata Payable" : "50",
				   "Tegata Receivable" : "49",
				   "Transfer" : "2",
				   "Transfer Order" : "48",
				   "Vendor Return Authorization" : "43"
			},
			ItemTypeInid : {
				   "Assembly" : "5",//"Assembly/Bill of Materials"
				   "Description" : "11",//"Description"
				   "Discount" : "8",//"Discount"
				   "DwnLdItem" : "17",//"Download Item"
				   "EndGroup" : "16",//"End of Item Group"
				   "Expense" : "19",//"Expense"
				   "GiftCert" : "18",//"Gift Certificate"
				   "InvtPart" : "1",//"Inventory Item"
				   "Group" : "7",//"Item Group"
				   "Kit" : "6",//"Kit/Package"
				   "Markup" : "9",//"Markup"
				   "NonInvtPar" : "2",//"Non-inventory Item"
				   "OthCharge" : "4",//"Other Charge"
				   "Payment" : "12",//"Payment"
				   "TaxGroup" : "14",//"Sales Tax Group"
				   "TaxItem" : "13",//"Sales Tax Item"
				   "Service" : "3",//"Service"
				   "ShipItem" : "15",//"Shipping Cost Item"
				   //"Subscription Plan" : "20",
				   "Subtotal" : "10"//Subtotal
			}
		},
		CUSTLIST : {
			ESAdjProcessStatus : {
				ID : "customlist_es_adj_process_status",
				VALUE: {
					Pending : 1,
					Processing : 2,
					Cancelled : 3,
					Skipped : 4,
					Error : 5,
					CompletedWithError : 6,
					Completed : 7
				}
			}
		},
		CUSTRECORD : {
			ESAdjAdjustmentType : {
				ID : "customrecord_es_adj_type",
				FIELD: {
					AdjustmentAccount : "custrecord_adj_type_adjustment_account", //select
					DisplayDestinationDepartment : "custrecord_adj_type_disp_dest_department", //checkbox
					ExpenseAccount : "custrecord_adj_type_expense_account", //select
					UserInstructions : "custrecord_adj_type_instructions", //textarea
					InventoryTransactionTypes : "custrecord_adj_type_inv_trans_types", //multiselect
					NonInventoryTransactionTypes : "custrecord_adj_type_non_inv_trans_types", //multiselect
					PluginImplementation : "custrecord_adj_type_plugin_implement", //text
					PositveQuantityOnly : "custrecord_adj_type_positive_qty", //checkbox
					ReasonCode : "custrecord_adj_type_reason_code", //select
					ConvertToNegative : "custrecord_adj_type_use_as_negative", //checkbox
					Name : "name" //text
				},
				VALUE: {
					CycleCount : 1,
					DepartmentTransfer : 5,
					Production : 6,
					Sampling : 4,
					Transformation : 3,
					Wastage : 2
				}
			},
			ESAdjItemAdjustment : {
				ID : "customrecord_es_item_adjustment",
				FIELD: {
					DestinationDepartment : "custrecord_adj_department", //select
					Division : "custrecord_adj_division", //select
					ExtractedData : "custrecord_adj_extracted_data", //longtext
					Location : "custrecord_adj_location", //select
					LogFile : "custrecord_adj_log_file", //select
					Status : "custrecord_adj_status", //select
					Subsidiary : "custrecord_adj_subisidiary", //select
					SystemNotes : "custrecord_adj_system_notes", //longtext
					TransactionsCreated : "custrecord_adj_transactions", //multiselect
					AdjustmentType : "custrecord_adj_type", //select
					Department : "custrecord_adj_source_department" //select
				}
			},
			ESAdjItemAdjustmentLine : {
				ID : "customrecord_es_item_adjustment_line",
				FIELD: {
					Item : "custrecord_ail_item", //select
					ItemNDT : "custrecord_ail_item_non_dept_transfer", //select
					Description : "custrecord_ail_description", //Text Area
					ItemExpenseAccount : "custrecord_ail_item_account", //select
					ItemAdjustment : "custrecord_ail_item_adjustment", //select
					ItemDepartment : "custrecord_ail_item_department", //select
					ItemPrice : "custrecord_ail_item_price", //currency
					ItemType : "custrecord_ail_item_type", //select
					DepartmentFilter : "custrecord_ail_department_filter", //select
					Quantity : "custrecord_ail_quantity" //float
				}
			}
		},
		CUSTENTITY : {
			Sample : "custentity_sample" //Currency
		},
		CUSTITEM : {
		},
		CUSTCRM : {
		},
		TRANBODY : {
			ESAdjustmentType : "custbody_es_adjust_type", //select
			ESADJItemAdjustment : "custbody_es_adj_item_adjustment" //select
		},
		TRANCOL : {
		},
		ITEMNUMBER : {
		},
		OTHERFIELD : {	
		},
		RECORD : {
			Location : {
				ID : "location",
				FIELD : {
				}
			},
			Item : {
				ID : "item",
				FIELD : {
					Type : "type",
					Department : "department",
					ExpenseAccount : "expenseaccount",
					Price : "lastpurchaseprice"
				}
			}
		},
		ACCOUNT : {
		}
};