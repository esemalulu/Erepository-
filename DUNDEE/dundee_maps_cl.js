/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(
	['SuiteScripts/underscore.js',
  'SuiteScripts/moment.js'],
function(_, moment) {

	var salesrepid = null, stageid = null, actionid = null, createdafter = null, marketsegment = null

	function Pin(owner, obj) {
    this.latitude = ko.observable(obj.location.lat)
    this.longitude = ko.observable(obj.location.lng)
    this.title = ko.observable(obj.name)
    this.animation = ko.observable(null)
    this.clickable = ko.observable(true)
    this.cursor = ko.observable(null)
		// calculate the icon
		var iconurl = (function(initials, color) {
			var url = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld='
			if (initials) url += initials+'|'
			url += color+'|000000'
			return url
		})(obj.salesrep.initials, obj.status.color)
		this.icon = ko.observable(iconurl)
    this.raiseOnDrag = ko.observable(true)
    this.shadow = ko.observable(null)
    this.draggable = ko.observable(false)
    this.flat = ko.observable(true)
    this.visible = ko.observable(true)
		this.address = ko.observable(obj.address.replace(/\n/ig, '<br/>'))
		this.url = ko.observable(obj.url)
		this.phone = ko.observable(obj.phone)
		this.salesrepid = ko.observable(obj.salesrep.id)
		this.salesrep = ko.observable(obj.salesrep.name)
		this.statusid = ko.observable(obj.status.id)
		this.status = ko.observable(obj.status.name)
		this.actionid = ko.observable(obj.action.id)
		this.action = ko.observable(obj.action.name)
		this.date = ko.observable(new moment(obj.created, 'M/D/YYYY').toDate())
		this.customerid = ko.observable(obj.id)
		this.marketsegmentid = ko.observable(obj.marketsegment)

    this.position = ko.computed({
      read: function () {
        return new google.maps.LatLng(this.latitude(), this.longitude())
      },
      write: function (value) {
        this.latitude(value.lat())
        this.longitude(value.lng())
      },
      owner: this
    });
		this.hintVisible = ko.observable(false)
		if (typeof DD_DEFAULT_VISIBLE != "undefined")
			if (DD_DEFAULT_VISIBLE && DD_DEFAULT_VISIBLE == obj.id)
				this.hintVisible = ko.observable(true)
    this.click = function () {
      owner.selectedPin(this)
    }
		return this
	}

	var legend = function(obj) {
		this.name = ko.observable(obj.name)
		this.id = ko.observable(obj.id)
		this.amount = ko.observable(obj.amount || 0)
		this.url = ko.computed(function() {
			return 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=|'+obj.color+'|000000'
		})
		return this
	}

	var pageInit = function(context) {

		// clean up the map table
		jQuery("#tr_fg_map > td")[1].remove()
		jQuery("#tr_fg_map > td")[1].remove()
		window.onbeforeunload = function() {}

		function MapsModel() {
			if (typeof DD_CENTER == "undefined") {
				this.center = ko.observable(new google.maps.LatLng(43.4797138, -79.6763991))
				this.zoom = ko.observable(11)
			} else {
				this.center = ko.observable(new google.maps.LatLng(DD_CENTER.lat, DD_CENTER.lng))
				this.zoom = ko.observable(15)
			}
			this.panCenter = ko.observable(true)
			this.mapTypeId = ko.observable(google.maps.MapTypeId.ROADMAP)
			this.bounds = ko.observable()
			this.panBounds = ko.observable(true)
			this.pins = ko.observableArray([])
			this.selectedPin = ko.observable(null)
			CUSTOMERDATA.map(function(customer, index) {
				this.pins.push(new Pin(this, customer))
			}.bind(this))
			this.selectedPin.subscribe(function () {
				if (this.oldSelectedPin)
          this.oldSelectedPin.hintVisible(false)
        var selectedPin = this.selectedPin()
        if (selectedPin) {
          this.center(selectedPin.position())
          selectedPin.hintVisible(true)
        }
        this.oldSelectedPin = selectedPin
    	}.bind(this));
			this.statuslist = ko.observableArray(STATUS_LIST.map(function(status) {
				return new legend(status)
			}))
			this.applyStatusNumbers = function() {
				var BYSTATUS = {}
				ko.utils.arrayForEach(this.pins(), function(pin) {
					if (pin.visible()) {
						if (!BYSTATUS[pin.statusid()]) BYSTATUS[pin.statusid()] = 0
						BYSTATUS[pin.statusid()] += 1
					}
				})
				ko.utils.arrayForEach(this.statuslist(), function(status) {
					if (BYSTATUS[status.id()])
						status.amount(BYSTATUS[status.id()])
					else status.amount(0)
				})
			}
			this.applyFilters = function() {
				ko.utils.arrayForEach(this.pins(), function(pin) {
					var visible = true
					if (visible && salesrepid) visible = (salesrepid == pin.salesrepid())
					if (visible && stageid) visible = (stageid == pin.statusid())
					if (visible && actionid) visible = (actionid == pin.actionid())
					if (visible && marketsegment) visible = (marketsegment == pin.marketsegmentid())
					if (visible && createdafter) visible = (pin.date() > createdafter)
					pin.visible(visible)
				})
				this.applyStatusNumbers()
			}
			this.applyStatusNumbers()
		}
		window.document.MapModel = new MapsModel()
		ko.applyBindings(window.document.MapModel)

	}

	var fieldChanged = function(context) {
		if (context.fieldId == 'custpage_salesrep') {
      salesrepid = context.currentRecord.getValue({ fieldId: 'custpage_salesrep' })
			if (salesrepid == 'all') salesrepid = null
    }
		if (context.fieldId == 'custpage_bystage') {
      stageid = context.currentRecord.getValue({ fieldId: 'custpage_bystage' })
			if (stageid == 'all') stageid = null
    }
		if (context.fieldId == 'custpage_byaction') {
      actionid = context.currentRecord.getValue({ fieldId: 'custpage_byaction' })
			if (actionid == 'all') actionid = null
    }
		if (context.fieldId == 'custpage_createdafter') {
      createdafter = context.currentRecord.getValue({ fieldId: 'custpage_createdafter' })
			if (!createdafter) createdafter = null
    }
		if (context.fieldId == 'custpage_mktgseg') {
      marketsegment = context.currentRecord.getValue({ fieldId: 'custpage_mktgseg' })
			if (marketsegment == 'all') marketsegment = null
    }
		if (context.fieldId == 'custpage_team') {
			if (context.currentRecord.getValue({ fieldId: 'custpage_team' }) == 'all')
				window.location.href = DD_BASEURL
			else
				window.location.href = DD_BASEURL+'&team='+context.currentRecord.getValue({ fieldId: 'custpage_team' })
			return
		}
		window.document.MapModel.applyFilters()
	}

	return {
		pageInit: pageInit, fieldChanged: fieldChanged
	}

})
