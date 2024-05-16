function importOrderGuides(){
  nlapiLogExecution("ERROR", 'Initiated', "Scheduled script called to import order guides")

  var context = nlapiGetContext();
  var file_id_param = nlapiGetContext().getSetting('SCRIPT', 'custscript_og_file_id')

  var file = nlapiLoadFile(file_id_param);
  var body = file.getValue();
  body = JSON.parse(body)
  var guides = body.guide_data;

  //guides have already been verified
  for(var i = 0; i < guides.length; i++){
    var new_guide_id = createGuide(guides[i])
    var items = [];
    for(var j = 0; j < guides[i].items.length; j++){
      var context = nlapiGetContext()
      items.push(
        createGuideItem(guides[i], guides[i].items[j])
      )
      nlapiLogExecution("ERROR", "usage", JSON.stringify(context.getRemainingUsage()))
    }
  }
  nlapiLogExecution("ERROR", "process", "Order guides imported successfully")
}
