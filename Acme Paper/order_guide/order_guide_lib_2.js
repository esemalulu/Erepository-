/**
*@NApiVersion 2.1
*@NModuleScope Public
*/

define([
  'N/record',
  'N/search',
  'N/log'
],
(record, search, log) => {

  const isNotNothing = value => {
    if(JSON.stringify(value) === "null"){
      return false
    }
    if(JSON.stringify(value) === "undefined"){
      return false
    }
    if(value === ""){
      return false
    }
    if(value === null){
      return false
    }
    if(value === undefined){
      return false
    }
    if(value === NaN){
      return false
    }
    return true
  }

  const getSearchResults = (type, filters, columns) => {
    let response = []
    const pages = search.create({type, filters, columns})
      .runPaged({pageSize: 1000})
    pages.pageRanges.forEach((page) => {
      const results = pages.fetch({index: page.index})
      results.data.forEach((res) => response.push(JSON.parse(JSON.stringify(res))))
    })
    return response
  }

  const basic_filters = [
    ["isinactive", "is", "F"]
  ]
  const id_filters = [
    ["internalidnumber", "greaterthan", 0]
  ]
  const basic_and_id_filters = [
    basic_filters[0],
    "AND",
    id_filters[0]
  ]

  function includes(array, item){
    var found = false

    for(var i = 0; i < array.length; i++){
      if(found){
        break
      }
      if(array[i] == item){
        found = true
      }
    }
    return found
  }

  function getUniqueValuesFromArray(array, properties){
    var res = []
    if(!array){
      return res
    }
    for(var i = 0; i < array.length; i++){
      if(properties.length == 0){
        if(!array[i]){
          continue
        }
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
      if(properties.length == 4){
        if(!includes(res, array[i][properties[0]][properties[1]][properties[2]][properties[3]])){
          res.push(array[i][properties[0]][properties[1]][properties[2]][properties[3]])
        }
      }
    }
    return res;
  }

  function get4000(results){
    var res = []
    var i = 0;

    results.each(function(result){
      if(i < 3999){
        res.push(JSON.parse(JSON.stringify(result)))
        i++
        return true
      }
      return false
    })
    return res
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

  function ensureArray(field){
    if(!field){
      return []
    }
    if(field.length){
      return field
    }
    if(!field.length){
      if(field.value){
        var split_test = field.value.split(",")
        if(split_test.length){
          var arr = []
          for(var j = 0; j < split_test.length; j++){
            arr.push({value: split_test[j]})
          }
          return arr
        }
      }
      return []
    }
  }

  function createColumns(column_names){
    var columns = []
    for(var i = 0; i < column_names.length; i++){
      columns.push(search.createColumn({name: column_names[i]}))
    }
    return columns
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

  function getOrderGuides(filters){
    if(filters){
      filters.push("AND")
      filters.push(
        ["isinactive", "is", "F"]
      )
    }
    if(!filters || filters.length === 0){
      filters = [
        ["isinactive", "is", "F"]
      ]
    }
    function getIDArray(search_results){
      var res = []
      for(var i = 0; i < search_results.length; i++){
        res.push(search_results[i].value)
      }
      return res
    }

    function destructureGuideItems(items){
      var res = []
      for(var i = 0; i < items.length; i++){
        var it = items[i]
        var unit = it.values.custrecord_unit[0]
        var unit_name
        var unit_id
        if(unit){
          unit_name = unit.text
          unit_id = unit.value
        }
        if(!it.values.custrecord_guide_item){
          continue
        }
        if(!it.values.custrecord_guide_item[0]){
          continue
        }
        res.push({
          item_id: it.values.custrecord_guide_item[0].value,
          item_name: it.values.custrecord_guide_item[0].text,
          id: it.id,
          quantity: it.values.custrecord_guide_quantity,
          unit_id: unit_id,
          unit_name: unit_name,
          description: it.values.custrecord_description,
          history_rate: it.values.custrecord_history_rate,
          history_date: it.values.custrecord_history_date
        })
      }
      return res
    }

    function assembleGuides(guide_records, guide_items){
      var guides = []
      for(var i = 0; i < guide_records.length; i++){
        var guide = guide_records[i]

        var items = guide_items
          .filter((it) => it.values.custrecord_linked_guide_id[0].value == guide.id)

        guides.push({
          name: guide.values.custrecord_linked_guide_name,
          items: destructureGuideItems(items),
          subsidiaries: getIDArray(ensureArray(guide.values.custrecord_subsidiaries)),
          locations: getIDArray(ensureArray(guide.values.custrecord_guide_locations)),
          customers: getIDArray(ensureArray(guide.values.custrecord_guide_customers)),
          start_date: guide.values.custrecord_guide_start,
          end_date: guide.values.custrecord_guide_end,
          id: guide.id,
          history_managed: guide.values.custrecord_history_managed
        })
      }

      return guides
    }
    const all_guide_records = getSearchResults(GUIDES_RECORD, filters, ALL_ORDER_GUIDES_COLUMNS)
    const item_filters = [
      ["custrecord_linked_guide_id", "anyof"].concat(all_guide_records.map((rec) => rec.id))
    ]
    const all_guide_items = all_guide_records.length > 0 ?
      getSearchResults(GUIDE_ITEMS_RECORD, item_filters, ALL_ORDER_GUIDE_ITEMS_COLUMNS)
      : []
    return assembleGuides(all_guide_records, all_guide_items)
  }

  function getModuleSettings(){
    var module_settings = get4000(
      search.create({
        type: "customrecord_og_module_settings",
        filters: null,
        columns: createColumns(
          [
            "custrecord_rebates_module", "custrecord_advanced_pricing_module",
            "custrecord_ad_per_lb_rate", "custrecord_use_altname_customer",
            "custrecord_disable_field_change_toggle",
            "custrecord_og_customer_name_field", "custrecord_og_customer_number_field",
            "custrecord_og_item_name_field", "custrecord_og_item_number_field",
            "custrecord_og_use_locations", "custrecord_og_use_subsidiaries",
            "custrecord_run_duplicate_item_check", "custrecord_og_items_default_sorting",
            "custrecord_og_item_cost_field", "custrecord_load_most_recent_invoices",
            "custrecord_load_most_recent_receipts"
          ]
        )
      }).run()
    )
    if(module_settings){
      return module_settings[0]
    }
    return null
  }

  function getUserCustomColumn(user_id){
    if(!user_id){
      return null
    }
    var columns = get4000(
      search.create({
        type: "customrecord_og_custom_columns",
        filters: [["name", "is", user_id]],
        columns: createColumns(["name", "custrecord_og_columns"])
      }).run()
    )
    if(columns){
      return columns[0]
    }
    return null
  }

  function addSubLocFilter(filters, location, subsidiary){
    if(!location && !subsidiary){
      return filters
    }
    var copy = JSON.parse(JSON.stringify(filters))
    if(location){
      copy.push("AND")
      copy.push(["location", "anyof", location])
    }
    if(subsidiary){
      copy.push("AND")
      copy.push(["subsidiary", "anyof", subsidiary])
    }
    return copy
  }

  function getItemRecords(filters, module_settings, subsidiary){
    const column_names = [
      "name", "internalid", "baseprice", "unitstype", "cost",
      "saleunit", "itemid", "displayname", "averagecost",
      "lastpurchaseprice", "upccode", "class", "weight",
      "description", "custitem_acc_commodity_code", "isinactive"
    ]
    if(module_settings.values.custrecord_og_item_cost_field){
      column_names.push(module_settings.values.custrecord_og_item_cost_field)
    }
    let items_columns = createColumns(column_names)
    items_columns.push(
      search.createColumn({
        name: "internalid",
        sort: search.Sort.ASC
      })
    )
    const item_filters = addSubLocFilter(basic_filters, null, subsidiary).concat(["AND"]).concat(filters)
    return getSearchResults("item", item_filters, items_columns)
  }

  const getPriceLevels = (item_ids, price_levels) => {
    if(!item_ids || !item_ids.length){
      return []
    }
    if(!price_levels || !price_levels.length){
      return []
    }
    const price_level_filters = [
      ["pricelevel", "anyof"].concat(price_levels),
      "AND",
      ["iteminternalid", "anyof"].concat(item_ids)
    ]
    log.error("pl filters", price_level_filters)
    const prices = getSearchResults("pricing", price_level_filters, createColumns(["saleunit", "unitprice", "pricelevel"]))
    return prices.filter((pric, index) => {
      const json = JSON.stringify(pric)
      return index === prices.findIndex((p) => JSON.stringify(p) === json)
    })
  }

  const getMostRecentItemReceipts = item_ids => {
    const filters = [
      ["transaction.type", "anyof", "ItemRcpt"],
      "AND",
      ["internalid", "anyof"].concat(item_ids)
    ]
    return get4000(
      search.create({
        type: "item", filters,
        columns: [
          search.createColumn({
            name: "itemid",
            summary: "GROUP",
            sort: search.Sort.ASC,
          }),
          search.createColumn({
            name: "trandate",
            join: "transaction",
            summary: "MAX",
          })
        ]
      }).run()
    )
  }

  const sortOrderGuideItems = (guides, items, module_settings) => {

    const ogSettingsGetField = (settings, field_name, record, type) => {
      if(!record){
        return ""
      }
      const field = settings.values[field_name]
      if(!field){
        if(type == "number"){
          return record.id
        }
        if(type == "name"){
          return record.values.name
        }
      }
      if(type == "number" && field == "id"){
        return record.id
      }
      return record.values[field]
    }

    if(!guides || !module_settings){
      return []
    }
    if(guides.length === 0){
      return []
    }
    if(module_settings.values.custrecord_og_items_default_sorting.length === 0){
      return guides
    }
    const method = module_settings.values.custrecord_og_items_default_sorting[0].text
    if(!method){
      return guides
    }
    if(method === "Numerically"){
      if(!module_settings.values.custrecord_og_item_number_field){
        return guides
      }
      const number_field = module_settings.values.custrecord_og_item_number_field
      const getNumField = glob_item => Number(ogSettingsGetField(module_settings, "custrecord_og_item_number_field", glob_item, "number"))
      let copy = JSON.parse(JSON.stringify(guides))
      for(let guide of copy){
        guide.items = guide.items.sort((a, b) => {
          const a_global = items.find((it) => it.id == a.item_id)
          const b_global = items.find((it) => it.id == b.item_id)
          return getNumField(a_global) - getNumField(b_global)
        })
      }
      return copy
    }
    return guides
  }

  function getCustomerAddresses(customer_ids){
    return get4000(
      search.create({
        type: "customer",
        filters: [
          ["internalid", "anyof"].concat(customer_ids),
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          search.createColumn({name: "custrecord175", join: "Address"}),
          search.createColumn({name: "address", join: "Address"}),
          search.createColumn({name: "address1", join: "Address"}),
          search.createColumn({name: "address2", join: "Address"}),
          search.createColumn({name: "address3", join: "Address"}),
          search.createColumn({name: "zipcode", join: "Address"}),
          search.createColumn({name: "addressee", join: "Address"}),
          search.createColumn({name: "addressphone", join: "Address"}),
          search.createColumn({name: "city", join: "Address"}),
          search.createColumn({name: "country", join: "Address"}),
          search.createColumn({name: "state", join: "Address"}),
          search.createColumn({name: "addressinternalid", join: "Address"}),
          search.createColumn({name: "addresslabel", join: "Address"}),
          search.createColumn({name: "attention", join: "Address"}),
          search.createColumn({name: "isdefaultshipping", join: "Address"})
        ]
      }).run()
    )
  }


  return {
    GUIDE_ITEMS_RECORD,
    GUIDES_RECORD,
    ALL_ORDER_GUIDE_ITEMS_COLUMNS,
    ALL_ORDER_GUIDES_COLUMNS,
    getOrderGuides,
    createColumns,
    get4000,
    getModuleSettings,
    getUniqueValuesFromArray,
    arrayFind,
    includes,
    getUserCustomColumn,
    getItemRecords,
    basic_filters,
    id_filters,
    basic_and_id_filters,
    getPriceLevels,
    getMostRecentItemReceipts,
    sortOrderGuideItems,
    getCustomerAddresses,
    getSearchResults,
    isNotNothing
  }
});
