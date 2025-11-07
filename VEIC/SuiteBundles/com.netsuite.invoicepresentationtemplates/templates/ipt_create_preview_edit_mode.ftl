<#ftl output_format="HTML">
<head>
<#if selectedGridRows.alfConfig?has_content && selectedGridRows.isAlf == 'true'>
    <#assign primary_color=selectedGridRows.alfConfig.primary_color/>
    <#assign footer_color=selectedGridRows.alfConfig.footer_color/>
    <#assign primary_text=selectedGridRows.alfConfig.primary_text/>
    <#assign footer_text=selectedGridRows.alfConfig.footer_text/>
    <#assign border_bottom="#7CBCDD"/>
    <#assign font_family="notosans, sans-serif"/>
<#elseif selectedGridRows.subsidiary?has_content && selectedGridRows.isAlf == 'false'>
    <#assign primary_color= "#e3e3e3"/>
    <#assign footer_color= "#e3e3e3"/>
    <#assign primary_text= "#2a2221"/>
    <#assign footer_text= "#2a2221"/>
    <#assign border_bottom="#ffffff"/>
    <#assign font_family="notosans, sans-serif"/>
<#else>
   <#assign primary_color= "#e3e3e3"/>
       <#assign footer_color= "#e3e3e3"/>
       <#assign primary_text= "#2a2221"/>
       <#assign footer_text= "#2a2221"/>
       <#assign border_bottom="#ffffff"/>
       <#assign font_family="notosans, sans-serif"/>
</#if>
<#assign transactionId = selectedGridRows.transactionId/>
<#assign transactionDate = selectedGridRows.transactionDate/>
<style type="text/css">
table {
    table-layout: fixed;
    border-spacing: 0;
    border-collapse: collapse;
}
table.itemtable {
    table-layout: auto;
}
table.header td {
    padding: 0px;
}
table.header tr {
    padding: 0px;
}
table.footer td {
    padding: 1px 5px 2px 0;
}
table.itemtable th, table.itemtable td {
    padding: 3px 3px;
}
table.subtotal {
    page-break-inside: avoid;
}
table.subtotal th {
    vertical-align: middle;
}
table.subtotal th, table.subtotal td {
    padding: 1px 5px 3px 0;
}
td.duplicate {
    align: center;
    vertical-align: middle;
    color: #AEAEAE;
    text-transform: uppercase;
}
tr.totalrow {
    padding: 7px 3px 7px 0;
}
td.totalboxheader {
    padding: 3px 3px 0 3px;
    font-size: 12pt;
}
td.totalbox {
    padding: 8px 3px 3px 3px;
    align: right;
}
table.itemtable td {
    border-bottom: 1px solid ${border_bottom};
}
.title {
    font-size: 10pt;
    line-height: 38px;
}
.nltitle {
    font-size: 21pt;
    line-height: 38px;
}

.titleSmall, td.totalbox {
    font-size: 13pt;
    line-height: 28px;
}
.body, table.subtotal td {
    font-size: 8pt;
    line-height: 14px;
}
table.itemtable td,table.footer td {
    font-size: 9px;
    line-height: 11px;
}
.label,td.totalboxheader, table.subtotal th {
    font-size: 8pt;
    line-height: 14px;
    font-weight: bold;
}
table.itemtable th {
    font-size: 9px;
    line-height: 11px;
    font-weight: bold;
}

.background {
    transform: rotate(-45deg);
    position: absolute;
    left: 45%;
    top: 25%;
}

.background .watermark {
    font-size: 30px;
    color: #0d745e;
    opacity: 0.25;
}

.labelBig, tr.totalrow th, tr.totalrow td {
    font-size: 9pt;
    line-height: 14px;
    font-weight: bold;
}

