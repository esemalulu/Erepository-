function createColumns(column_names){
  var columns = [];
  for(var i = 0; i < column_names.length; i++){
    columns.push(new nlobjSearchColumn(column_names[i]))
  }
  return columns;
}

var ALL_ORDER_GUIDE_ITEMS_COLUMNS = createColumns([
  "custrecord_linked_guide_id", "custrecord_guide_item",
  "custrecord_guide_quantity", "custrecord_unit",
  "custrecord_description", "custrecord_history_date",
  "custrecord_history_rate"
])

var ALL_ORDER_GUIDES_COLUMNS = createColumns([
  "custrecord_linked_guide_name", "custrecord_guide_customers",
  "custrecord_guide_end", "custrecord_guide_start",
  "custrecord_guide_locations", "custrecord_subsidiaries",
  "custrecord_history_managed"
])

var GUIDE_ITEMS_RECORD = "customrecord_order_guide_items_dev"
var GUIDES_RECORD = "customrecord_guide_customers_dev"

function includes(array, item){
  var found = false;

  for(var i = 0; i < array.length; i++){
    if(found){
      break;
    }
    if(array[i] == item){
      found = true;
    }
  }
  return found;
}

function getResultsBeyond1000(filters, columns, record_type, search_name, results, master, do_not_push_id_column){
  if(results){
    filters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', results[999].id))
  }
  var next_results
  if(columns == null){
    next_results = nlapiSearchRecord(record_type, search_name, filters)
  }
  if(columns){
    if(!do_not_push_id_column){
      columns.push(new nlobjSearchColumn('internalid').setSort(false))
    }
    next_results = nlapiSearchRecord(record_type, null, filters, columns)
  }
  if(!next_results){
    return master
  }
  master = master.concat(next_results)
  if(next_results.length == 1000){
    return getResultsBeyond1000(filters, columns, record_type, search_name, next_results, master)
  }
  return master
}

function getUniqueValuesFromArray(array, properties){
  var res = []
  if(!array){
    return res
  }
  for(var i = 0; i < array.length; i++){
    if(properties.length == 0){
      if(!includes(res, array[i])){
        res.push(array[i])
      }
    }
    if(properties.length == 1){
      if(!includes(res, array[i][properties[0]])){
        res.push(array[i][properties[0]])
      }
    }
    if(properties.length == 2){
      if(!includes(res, array[i][properties[0]][properties[1]])){
        res.push(array[i][properties[0]][properties[1]])
      }
    }
    if(properties.length == 3){
      if(!includes(res, array[i][properties[0]][properties[1]][properties[2]])){
        res.push(array[i][properties[0]][properties[1]][properties[2]])
      }
    }
  }
  return res;
}

//callback function must return true or false
//ES6 Array.find(() =>)
function arrayFind(array, callback){
  for(var i = 0; i < array.length; i++){
    var item = array[i]
    if(callback(item) == true){
      return item
    }
  }
  return null
}

//array.IndexOf from ES6
//call back function must return true or false
//returns index i of for loop
function arrayIndexOf(array, callback){
  for(var i = 0; i < array.length; i++){
    var item = array[i]
    if(callback(item) == true){
      return i
    }
  }
  return null
}

//array.filter ES 6
//callback function returns true or false
//returns array of found items
function arrayFilter(array, callback){
  var res = []
  for(var i = 0; i < array.length; i++){
    var item = array[i]
    if(callback(item) == true){
      res.push(item)
    }
  }
  return res
}

function ensureArray(field){
  if(!field){
    return []
  }
  if(field.length){
    return field
  }
  if(!field.length){
    return [field]
  }
}

