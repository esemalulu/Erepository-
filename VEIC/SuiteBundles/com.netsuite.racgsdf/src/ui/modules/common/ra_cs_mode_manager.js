/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.App.ModeManager', {
	singleton: true,
	mode: RA.App.Constant.MODE_GRID,
	getActive: function () {
		if (!this.active)
			this.active = RA.App.Grid;
		return this.active;
	},
	getInactive: function () {
		return this.inactive;
	},
	setMode: function (mode) {
		this.mode = mode;
		/*
		 * deferred instantiation of chart
		 */
		if (!RA.App.Chart) {
			RA.App.Chart = Ext4.create('RA.Cmp.Scheduler');
			/*
			 * For automation
			 */
			Ext4.ns("PSA.RA.App");
			PSA.RA.App = RA.App.Chart;
			RA.App.Chart.expandViaSetting();
		}
		/*
		 * set active and inactive mode pointers
		 */
		switch (this.mode) {
			case RA.App.Constant.MODE_GRID:
				this.active = RA.App.Grid;
				this.inactive = RA.App.Chart;
				break;
			case RA.App.Constant.MODE_CHART:
				this.inactive = RA.App.Grid;
				this.active = RA.App.Chart;
				break;
		}
		/*
		 * toggle modes
		 */
		this.switchModes();
		return true;
	},
	switchModes: function () {
		var active = this.getActive();
		var inactive = this.getInactive();
		/*
		 * remember inactive dimensions
		 */
		var inactiveBox = {
			width: inactive.getWidth(),
			height: inactive.getHeight()
		};
		/*
		 * toggle visibility
		 */
		inactive.hide();
		active.show();
		/*
		 * switch info icon text
		 */
		switch (active) {
			case RA.App.Grid:
				Ext4.getCmp('ra-icon-info').setTooltip(translatedStrings.getText('TOOLTIP.ICON_INFO_GRID'));
				break;
			case RA.App.Chart:
				Ext4.getCmp('ra-icon-info').setTooltip(translatedStrings.getText('TOOLTIP.ICON_INFO'));
				break;
		}
		/*
		 * check if there are changes in view preset, start date, end date.
		 * adjust accordingly. also trigger setViewPreset if store is dirty and
		 * active mode is Grid.
		 */
		if (!this.isSamePreset() || !this.isSameStartDate() || !this.isSameEndDate() || (RA.App.Stores.chartEvent.areThereChanges() && active == RA.App.Grid)) {
			// if new resource is added in chartResource, it needs to sync with
			// the gridStore
			if (RA.App.Stores.chartResource.getRootNode().childNodes.length != RA.App.Stores.gridStore.getRootNode().childNodes.length) {
				RA.App.Grid.store.transformChartData();
			} else {
				active.switchViewPreset(inactive.getViewPreset(), inactive.getStartDate());
			}
		}
		/*
		 * check if there are changes in dimensions. adjust accordingly.
		 */
		if (!this.isSameDimensions(inactiveBox))
			this.getActive().autofit();

		/*
		 * apply grid's resource sorting
		 */
		var gridSortState = RA.App.Grid.getView().getGridColumns()[1].sortState;
		if (gridSortState)
			RA.App.Chart.getView().getGridColumns()[0].doSort(gridSortState);

		// sync text in search resource component
		active.setSearchBoxText(inactive.getSearchBoxText());

		this.getActive().unmask();
	},
	/*
	 * checks if active & inactive modes have same view preset
	 */
	isSamePreset: function () {
		return this.getActive().getViewPreset() == this.getInactive().getViewPreset();
	},
	isSameStartDate: function () {
		var dtCompareFormat = 'Y/m/d';
		return Ext4.Date.format(this.getActive().getStartDate(), dtCompareFormat) == Ext4.Date.format(this.getInactive().getStartDate(), dtCompareFormat);
	},
	isSameEndDate: function () {
		var dtCompareFormat = 'Y/m/d';
		return Ext4.Date.format(this.getActive().getEndDate(), dtCompareFormat) == Ext4.Date.format(this.getInactive().getEndDate(), dtCompareFormat);
	},
	isSameDimensions: function (inactiveBox) {
		return this.getActive().getWidth() == inactiveBox.width && this.getActive().getHeight() == inactiveBox.height;
	}
});