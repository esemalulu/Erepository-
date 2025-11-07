<#if record.custbody_ipt_charge_summary_data1?has_content>
    <#assign iptcblist1 = record.custbody_ipt_charge_summary_data1?trim + record.custbody_ipt_charge_summary_data2?trim/>
    <#assign iptcbTables = iptcblist1?eval/>
<#elseif record.custbody_ipt_charge_summary_email1?has_content>
    <#assign iptcblist1 = record.custbody_ipt_charge_summary_email1?trim + record.custbody_ipt_charge_summary_email2?trim/>
    <#assign iptcbTables = iptcblist1?eval/>
</#if>
<#assign ipttc = nstranslation.load({
    "collections":[{
        "alias": "default",
        "collection": "custcollection_ipt_collection",
        "keys": ["UNITS","DATE","TASK","VENDOR", "AMOUNT","ITEM","RATE","QUANTITY","IPT_DESCRIPTION","EMPLOYEE","EXPENSE_CATEGORY","MEMO","BILLING_CLASS","UNIT_TOTAL",
        "SUB_TOTAL","TAX_TOTAL","TOTAL_AMOUNT","EMPTY_CHARGES_DESCRIPTION","PERCENTAGE_COMPLETE","VENDOR","TOTAL","SELECT","IPT_EXPENSE_RECEIPTS_UPDATED_ON", "TIME_BASED","EXPENSE_BASED","FIXED_DATE","PURCHASE","PROJECT_PROGRESS","MILESTONE","INVOICE"],
        "locale": .locale
    }]
})>
<#assign iptLocaleTC = nstranslation.selectLocale({
        "handle": ipttc,
        "locale": .locale
})>
<#function ipttranslate x>
    <#return iptLocaleTC.default[x]>
</#function>

