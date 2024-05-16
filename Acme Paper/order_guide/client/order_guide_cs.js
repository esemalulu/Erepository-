/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
// TODO
/**
 * 1. On item preview qty change, update the object in items_preview and original_preview_itemss
 * 2. After no.1, update current tr row class {qty}
 */

 define(
  ['N/currentRecord', 'N/url', 'N/search', 'N/ui/dialog'],
(currentRecord, url, search, dialog) => {

   //from UE - when user clicks on the orderGuidesButton
  function orderGuidesButton(){
    try {
      let current_form = currentRecord.get()
      let location_id = current_form.getValue('location')
      let subsidiary_id = current_form.getValue('subsidiary')
      let customer_id = current_form.getValue('entity')

      if(!customer_id){
        return alert("Please select a customer")
      }
      if(!location_id){
        return alert("Please select a location")
      }
      if(!subsidiary_id){
        return alert("Please select a subsidiary")
      }

      const popupCenter = ({url, title, w, h}) => {
        // Fixes dual-screen position                             Most browsers      Firefox
        const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX
        const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY

        const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width
        const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height

        const systemZoom = width / window.screen.availWidth
        const left = (width - w) / 1.5 / systemZoom + dualScreenLeft
        const top = (height - h) / 1.5 / systemZoom + dualScreenTop
        const newWindow = window.open(url, title,
          `
          scrollbars=yes,
          width=${w / systemZoom},
          height=${h / systemZoom},
          top=${top},
          left=${left},
          location=no,
          addressbar=no,
          toolbar=no,
          menubar=no,
          status=yes
          `
        )

        if(window.focus){
          newWindow.focus()
        }
      }

      let SUITELET = url.resolveScript({
        scriptId: "customscript_serve_order_creator",
        deploymentId: "customdeploy_serve_order_creator"
      }) + "&location=" + location_id + "&subsidiary=" + subsidiary_id + "&customer=" + customer_id

      popupCenter({
        url: SUITELET,
        title: 'Order Creator',
        w: 1600,
        h: 1200
      })

    } catch (e) {
      alert('Error:' + e)
    }
  }

  function saveRecord(context){
    // var record = context.currentRecord
    // var line_count = record.getLineCount({sublistId: "item"})
    // for(var i = 0; i < line_count; i++){
    //   var quantity = record.getSublistValue({
    //     sublistId: "item",
    //     fieldId: "quantity",
    //     line: i
    //   })
    //   var max_selling_quantity = record.getSublistValue({
    //     sublistId: "item",
    //     fieldId: "custcol_max_selling_quantity",
    //     line: i
    //   })
    //   if(max_selling_quantity){
    //     if(Number(quantity) > Number(max_selling_quantity)){
    //       alert(
    //         "Item on line " + (i + 1) + " exceeds the maximum selling quantity"
    //       )
    //       return false
    //     }
    //   }
    // }
    return true
  }



  return {
    orderGuidesButton: orderGuidesButton,
    saveRecord: saveRecord
  }
})
