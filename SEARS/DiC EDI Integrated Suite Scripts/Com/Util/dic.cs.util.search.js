define(['../dic.cs.config',
        '../../Com/Util/dic.cs.util.object',
        '../../Hub/dic.cs.hub.config.vi',
        'N/search'], 
		SearchCutom);

function SearchCutom(
			dicConfig,
			dicObj,
			dicConfigVI,
			serverSearch
		 ){
	var _mod =  {};
	
	_mod.searchCutomRecord = function(id){
		try
		{
			var filterColumns = dicObj.extractPropertyId({object: dicConfigVI.CustomFields});
	    	var customSearch = serverSearch.create({
	            type: dicConfigVI.CustomRecordId,
	            title: 'Search custom record list',
	            columns: filterColumns,
	            filters: [
	                      [dicConfigVI.CustomItemVendor.ItemId, 'is', id]
	                ]
	            });
	    		var rsVenItem =  customSearch.run().getRange({
	    			 start: 0, 
	    			    end: 1000
	    		});
	    		return rsVenItem;
		}
		catch(e)
		{
			log.emergency(e);
			return null;
		}
		
	};
	
    return {
    	searchCutomRecord: _mod.searchCutomRecord
    };
    
}