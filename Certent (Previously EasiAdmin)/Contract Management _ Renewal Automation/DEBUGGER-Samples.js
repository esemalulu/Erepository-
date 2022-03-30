var itemGroupIds = ['1064','1066'];
var itemGroupJson = {
	'1064':{
		'970':'keep',
		'977':'keep'
	},
	'1066':{
		'969':'keep'
	}
};
var exitcnt = 0;
var renewalOpp = nlapiCreateRecord('opportunity',{recordmode:'dynamic',customform:'120'});

for (var ig=0; ig < itemGroupIds.length; ig+=1)
{
	renewalOpp.selectNewLineItem('item');
	renewalOpp.setCurrentLineItemValue('item', 'item', itemGroupIds[ig]);
	renewalOpp.commitLineItem('item', false);
							
	var igiLine = renewalOpp.findLineItemValue('item', 'item', itemGroupIds[ig]);
	var l = igiLine;
	while (renewalOpp.getLineItemValue('item','itemtype',l) != 'EndGroup')
	{
		//If line item IS item group, skip it
		if (itemGroupIds[ig] != renewalOpp.getLineItemValue('item','item',l))
		{
			if (!itemGroupJson[itemGroupIds[ig]][renewalOpp.getLineItemValue('item','item',l)])
			{
				alert('item Group '+itemGroupIds[ig]+' //Remove '+renewalOpp.getLineItemValue('item','item',l));
				
				renewalOpp.removeLineItem('item', l, false);
				l = igiLine;
			}
			else
			{
				alert('item Group '+itemGroupIds[ig]+' // Keep and Update '+renewalOpp.getLineItemValue('item','item',l));
			}
		}
		
		l += 1;
		
		//Safe exit
		exitcnt +=1;
		if (exitcnt == 10)
		{
			break;
		}
	}
}

alert(renewalOpp.getLineItemCount('item'));


/******************************************/
var opp = nlapiLoadRecord('opportunity','70246');

var itemGroupId = '',
	itemGroupQty = '';
//Loop through each line
for (var b=1; b <= opp.getLineItemCount('item'); b+=1)
{
	//Assumed that it Things are always in order. Group comes first then EndGroup
	//When Group is encountered, you set itemGroupId and itemGroupQty
	//When EndGroup is encountered, you set itemGroupId and itemGroupQty to NULL - Resetting for next
	if (opp.getLineItemValue('item', 'itemtype',b) == 'Group' ||
		opp.getLineItemValue('item', 'itemtype',b) == 'EndGroup')
	{
		//Set both itemGroupId and itemGroupQty for Group
		if (opp.getLineItemValue('item', 'itemtype',b) == 'Group')
		{
			itemGroupId = opp.getLineItemValue('item', 'item',b);
			itemGroupQty = opp.getLineItemValue('item', 'quantity',b);
			//alert('Line '+b+' '+itemGroupId+' // '+itemGroupQty+' // GROUP');
			continue;
		}
		
		//Null out both itemGroupId and itemGroupQty for Group
		if (opp.getLineItemValue('item', 'itemtype',b) == 'EndGroup')
		{
			itemGroupId = '';
			itemGroupQty = '';
			//alert('Line '+b+' '+itemGroupId+' // '+itemGroupQty+' // End GROUP');
			continue;
		}
	}
	
	//HERE IS Where you SKIP NONE Contract Module Eligible Items
	/**
	 * Assume we already did this here
	 * continue;
	 */
	
	//From this point on, we can simply associate each line with itemGroupId and itemGroupQty Values
	alert(
		'Line '+b+' '+
		opp.getLineItemText('item','item',b)+
		' // Item Group/Qty = '+itemGroupId+' / '+itemGroupQty
	);
}