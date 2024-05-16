function serveApp(req, res){

  function arrayFind(array, callback){
    for(var i = 0; i < array.length; i++){
      var item = array[i]
      if(callback(item) == true){
        return item
      }
    }
    return null
  }

  var file_search = JSON.parse(JSON.stringify(
    nlapiSearchRecord("file", null,
      [
        ["name","contains", "og_app_build.js"]
      ],
      [
        new nlobjSearchColumn("name"),
        new nlobjSearchColumn("url")
      ]
    )
  ))
  if(!file_search){
    throw new Error("Bundle does not contain files")
  }
  var og_app_build = file_search[0]

  if(req.getMethod() === 'GET'){
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
    html += "<script src='"
    html += og_app_build.columns.url
    html += "'></script>"
    html = html + "  </body>"
    html = html + "</html>"

    response.write(html)
  }
}