td.totalboxheader, td.totalbox, table.itemtable th, tr.totalrow, .totalamount {
    background-color: ${primary_color};
    color: ${primary_text};
}
table.footer {
    background-color: ${footer_color};
}
table.footer td {
    color: #000000;
    padding: 1px 5px 2px 0;
}
hr {
    width: 100%;
    color: #7CBCDD;
    background-color: #7CBCDD;
    height: 1px;
    margin-bottom: 40px;
    page-break-after: always;
}
.uppercase {
    text-transform: uppercase;
}
body {
    font-family: ${font_family};
    background-color: rgb(82, 86, 89,0%);
    color: var(--primary-text-color);
}
</style>
</head>
<body class="body" padding="0.5in 0.5in 0.4in 0.5in" size="A4">
<#macro pageheader>
    <table class="header" style="width: 100%;">
        <tr>
            <td width="33.3%"></td>
            <td width="33.3%"></td>
            <td width="33.3%"></td>
        </tr>
        <tr>
            <td align="left">
                <span class="titleSmall">${ipttranslate('INVOICE')} </span><span class="title">#${transactionId}</span>
                <br/><span class="label">${ipttranslate('DATE')}: </span><span class="body">${transactionDate}</span>
            </td>
            <td class="logo" rowspan="3" align="right" colspan="3">
                <#assign logoUrl = companyinformation.logoUrl>
                <img src="${logoUrl}" width="70px" height="70px"/>
            </td>
        </tr>
	</table>
    <br/>
</#macro>
<#macro pagefooter pageNumber totalPages>
    <table class="footer" style="width: 100%; padding: 20px 0.5in 0.4in 0.5in">
        <tr style="padding-bottom: 3px">
            <td width="33.3%">
                <#if selectedGridRows.subsidiary?has_content>
                   <#assign addressField=selectedGridRows.subsidiary.address/>
                   <#list addressField?split("\n") as address>
                   <br/> ${address}
                   </#list>
                <#else>
                    Company Name<br/>
                    012 Street Name<br/>
                    State Name CA 00000<br/>
                    Country name
                 </#if>
            </td>
            <td width="33.3%">
                <#if selectedGridRows.subsidiary?has_content>
                      <#assign telephone=selectedGridRows.subsidiary.telephone/>
                      <#assign email=selectedGridRows.subsidiary.email/>
                      <#assign fax=selectedGridRows.subsidiary.fax/>
                      <#assign url=selectedGridRows.subsidiary.url/>
                      <br>
                            <#if telephone??>
                               Tel. ${telephone}<br/>
                            </#if>
                            <#if fax??>
                                Fax ${fax}<br/>
                            </#if>
                            <#if email??>
                                ${email}<br/>
                            </#if>
                            <#if url??>
                                ${url}<br/>
                            </#if>
                <#else>
                Tel +0 (100)100-0000<br/>
                Fax 100-000-000<br/>
                sales@companyname.com<br/>
                CompanyName.com<br/>
                Code: 0123XYZ<br/>
                </#if>
            </td>
            <td width="33.3%" >
            </td>
        </tr>
        <tr style="margin-top: 20px">
        	<td colspan="2">
        	    <p class="label">${ipttranslate('INVOICE')} #${transactionId}</p>
        	</td>
        	<td style="padding: 0; vertical-align: middle">
        	    <p align="right" class="body" text-align="right">${ipttranslate('PAGE')} ${pageNumber} ${ipttranslate('OF')} ${totalPages}</p>
        	</td>
        </tr>
    </table>
</#macro>

