<a class="header-menu-myaccount-anchor" href="#" data-action="push-menu" name="myaccount">
	{{translate 'My Account'}}
	<i class="header-menu-myaccount-menu-push-icon"></i>
</a>
<ul class="header-menu-myaccount">
	<li>
			<a href="#" class="header-menu-myaccount-back" data-action="pop-menu" name="back">
				<i class="header-menu-myaccount-pop-icon "></i>
				{{translate 'Back'}}
			</a>
	</li>
	<li class="header-menu-myaccount-overview">
		<a class="header-menu-myaccount-overview-anchor" href="#" data-touchpoint="customercenter" data-hashtag="#overview" name="accountoverview">
			{{translate 'Account Overview'}}
		</a>
		<a class="header-menu-myaccount-signout-link" href="#" data-touchpoint="logout" name="signout">
			<i class="header-menu-myaccount-signout-icon"></i>
			{{translate 'Sign Out'}}
		</a>
	</li>
	{{#each entries}}
	<li class="header-menu-myaccount-item-level2" {{#if permission}}data-permissions="{{permission}}"{{/if}} {{#if permissionOperator}}data-permissions-operator="{{permissionOperator}}"{{/if}}>
		{{#if url}}
	  <a  class="header-menu-myaccount-anchor-level2" tabindex="-1" href="#" {{#if children.length}}data-action="push-menu"{{/if}} data-touchpoint="customercenter" data-hashtag="#{{url}}" name="{{name}}">
	    {{translate name}}
	  	{{#if children.length}}<i class="header-menu-myaccount-menu-push-icon"></i>{{/if}}
	  </a>
	  {{else}}
	  <span  class="header-menu-myaccount-span-level2" tabindex="-1" {{#if children.length}}data-action="push-menu"{{/if}} name="{{name}}">
	    {{translate name}}
	    {{#if children.length}}<i class="header-menu-myaccount-menu-push-icon"></i>{{/if}}
	  </span>
		{{/if}}
	  {{#if children.length}}
	  <ul class="header-menu-myaccount-level3">
	    <li>
	      <a href="#" class="header-menu-myaccount-back" data-action="pop-menu" name="back-level3">
	          <i class="header-menu-myaccount-pop-icon "></i>
	          {{translate 'Back'}}
	      </a>
	    </li>
	    {{#each children}}
	    <li {{#if permission}}data-permissions="{{permission}}"{{/if}} {{#if permissionOperator}}data-permissions-operator="{{permissionOperator}}"{{/if}}>
	      <a class="header-menu-myaccount-anchor-level3" tabindex="-1" href="#" data-touchpoint="customercenter" data-hashtag="#{{url}}" name="{{name}}">{{translate name}}</a>
	    </li>
	    {{/each}}
	  </ul>
	  {{/if}}
	</li>
	{{/each}}
</ul>