function getOrderGuides(filters){
  if(filters){
    filters.push(new nlobjSearchFilter("isinactive", null, "is", "F"))
  }
  if(!filters){
    filters = [new nlobjSearchFilter("isinactive", null, "is", "F")]
  }

  function getIDArray(search_results){
    var res = [];
    for(var i = 0; i < search_results.length; i++){
      res.push(search_results[i].internalid)
    }
    return res;
  }

  function destructureGuideItems(items){
    var res = [];
    for(var i = 0; i < items.length; i++){
      var it = items[i]
      var unit = it.columns.custrecord_unit
      var unit_name;
      var unit_id;
      if(unit){
        unit_name = it.columns.custrecord_unit.name
        unit_id = it.columns.custrecord_unit.internalid
      }
      res.push({
        item_id: it.columns.custrecord_guide_item.internalid,
        item_name: it.columns.custrecord_guide_item.name,
        id: it.id,
        quantity: it.columns.custrecord_guide_quantity,
        unit_id: unit_id,
        unit_name: unit_name,
        description: it.columns.custrecord_description,
        history_rate: it.columns.custrecord_history_rate,
        history_date: it.columns.custrecord_history_date
      })
    }
    return res
  }

  function assembleGuides(guide_records, guide_items){
    var guides = [];
    for(var i = 0; i < guide_records.length; i++){
      var guide = guide_records[i]

      var items = arrayFilter(guide_items,
        function(it){
          if(it.columns.custrecord_linked_guide_id.internalid == guide.id){
            return true
          }
        }
      )

      guides.push({
        name: guide.columns.custrecord_linked_guide_name,
        items: destructureGuideItems(items),
        subsidiaries: getIDArray(ensureArray(guide.columns.custrecord_subsidiaries)),
        locations: getIDArray(ensureArray(guide.columns.custrecord_guide_locations)),
        customers: getIDArray(ensureArray(guide.columns.custrecord_guide_customers)),
        start_date: guide.columns.custrecord_guide_start,
        end_date: guide.columns.custrecord_guide_end,
        id: guide.id
      })
    }

    return guides;
  }

  var all_guide_records = JSON.parse(
    JSON.stringify(
      nlapiSearchRecord(GUIDES_RECORD, null, filters, ALL_ORDER_GUIDES_COLUMNS)
  ))
  all_guide_records = ensureArray(all_guide_records)

  var all_guide_items = JSON.parse(
    JSON.stringify(
      nlapiSearchRecord(GUIDE_ITEMS_RECORD, null, null, ALL_ORDER_GUIDE_ITEMS_COLUMNS)
  ))
  all_guide_items = ensureArray(all_guide_items)

  return assembleGuides(all_guide_records, all_guide_items)
}

function getThisFolderId(file_name){

  var searchResult = nlapiSearchRecord('folder', null ,
    [new nlobjSearchFilter('name', 'file', 'is', file_name)],
    [new nlobjSearchColumn('internalid', 'file')]
  );

  if(searchResult){
     var folderId = searchResult[0].getId()
     return folderId
  }
  return null
}

function writeJSONToFile(json, file_location_ref, file_name){
  var folder_id = getThisFolderId(file_location_ref)

  var file = nlapiCreateFile(file_name, "PLAINTEXT", json)
  file.setFolder(folder_id)
  var file_id = nlapiSubmitFile(file)

  return file_id
}

function createGuide(guide){
  var guide_rec = nlapiCreateRecord(GUIDES_RECORD);
  setGuideRecord(guide_rec, guide)
  return nlapiSubmitRecord(guide_rec)
}

function createGuideItem(guide, item){
  var guide_item_rec = nlapiCreateRecord(GUIDE_ITEMS_RECORD)
  setGuideItemRecord(guide_item_rec, guide, item)
  return nlapiSubmitRecord(guide_item_rec)
}

function setGuideRecord(nl_guide_record, guide){
  nl_guide_record.setFieldValue("custrecord_linked_guide_name", guide.name)
  nl_guide_record.setFieldValue("custrecord_guide_customers", guide.customers)
  nl_guide_record.setFieldValue("custrecord_guide_end", guide.end_date)
  nl_guide_record.setFieldValue("custrecord_guide_start", guide.start_date)
  nl_guide_record.setFieldValue("custrecord_guide_locations", guide.locations)
  nl_guide_record.setFieldValue("custrecord_subsidiaries", guide.subsidiaries)
  if(guide.history_managed){
    nl_guide_record.setFieldValue("custrecord_history_managed", "T")
  }
}

function setGuideItemRecord(nl_guide_item, guide, item){
  nl_guide_item.setFieldValue("custrecord_linked_guide_id", guide.id)
  nl_guide_item.setFieldValue("custrecord_guide_item", item.item_id)
  nl_guide_item.setFieldValue("custrecord_guide_quantity", item.quantity)
  if(item.unit_id){
    nl_guide_item.setFieldValue("custrecord_unit", item.unit_id)
  }
  if(item.description){
    nl_guide_item.setFieldValue("custrecord_description", item.description)
  }
  if(item.history_rate){
    nl_guide_item.setFieldValue("custrecord_history_rate", item.history_rate)
  }
  if(item.history_date){
    nl_guide_item.setFieldValue("custrecord_history_date", item.history_date)
  }
}

function getModuleSettings(){
  var module_settings = nlapiSearchRecord("customrecord_og_module_settings",
    null, null,
    createColumns(
      [
        "custrecord_rebates_module", "custrecord_advanced_pricing_module",
        "custrecord_ad_per_lb_rate", "custrecord_use_altname_customer",
        "custrecord_disable_field_change_toggle",
        "custrecord_og_customer_name_field", "custrecord_og_customer_number_field",
        "custrecord_og_item_name_field", "custrecord_og_item_number_field",
        "custrecord_og_use_locations", "custrecord_og_use_subsidiaries"
      ]
    )
  )
  module_settings = JSON.parse(JSON.stringify(module_settings))
  if(module_settings){
    module_settings = module_settings[0]
  }
  return module_settings
}
