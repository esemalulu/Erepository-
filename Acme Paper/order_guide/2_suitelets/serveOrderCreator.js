/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */

 define([
    "N/ui/serverWidget",
    "N/log",
    "/SuiteScripts/order_guide/order_guide_lib_2.js",
    "N/search"
],
function(ui, log, og_lib, search){

  //define and draw custom form window on GET
  function getForm(context) {

    var files = og_lib.get4000(
      search.create({
        type: "file",
        filters: [["name", "contains", "order_creator_build.js"]],
        columns: og_lib.createColumns(["url", "name"])
      }).run()
    )
    log.error("files", JSON.stringify(files))
    if(!files){
      throw new Error("Could not find order creator file")
    }
    var order_creator_build = files[0]
    if(!order_creator_build){
      throw new Error("Could not find order creator file")
    }

    html = "<!DOCTYPE html>"
    html = html + "<html lang='en'>"
    html = html + "  <head><title>Order Guides</title>"
    html = html + "    <meta charset='utf-8' />"
    html = html + "    <link rel='preconnect' href='https://fonts.gstatic.com'>"
    html = html + "  <link href='https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&display=swap' rel='stylesheet'>"
    html = html + "  <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.css'"
    html = html + "  integrity='sha512-8bHTC73gkZ7rZ7vpqUQThUDhqcNFyYi2xgDgPDHc+GXVGHXq+xPjynxIopALmOPqzo9JZj0k6OqqewdGO3EsrQ==' crossorigin='anonymous' />"
    html = html + "    <link rel='stylesheet' href='https://marksiegrist.dev/useful_styles.css' />"
    html = html + "    <link rel='icon' href='%PUBLIC_URL%/favicon.ico' />"
    html = html + "    <meta name='viewport' content='width=device-width, initial-scale=1' />"
    html = html + "    <meta name='theme-color' content='#000000' />"
    html = html + "    <meta"
    html = html + "      name='description'"
    html = html + "      content='Web site created using create-react-app'"
    html = html + "    />"
    html = html + "  </head>"
    html = html + "  <body>"
    html = html + "    <noscript>You need to enable JavaScript to run this app.</noscript>"
    html = html + "    <div id='root'></div>"
    html = html + "      <script src='"
    html += order_creator_build.values.url
    html += "'></script>"
    html = html + "  </body>"
    html = html + "</html>"

    context.response.write(html)
  }



  function onRequest(context) {

    try {
      if(context.request.method == "GET"){
        log.debug("GET")
        getForm(context)
      } else {
        log.debug("POST")
      }
    } catch (err) {
      log.error("onRequest", err)
      context.response.write(
        "Exception Occured in Field Change. Please try again!" + err
    )
    }
  }

  return {
    onRequest: onRequest,
  }
})
