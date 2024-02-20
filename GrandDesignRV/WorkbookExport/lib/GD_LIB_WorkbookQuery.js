/**
 * @NApiVersion 2.1
 */
define([],
    () => {
        return `SELECT 
  TO_CHAR("TRANSACTION".trandate, 'MM/DD/YYYY') AS "Invoice Date",
  TO_CHAR("TRANSACTION".duedate, 'MM/DD/YYYY') AS "Invoice Due Date",
  TO_CHAR(BUILTIN.CAST_AS(NextTransactionLink_SUB.createddate, 'DATE'), 'MM/DD/YYYY') AS "invoice Paid Date", 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN_RESULT.TYPE_CURRENCY(BUILTIN.CONSOLIDATE(TransactionAccountingLine.amount, 'LEDGER', 'DEFAULT', 'DEFAULT', 1, 180, 'DEFAULT'), BUILTIN.CURRENCY(BUILTIN.CONSOLIDATE(TransactionAccountingLine.amount, 'LEDGER', 'DEFAULT', 'DEFAULT', 1, 180, 'DEFAULT')))) AS "invoice Line Amount", 
  BUILTIN_RESULT.TYPE_STRING(transactionLine_0.linesequencenumber) AS "invoice Line Number", 
  BUILTIN_RESULT.TYPE_STRING("TRANSACTION".tranid) AS "vendor Invoice Number", 
  REPLACE(BUILTIN.DF("TRANSACTION".terms),',','') AS "invoice Term", 
  BUILTIN_RESULT.TYPE_STRING(ROUND(transactionLine_0.quantity / NULLIF(unitsTypeUom_0.conversionrate, 0), 2)) AS "invoice Transaction Qty",   
  BUILTIN_RESULT.TYPE_STRING(ROUND(BUILTIN.CONSOLIDATE(TransactionAccountingLine.amount, 'LEDGER', 'DEFAULT', 'DEFAULT', 1, 180, 'DEFAULT') / NULLIF(transactionLine_0.quantity / NULLIF(unitsTypeUom_0.conversionrate, 0), 0), 4)) AS "invoice Item Rate", 
  BUILTIN.DF(transactionLine_0.units) AS "invoice UOM", 
  BUILTIN.DF(PreviousTransactionLineLink_SUB.item_0) AS "po Item Number", 
  BUILTIN.DF(PreviousTransactionLineLink_SUB.account_0) AS "po Account", 
  TO_CHAR(BUILTIN.CAST_AS(PreviousTransactionLineLink_SUB.createddate, 'DATE'), 'MM/DD/YYYY') AS "po Created Date", 
  TO_CHAR(PreviousTransactionLineLink_SUB.duedate, 'MM/DD/YYYY') AS "po Due Date", 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN_RESULT.TYPE_CURRENCY(BUILTIN.CONSOLIDATE(PreviousTransactionLineLink_SUB.foreignamount_0, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'), BUILTIN.CURRENCY(BUILTIN.CONSOLIDATE(PreviousTransactionLineLink_SUB.foreignamount_0, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT')))) AS "po Line Amount", 
  BUILTIN_RESULT.TYPE_STRING(PreviousTransactionLineLink_SUB.linesequencenumber_0) AS "po Line Number", 
  BUILTIN.DF(PreviousTransactionLineLink_SUB.itemtype_0) AS "po Item Type", 
  BUILTIN.DF(PreviousTransactionLineLink_SUB.previousdoc) AS "po Transaction", 
  REPLACE(BUILTIN.DF(PreviousTransactionLineLink_SUB.terms),',','') AS "po Terms", 
  BUILTIN_RESULT.TYPE_STRING(ROUND(PreviousTransactionLineLink_SUB.quantity_0 / PreviousTransactionLineLink_SUB.conversionrate_0, 3)) AS "purchase Transaction Qty", 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN_RESULT.TYPE_CURRENCY(BUILTIN.CONSOLIDATE(PreviousTransactionLineLink_SUB.rate_0, 'LEDGER', 'DEFAULT', 'DEFAULT', 1, 180, 'DEFAULT'), BUILTIN.CURRENCY(BUILTIN.CONSOLIDATE(PreviousTransactionLineLink_SUB.rate_0, 'LEDGER', 'DEFAULT', 'DEFAULT', 1, 180, 'DEFAULT')))) AS "po Item Price", 
  BUILTIN.DF(PreviousTransactionLineLink_SUB.units_0) AS "po UOM", 
  BUILTIN_RESULT.TYPE_INTEGER(Vendor."ID") AS "vendor ID", 
  BUILTIN_RESULT.TYPE_STRING(PreviousTransactionLineLink_SUB.custcolgd_vendorcode_0) AS "po Vendor Part Number"
FROM 
  "TRANSACTION", 
  Vendor, 
  TransactionAccountingLine, 
  item, 
  (SELECT 
    PreviousTransactionLineLink.nextdoc AS nextdoc_join, 
    PreviousTransactionLineLink.nextline AS nextline_join, 
    transactionLine_SUB.item AS item_0, 
    transactionLine_SUB."ACCOUNT" AS account_0, 
    transaction_0.createddate AS createddate, 
    transaction_0.duedate AS duedate, 
    transactionLine_SUB.foreignamount AS foreignamount_0, 
    transactionLine_SUB.linesequencenumber AS linesequencenumber_0, 
    transactionLine_SUB.itemtype AS itemtype_0, 
    PreviousTransactionLineLink.previousdoc AS previousdoc, 
    transaction_0.terms AS terms, 
    transactionLine_SUB.quantity AS quantity_0, 
    transactionLine_SUB.conversionrate AS conversionrate_0, 
    transactionLine_SUB.rate AS rate_0, 
    transactionLine_SUB.units AS units_0, 
    transactionLine_SUB.custcolgd_vendorcode AS custcolgd_vendorcode_0, 
    PreviousTransactionLineLink.previoustype AS previoustype_crit
  FROM 
    PreviousTransactionLineLink, 
    "TRANSACTION" transaction_0, 
    (SELECT 
      transactionLine."ID" AS "ID", 
      transactionLine."TRANSACTION" AS "TRANSACTION", 
      transactionLine."ID" AS id_join, 
      transactionLine."TRANSACTION" AS transaction_join, 
      transactionLine.item AS item, 
      TransactionAccountingLine_0."ACCOUNT" AS "ACCOUNT", 
      transactionLine.foreignamount AS foreignamount, 
      transactionLine.linesequencenumber AS linesequencenumber, 
      item_0.itemtype AS itemtype, 
      transactionLine.quantity AS quantity, 
      unitsTypeUom.conversionrate AS conversionrate, 
      transactionLine.rate AS rate, 
      transactionLine.units AS units, 
      transactionLine.custcolgd_vendorcode AS custcolgd_vendorcode
    FROM 
      transactionLine, 
      TransactionAccountingLine TransactionAccountingLine_0, 
      item item_0, 
      unitsTypeUom
    WHERE 
      (((transactionLine."TRANSACTION" = TransactionAccountingLine_0."TRANSACTION" AND transactionLine."ID" = TransactionAccountingLine_0.transactionline) AND transactionLine.item = item_0."ID"))
       AND transactionLine.units = unitsTypeUom.internalid
    ) transactionLine_SUB
  WHERE 
    PreviousTransactionLineLink.previousdoc = transaction_0."ID"
     AND ((PreviousTransactionLineLink.previousline = transactionLine_SUB."ID" AND PreviousTransactionLineLink.previousdoc = transactionLine_SUB."TRANSACTION"))
  ) PreviousTransactionLineLink_SUB, 
  unitsTypeUom unitsTypeUom_0, 
  transactionLine transactionLine_0, 
  (SELECT 
    NextTransactionLink.previousdoc AS previousdoc, 
    NextTransactionLink.previousdoc AS previousdoc_join, 
    transaction_1.createddate AS createddate, 
    transaction_1.createddate AS createddate_crit
  FROM 
    NextTransactionLink, 
    "TRANSACTION" transaction_1
  WHERE 
    NextTransactionLink.nextdoc = transaction_1."ID"
  ) NextTransactionLink_SUB
WHERE 
  ((((((("TRANSACTION".entity = Vendor."ID" AND (transactionLine_0."TRANSACTION" = TransactionAccountingLine."TRANSACTION" AND transactionLine_0."ID" = TransactionAccountingLine.transactionline)) AND transactionLine_0.item = item."ID") AND (transactionLine_0."TRANSACTION" = PreviousTransactionLineLink_SUB.nextdoc_join AND transactionLine_0."ID" = PreviousTransactionLineLink_SUB.nextline_join)) AND transactionLine_0.units = unitsTypeUom_0.internalid) AND "TRANSACTION"."ID" = transactionLine_0."TRANSACTION") AND "TRANSACTION"."ID" = NextTransactionLink_SUB.previousdoc))
   AND (("TRANSACTION"."TYPE" IN ('VendBill') AND PreviousTransactionLineLink_SUB.previoustype_crit IN ('PurchOrd') AND NextTransactionLink_SUB.createddate_crit BETWEEN TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS') AND TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS') AND (NOT(
    UPPER(item.itemtype) IN ('DESCRIPTION')
  ) OR UPPER(item.itemtype) IS NULL) AND "TRANSACTION".status IN ('VendBill:B')))`
            

    });