<#assign ipttc = nstranslation.load({
    "collections":[{
        "alias": "default",
        "collection": "custcollection_ipt_collection",
        "keys": ["UNITS","DATE","TASK","VENDOR", "AMOUNT","ITEM","RATE","QUANTITY","IPT_DESCRIPTION","EMPLOYEE","EXPENSE_CATEGORY","MEMO","BILLING_CLASS","UNIT_TOTAL",
        "SUB_TOTAL","TAX_TOTAL","PAGE","OF","TOTAL_AMOUNT","EMPTY_CHARGES_DESCRIPTION","NONE_COLUMN_DESCRIPTION","PERCENTAGE_COMPLETE","VENDOR","TOTAL","SAMPLE","IPT_NO_PREVIEW","TIME_BASED","EXPENSE_BASED","FIXED_DATE","PURCHASE","PROJECT_PROGRESS","MILESTONE","INVOICE"],
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
<#if selectedGridRows.charges?has_content>
    <#assign iptcblist1 = selectedGridRows.charges/>
    <#assign iptcbTables = iptcblist1?eval/>
</#if>
<#if iptcbTables?has_content>
    <#assign table_number = 1>
    <#assign  totalPages = iptcbTables.charges?size/>
    <#assign pageNumber=1/>
    <#list iptcbTables.charges as cbTable>
        <@pageheader/>
        <table page-break-before="always">
            <tr>
                <td>
                    <span class="label" style="margin-bottom: 30px; font-size: 14px;page-break-before: always;">${ipttranslate('INVOICE')?upper_case} ${ipttranslate(cbTable.chargeType)?upper_case}</span>
                </td>
            </tr>
        </table>
        <#assign sizeofcolumns = cbTable.columns?size/>
        <div style="position: relative">
         <#if selectedGridRows.transactionId?trim == '' && (sizeofcolumns > 1)>
            <#assign sample = ipttranslate('SAMPLE')/>
            <div class="background">
               <p class="watermark">${sample}</p>
            </div>
        </#if>
        <table class="itemtable" style="width: 100%; margin-top: 20px; page-break-after: always; table-layout:fixed">
            <thead>
                <tr>
                <#if (sizeofcolumns > 1) >
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
                 </#if>
                </tr>
            </thead>
            <#if (sizeofcolumns > 1) && cbTable.rowsData?size != 0>
                <#list cbTable.rowsData as rowData>
                    <#if rowData.groupRow?? && rowData.groupRow == true>
                        <#assign noOfRows = rowData.rows?size>
                        <#assign row_number = 1>
                        <tr>
                            <!--td align="left" colspan = "${cbTable.columns?size}" -->
                            <td align="left" rowspan="${noOfRows + 1}">
                                <p text-align="left" style="font-weight: bold">${rowData.label}</p>
                            </td>
                            <!--td colspan="${cbTable.columns?size - 1}"></td-->
                        </tr>
                        <#assign secColumn2 = "secColumn2" >
                        <#list rowData.rows as row>
                            <#assign column_number = 1>
                            <tr style="border: 0px">
                                <!--td align="center"></td -->
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
                        <#assign taxrate = 0>
                        <#if record?? && record.taxrate??>
                            <#assign taxrate = record.taxrate>
                        </#if>
                        <#assign noOfColumns = cbTable.columns?size>
                        <#assign col_number = 1>
                         <#list cbTable.columns as column>
                              <td width = "100px" align="right">
                                <#if col_number == noOfColumns-1>
                                    <p text-align="right" style="font-weight: bold; margin-right:10px;">${ipttranslate('TAX_TOTAL')?upper_case}(${taxrate}%)</p>
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
            <#elseif (sizeofcolumns = 1)>
                <tr>
                    <td align="center" colspan="${cbTable.columns?size}">
                        <br/><p text-align="left" style="font-size:12px;">${ipttranslate('NONE_COLUMN_DESCRIPTION')}</p><br/>
                    </td>
                </tr>
                <#else>
                 <tr>
                       <td align="center" colspan="${cbTable.columns?size}">
                           <br/><p text-align="left">${ipttranslate('EMPTY_CHARGES_DESCRIPTION')}</p><br/>
                        </td>
                 </tr>
            </#if>
        </table>
        </div>
        <#assign table_number++>
        <br/><br/>
        <@pagefooter pageNumber = pageNumber totalPages = totalPages/>
        <#if pageNumber lt totalPages>
            <hr/>
        </#if>
        <#assign pageNumber++>
    </#list>
<#else>
    <table style="width: 100%; margin-top: 20px">
        <tr>
            <td align="center">
                <p text-align="left">${ipttranslate('IPT_NO_PREVIEW')}</p>
            </td>
        </tr>
    </table>
</#if>
</body>