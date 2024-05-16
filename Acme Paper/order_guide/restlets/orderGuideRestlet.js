function verifyUniqueName(guide_name){
  var guides = getOrderGuides(
    [new nlobjSearchFilter("custrecord_linked_guide_name", null, "is", guide_name)]
  )
  if(!guides){
    return true
  }
  if(guides.length == 0){
    return true
  }
  return false
}

function editGuide(guide){
  var nl_guide = nlapiLoadRecord(GUIDES_RECORD, guide.id)
  setGuideRecord(nl_guide, guide)
  return nlapiSubmitRecord(nl_guide)
}

function editGuideItem(guide, item){
  var nl_item = nlapiLoadRecord(GUIDE_ITEMS_RECORD, item.id)
  setGuideItemRecord(nl_item, guide, item)
  return nlapiSubmitRecord(nl_item)
}

function verifyGuide(guide, check_unique_name){
  if(!guide.name){
    throw new Error("Guide records must be named")
  }
  if(!guide.start_date){
    throw new Error("Guide records must be given a start date")
  }

  if(check_unique_name){
    var valid_name = verifyUniqueName(guide.name)
    if(!valid_name){
      throw new Error("Guide already exists with this name : " + guide.name)
    }
  }
}

function orderGuideRestlet(req, res){

  try {
    var body = req

    var guide = body.guide
    var mode = body.mode

    if(mode == "create"){

      verifyGuide(guide, true)
      var new_guide_id = createGuide(guide)
      var order_guides = getOrderGuides(null)

      var response_body = {
        guides: order_guides
      }
      return JSON.stringify(response_body)
    }

    if(mode == "import"){

      var guides = body.guide_data
      if(!guides){
        throw new Error("Guide data not provided")
      }

      for(var i = 0; i < guides.length; i++){
        verifyGuide(guides[i], true)
      }

      var items_count = 0
      for(var i = 0; i < guides.length; i++){
        for(var j = 0; j < guides[i].items.length; j++){
          items_count += 1
        }
      }

      if(items_count > 75){

        var file_contents = JSON.stringify(body)
        var file_id = writeJSONToFile(file_contents, "importOrderGuides.js", "order_guide_import.json")

        nlapiLogExecution("ERROR", "file created", "JSON transfer file created")
        var params = {
          custscript_og_file_id: file_id
        }
        nlapiScheduleScript('customscript_og_import', 'customdeploy_og_import', params)
        nlapiLogExecution("ERROR", 'called schedule script')
        var res_obj = {
          success: true,
          scheduled: true
        }
        return JSON.stringify(res_obj)
      }

      for(var i = 0; i < guides.length; i++){
        var new_guide_id = createGuide(guides[i])
        var items = []
        for(var j = 0; j < guides[i].items.length; j++){
          var context = nlapiGetContext()
          guides[i].id = new_guide_id
          items.push(
            createGuideItem(guides[i], guides[i].items[j])
          )
          nlapiLogExecution("ERROR", "usage", JSON.stringify(context.getRemainingUsage()))
        }
      }
      var order_guides = getOrderGuides(null)
      var response_body = {
        success: true,
        scheduled: false,
        refreshed_guides: order_guides
      }
      return JSON.stringify(response_body)
    }

    if(mode == "add_item" || mode == "edit_item"){
      var item = body.item
      if(!item.item_id){
        throw new Error("Please select an item to add")
      }
      if(!guide.id){
        throw new Error("Please include guide record")
      }

      if(mode == "add_item"){
        var guide_item_record_id = createGuideItem(guide, item)
      }
      if(mode == "edit_item"){
        var edited_guide_item_id = editGuideItem(guide, item)
      }

      var this_guide = getOrderGuides(
        [new nlobjSearchFilter("custrecord_linked_guide_name", null, "is", guide.name)]
      )
      var all_guides = getOrderGuides(null)

      var response_body = {
        guide: this_guide[0],
        all_guides: all_guides
      }
      return JSON.stringify(response_body)
    }

    if(mode == "delete_guide"){

      if(!guide.id){
        throw new Error("Please select a guide")
      }

      for(var i = 0; i < guide.items.length; i++){
        nlapiDeleteRecord(GUIDE_ITEMS_RECORD, guide.items[i].id)
      }

      var record = nlapiLoadRecord(GUIDES_RECORD, guide.id)
      record.setFieldValue("isinactive", "T")
      record.setFieldValue("custrecord_linked_guide_name", "")
      var id = nlapiSubmitRecord(record)

      var all_guides = getOrderGuides(null)

      var response_body = {
        guide: guide,
        all_guides: all_guides
      }
      return JSON.stringify(response_body)
    }

    if(mode == "edit_guide"){
      if(!guide.id){
        throw new Error("Please select a guide")
      }

      var current_guide = nlapiLoadRecord(GUIDES_RECORD, guide.id)
      var current_name = current_guide.getFieldValue("custrecord_linked_guide_name")
      var submitted_name = guide.name

      var perform_name_change = current_name === submitted_name
      perform_name_change = !perform_name_change
      verifyGuide(guide, perform_name_change)

      var edited_guide = editGuide(guide)

      var all_guides = getOrderGuides(null)
      var refreshed_edited_guide = getOrderGuides(
        [new nlobjSearchFilter("custrecord_linked_guide_name", null, "is", submitted_name)]
      )

      var response_body = {
        guide: refreshed_edited_guide,
        all_guides: all_guides
      }
      return JSON.stringify(response_body)
    }

    if(mode == "delete_item"){
      var item = body.item
      if(!item.id){
        throw new Error("Please select an item")
      }
      if(!guide.id){
        throw new Error("Please select a guide")
      }

      nlapiDeleteRecord(GUIDE_ITEMS_RECORD, item.id)
      var all_guides = getOrderGuides(null)
      var this_guide = getOrderGuides(
        [new nlobjSearchFilter("custrecord_linked_guide_name", null, "is", guide.name)]
      )

      var response_body = {
        all_guides: all_guides,
        guide: this_guide
      }
      return JSON.stringify(response_body)
    }

    if(mode == "submit_custom_columns"){
      var user_id = body.user_id
      var columns = body.columns

      var exists = JSON.parse(JSON.stringify(nlapiSearchRecord(
        "customrecord_og_custom_columns", null, [["name", "is", user_id.toString()]],
        createColumns(["name", "custrecord_og_columns"])
      )))
      nlapiLogExecution("ERROR", "exists", JSON.stringify(exists))
      var record
      if(exists){
        record = nlapiLoadRecord("customrecord_og_custom_columns", exists[0].id)
      } else {
        record = nlapiCreateRecord("customrecord_og_custom_columns")
      }
      record.setFieldValue("name", user_id.toString())
      record.setFieldValue("custrecord_og_columns", JSON.stringify(columns))
      var id = nlapiSubmitRecord(record)

      var columns = nlapiSearchRecord(
        "customrecord_og_custom_columns", null,
        [["name", "is", user_id.toString()]],
        createColumns(["name", "custrecord_og_columns"])
      )
      var response_body = {
        id: id,
        columns: JSON.parse(JSON.stringify(columns))
      }
      return JSON.stringify(response_body)

    }

  } catch (err) {
    var response_body = {error: err}
    return JSON.stringify(response_body)
  }

}