<#if iptcbTables?has_content>
    <#assign table_number = 1>
    <#list iptcbTables.charges as cbTable>
        <table page-break-before="always">
            <tr>
                <td>
                    <span class="label" style="margin-bottom: 30px; font-size: 14px;page-break-before: always;">${ipttranslate('INVOICE')?upper_case} ${ipttranslate(cbTable.chargeType)?upper_case}</span>
                </td>
            </tr>
        </table>
        <table class="itemtable" style="width: 100%; margin-top: 20px; page-break-after: always; table-layout:fixed">
            <thead>
                <tr>
                    <#list cbTable.columns as column>
                        <#if column.name == "amt" || column.name == "amountByLine" || column.name =="rt" >
                            <th align="right">
                                <p text-align="right" style="margin-right:10px;">${ipttranslate(column.label)?upper_case}</p>
                            </th>
                        <#elseif column.name == "qty">
                             <th align="center">
                                  <p text-align="center">${ipttranslate(column.label)?upper_case}</p>
                             </th>
                        <#else>
                            <th align="left">
                                <p text-align="left">${ipttranslate(column.label)?upper_case}</p>
                            </th>
                        </#if>
                     </#list>
                </tr>
            </thead>
            <#if cbTable.rowsData?size != 0>
                <#list cbTable.rowsData as rowData>
                    <#if rowData.groupRow?? && rowData.groupRow == true>
                        <#assign noOfRows = rowData.rows?size>
                        <#assign row_number = 1>
                        <#assign secColumn2 = "secColumn2" >
                        <#list rowData.rows as row>
                            <#assign column_number = 1>
                            <tr style="border: 0px">
                                <!--td align="center"></td -->
                                  <#if row_number == 1>
                                    <td align="left" style="border: 0px">
                                        <p text-align="left" style="font-weight: bold">${rowData.label}</p>
                                    </td>
                                    <#else>
                                    <td style="border: 0px">
                                    </td>
                                  </#if>
                                <#list cbTable.columns as column>
                                    <#if column.name != cbTable.primaryGroupBy>
                                         <#if row[column.name]??>
                                            <#if column.name == cbTable.secondaryGroupBy>
                                                <#assign border = ''>
                                                <#if row?index+1 < rowData.rows?size>
                                                     <#if row[column.name] == rowData.rows[row?index + 1][column.name]>
                                                         <#assign border='style="border: 0px"'>
                                                     </#if>
                                                </#if>
                                                <#if secColumn2 == row[column.name]>
                                                    <td ${border} align="left">
                                                        <p text-align = "center"></p>
                                                    </td>
                                                <#else>
                                                    <#assign secColumn2 = row[column.name]>
                                                    <td ${border} align="left">
                                                        <p text-align = "left">${row[column.name]}</p>
                                                    </td>
                                                </#if>
                                            <#elseif column.name == "amt" || column.name == "amountByLine" || column.name == "rt" >
                                                <td width = "100px" align="right">
                                                    <#if row[column.name]??>
                                                         <p text-align="right" style="margin-right:10px;">${row[column.name]}</p>
                                                    </#if>
                                                </td>
                                            <#elseif  column.name == "qty">
                                                <td width = "100px" align="center">
                                                    <#if row[column.name]??>
                                                         <p text-align="center">${row[column.name]}</p>
                                                    </#if>
                                                </td>
                                            <#else>
                                                <td  width = "80px" align="left">
                                                    <p text-align="left">${row[column.name]}</p>
                                                </td>
                                            </#if>
                                        <#else>
                                             <#if column.name == "amt">
                                                <td  style="border: 0px" width = "100px" align="right"></td>
                                             <#else>
                                                 <td align="left"></td>
                                             </#if>
                                        </#if>
                                    </#if>
                                    <#assign column_number++>
                                </#list>
                            </tr>
                            <#assign row_number++>
                        </#list>
                        <#if rowData.subTotal?has_content>
                            <#assign noOfColumns = cbTable.columns?size>
                            <#assign col_number = 1>
                            <tr>
                                <#list cbTable.columns as column>
                                    <td width = "100px" align="right">
                                        <#if col_number == noOfColumns-1>
                                            <p text-align="right" style="font-weight: bold; margin-right:10px;">${ipttranslate('SUB_TOTAL')?upper_case}</p>
                                        </#if>
                                        <#if col_number == noOfColumns>
                                            <p text-align="right" style="margin-right:10px;">${rowData.subTotal}</p>
                                        </#if>
                                    </td>
                                    <#assign col_number++>
                                </#list>
                             </tr>
                        </#if>
                    <#else>
                        <tr>
                            <#list cbTable.columns as column>
                                <#if rowData[column.name]??>
                                    <#if column.name == "amt" || column.name == "amountByLine" || column.name == "rt" >
                                        <td align="right">
                                            <p text-align="right" style="margin-right:10px;">${rowData[column.name]}</p>
                                        </td>
                                    <#elseif column.name == "qty" >
                                        <td align="center">
                                            <p text-align="center">${rowData[column.name]}</p>
                                        </td>
                                    <#else>
                                        <td align="left">
                                            <p text-align="left">${rowData[column.name]}</p>
                                        </td>
                                    </#if>
                                </#if>
                            </#list>
                        </tr>
                    </#if>
                </#list>
                <#if cbTable.rowsData?size != 1>
                    <tr>
                        <#if cbTable.subTotal?has_content>
                            <#assign noOfColumns = cbTable.columns?size>
                            <#assign col_number = 1>
                             <#list cbTable.columns as column>
                                  <td width = "100px" align="right">
                                    <#if col_number == noOfColumns-1>
                                        <p text-align="right" style="font-weight: bold; margin-right:10px;">${ipttranslate('TOTAL')?upper_case}</p>
                                    </#if>
                                    <#if col_number == noOfColumns>
                                        <p text-align="right" style="margin-right:10px;">${cbTable.subTotal}</p>
                                    </#if>
                                  </td>
                                   <#assign col_number++>
                             </#list>
                        </#if>
                    </tr>
                </#if>
                <tr>
                    <#if cbTable.taxTotal?has_content>
                        <#assign noOfColumns = cbTable.columns?size>
                        <#assign col_number = 1>
                         <#list cbTable.columns as column>
                              <td width = "100px" align="right">
                                <#if col_number == noOfColumns-1>
                                    <p text-align="right" style="font-weight: bold; margin-right:10px;">${ipttranslate('TAX_TOTAL')?upper_case}(${record.taxrate}%)  </p>
                                </#if>
                                <#if col_number == noOfColumns>
                                    <p text-align="right" style="margin-right:10px;">${cbTable.taxTotal}</p>
                                </#if>
                              </td>
                               <#assign col_number++>
                         </#list>
                    </#if>
                </tr>
                <tr>
                    <#if cbTable.totalAmount?has_content>
                        <#assign noOfColumns = cbTable.columns?size>
                        <#assign col_number = 1>
                         <#list cbTable.columns as column>
                              <th width = "100px" align="right">
                                <#if col_number == noOfColumns-1>
                                    <p text-align="right" style="font-weight: bold; margin-right:10px;">${ipttranslate('TOTAL_AMOUNT')?upper_case}</p>
                                </#if>
                                <#if col_number == noOfColumns>
                                    <p text-align="right" style="margin-right:10px;">${cbTable.totalAmount}</p>
                                </#if>
                              </th>
                               <#assign col_number++>
                         </#list>
                    </#if>
                </tr>
            <#else>
                <tr>
                    <td align="center" colspan="${cbTable.columns?size}">
                        <p text-align="left">${ipttranslate('EMPTY_CHARGES_DESCRIPTION')}</p>
                    </td>
                </tr>
            </#if>
        </table>
        <#assign table_number++>
    </#list>
</#if>

<#if record.custbody_ipt_expense_receipts_print1?has_content>
<#assign expenseReceipts = record.custbody_ipt_expense_receipts_print1?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print2?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_print2?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print3?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_print3?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print4?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_print4?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print5?has_content>
<#assign expenseReceipts = record.custbody_ipt_expense_receipts_print5?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print6?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_print6?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print7?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_print7?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print8?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_print8?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print9?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_print9?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_print10?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_print10?trim/>
</#if>


<#if record.custbody_ipt_expense_receipts_email1?has_content>
<#assign expenseReceipts = record.custbody_ipt_expense_receipts_email1?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email2?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_email2?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email3?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_email3?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email4?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_email4?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email5?has_content>
<#assign expenseReceipts = record.custbody_ipt_expense_receipts_email5?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email6?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_email6?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email7?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_email7?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email8?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_email8?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email9?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_email9?trim/>
</#if>
<#if record.custbody_ipt_expense_receipts_email10?has_content>
<#assign expenseReceipts += record.custbody_ipt_expense_receipts_email10?trim/>
</#if>

<#if expenseReceipts?has_content>
    <table style="border:1px solid black;width:95%;">
    <#assign receipts = expenseReceipts?eval/>
        <#list receipts as attachment>
            <tr style="border:1px solid black;width:60%;">
                <td style="width:30%;margin:20px;font-size:10px;">${ipttranslate('IPT_EXPENSE_RECEIPTS_UPDATED_ON')}: ${attachment.attachmentDate}</td>
                <td style="border-left:1px solid black;">
                   <img style="width:300px;height:300px;margin:20px;" src="${attachment.src}" />
                </td>
            </tr>
        </#list>
    </table>
</#if>