/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/record",'N/ui/dialog','N/ui/message',"N/url","N/https"], function (record,dialog,message,url,https) {

    function pageInit(context) {
        try {
            var currentRecord = context.currentRecord
        } catch (error) {
            console.log(error)   
        }
     }

    function showModal(quoteId){
       try {
           var quote = record.load({
               type: record.Type.ESTIMATE,
               id: quoteId,
               isDynamic: true
           })
           
           var itemsLineCount = quote.getLineCount({sublistId: 'item'})
           var itemsToShow = [];
           for (let i = 0; i < itemsLineCount; i++) {
               var itemObj = {
                   item: quote.getSublistValue({sublistId: 'item',fieldId: 'item',line: i}),
                   itemText: quote.getSublistText({sublistId: 'item',fieldId: 'item',line: i}),
                   sellPrice: quote.getSublistValue({sublistId: 'item',fieldId: 'rate',line: i}),
                   priceLevel: quote.getSublistValue({sublistId: 'item',fieldId: 'price',line: i})
               }
               itemsToShow.push(itemObj)
           }
          generateModal(quote,itemsToShow)
       } catch (error) {
         console.log('showModal',error)   
       }
   }
   function generateModal(quote,itemsToShowParam){
       try {
           var itemsToShow = [];
           itemsToShow = itemsToShowParam.sort((p1, p2) => (p1.item > p2.item) ? 1 : (p1.item < p2.item) ? -1 : 0);
           var customerId = quote.getValue('entity')

           var msg = '<div style="width: 100%;" >';
           msg += '<table style="border-collapse: collapse; width: 100%;">';
           msg += '<tr>';
           msg += '<th style="border: 1px solid black; padding: 8px;">Item</th>';
           msg += '<th style="border: 1px solid black; padding: 8px;">Sell Price</th>';
           msg += '<th style="border: 1px solid black; padding: 8px;">Select</th>';
           msg += '</tr>';

           for (let i = 0; i < itemsToShow.length; i++) {
               msg += '<tr>';
               msg += '<td style="border: 1px solid black; padding: 8px;"id="'+'td'+itemsToShow[i].item + '">' + itemsToShow[i].itemText + '</td>';
               msg += '<td style="border: 1px solid black; padding: 8px;">' + itemsToShow[i].sellPrice + '</td>';
               msg += '<td style="border: 1px solid black; padding: 8px;"><input type="checkbox" id="'+i + itemsToShow[i].item + '"/></td>';
               msg += '</tr>';
           }

           msg += '</table>';
           msg += '<br/>';
           msg += '<div style="width: 100%; visibility:hidden; font-size: 18px; text-align:center" id="customer_updated_message"></div>';
           msg += '<div style="display: flex; justify-content: center; align-items: center;">';
           msg += '<br/>';
           msg += '<button id="save_item_pricing_btn">Save</button>';
           msg += '</div>';
           msg += '</div>';
           msg += '<br/>';
           msg += '<br/>';

           var popupConfig = {
               title : 'Convert To Item Pricing',
               msg : msg,
               width : '2000px',
               // with:'100%',
               multiline : false,
           };
           var modal = Ext.Msg.show(popupConfig);
           var saveItemPricingBtn = document.getElementById('save_item_pricing_btn')

           saveItemPricingBtn.addEventListener("click",()=>{
               var message = document.getElementById('customer_updated_message')
               getItemsChecked(customerId,itemsToShow,message)
            }
           )

       } catch (error) {
           console.log(error)
       }
   }
   function getItemsChecked(customerId,itemsShowed,message) {
       try {
           if(!customerId || !itemsShowed) return;

           var itemsToConvert =[];
           var cancel = false;

           for (let i = 0; i < itemsShowed.length && !cancel; i++) {
               var itemCheckbox = document.getElementById(i+itemsShowed[i].item)
               if(itemCheckbox.checked){
                   var repeatedElements = itemsToConvert.filter(obj=>obj.item == itemsShowed[i].item ) 
                   if(repeatedElements.length>0){

                       var repeatedItems = document.querySelectorAll('#'+'td'+itemsShowed[i].item)
                       for (let i = 0; i < repeatedItems.length; i++) {
                           var element = repeatedItems[i];
                           element.style.color = 'red';
                           element.setAttribute("alertMessage", "alertMessage");
                       }
                       message.style.visibility='visible'
                       message.style.color='red'
                       message.innerHTML = 'Error the selected items must be unique'
                       cancel=true;
                   }    
                   itemsToConvert.push(itemsShowed[i])
               }
           }
           if(itemsToConvert.length<=0)Ext.Msg.hide();
           
           if(itemsToConvert.length>0 && !cancel){
               var itemsToConvertParam = []
               for (let i = 0; i < itemsToConvert.length; i++) {
                  var obj = {
                   item:itemsToConvert[i].item,
                   priceLevel:itemsToConvert[i].priceLevel,
                   sellPrice:itemsToConvert[i].sellPrice,
                  }
                  itemsToConvertParam.push(obj)
               }
               var elements = document.querySelectorAll('[alertmessage]');
               for (let i = 0; i < elements.length; i++) {
                   var element = elements[i];
                       element.style.color = 'black';
               }
               message.style.color='green'
               message.innerHTML = 'Customer Updated Succesfully'
               message.style.visibility='visible'

               
               let suitelet = url.resolveScript({
                   scriptId: 'customscript_sdb_convert_quote_item_pri',
                   deploymentId: 'customdeploy_sdb_convert_quote_item_pri',
                   returnExternalUrl: false,
                   params:{
                       custom_param_items_to_convert:JSON.stringify(itemsToConvertParam),
                       custom_param_customer:customerId,
                   },
               })
               var response = https.post({
                   url: suitelet
               });
               setTimeout(() => {
                   Ext.Msg.hide();
               }, 2000);
           }

       } catch (error) {
           console.log(error)   
       }
    }

   return {
       pageInit:pageInit,
       showModal:showModal
   };
});