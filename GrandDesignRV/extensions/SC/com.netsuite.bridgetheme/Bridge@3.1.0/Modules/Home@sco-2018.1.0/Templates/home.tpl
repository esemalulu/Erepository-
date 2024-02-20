{{!
	© 2017 NetSuite Inc.
	User may not copy, modify, distribute, or re-bundle or otherwise make available this code;
	provided, however, if you are an authorized user with a NetSuite account or log-in, you
	may use this code subject to the terms that govern your access and use.
}}

{{! Edited for Bridge Theme }}

<!-- CAROUSEL -->
{{#if extraHomeViewContext.isReady}}
    {{#if extraHomeViewContext.showCarousel}}
    <div class="home-fluid">
        <div class="home-slider-container">
            <div class="home-image-slider">
                <ul data-slider id="home-image-slider-list" class="home-image-slider-list">
                    {{#each extraHomeViewContext.carousel}}
                        <li class="{{#if text}}caption-on{{/if}} {{#if title}}caption-on{{/if}} {{#if linktext}}caption-on{{/if}}">
                            <div class="
														home-slide-main-container home-slide-{{@index}}
													  {{#if imageBehaviour}}
															use-image
														{{else}}
															{{#if backgroundCrop}}
																	{{backgroundCrop}}
															{{/if}}
														{{/if}}
														{{#if isAbsoluteUrl}}
																use-image
														{{/if}}
														"
                                {{#if isAbsoluteUrl}}
                                    style="background-image: url({{image}})"
                                {{else}}
                                    style="background-image: url({{getThemeAssetsPathWithDefault image 'img/bridge-carousel-home-1.jpg'}})"
                                {{/if}}>
																<a{{objectToAtrributes item}} class="home-slide-wrap-link">
	                                <img src="
	                                    {{#if isAbsoluteUrl}}
	                                        {{image}}
	                                    {{else}}
	                                        {{getThemeAssetsPathWithDefault image 'img/bridge-carousel-home-1.jpg'}}
	                                    {{/if}}"
	                                    class="home-slide-image {{#if imageMobile}}hide-small{{/if}}" />
																	{{#if imageMobile}}
																		<img src="{{imageMobile}}" class="home-slide-image-mobile" />
																	{{/if}}
																</a>
                                <div class="home-slide-caption {{#if captionSide}}{{captionSide}}{{/if}} {{#if text}}caption-display{{/if}} {{#if title}}caption-display{{/if}} {{#if linktext}}caption-display{{/if}} {{#if isAbsoluteUrl}}carousel-center-box{{/if}}">
                                    <div class="home-slide-caption-content {{captionTextAlign}}">

                                        {{#if title}}<h2 class="home-slide-caption-title" style="color:{{captionColor}}">{{title}}</h2>{{/if}}
                                        {{#if text}}<p style="color:{{captionColor}}">{{{text}}}</p>{{/if}}

																				{{#if linktext}}
	                                        <div class="home-slide-caption-button-container">
	                                            <a{{objectToAtrributes item}} class="home-slide-caption-button">{{#if linktext}}{{linktext}}{{else}}{{translate 'Shop now'}}{{/if}} <i class="home-slide-button-icon"></i></a>
	                                        </div>
																				{{/if}}
                                    </div>
                                </div>
                            </div>
                        </li>
                    {{/each}}
                </ul>
            </div>
        </div>
    </div>
    {{else}}
    <div class="home-fluid">
        <div class="home-slider-container">
            <div class="home-image-slider">
                <ul data-slider class="home-image-slider-list">
                    {{#each carouselImages}}
                        <li>
                            <div class="home-slide-main-container" style="background-image: url({{this}});">
                                <img src="{{this}}" class="home-slide-image" style="display: none;" />
                                <div class="home-slide-caption">
                                    <div class="home-slide-caption-content">
                                        <h2 class="home-slide-caption-title">Sample Headline</h2>
                                        <p>Example descriptive text displayed on multiple lines.</p>
                                        <div class="home-slide-caption-button-container">
                                            <a href="#" class="home-slide-caption-button">Shop Now<i class="home-slide-button-icon"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    {{else}}
                        <li>
                            <div class="home-slide-main-container" style="background-image: url({{getThemeAssetsPath 'img/bridge-carousel-home-1.jpg'}})">
                                <img src="{{getThemeAssetsPathWithDefault 'img/bridge-carousel-home-1.jpg'}}" class="home-slide-image" style="display: none;" />
                                <div class="home-slide-caption">
                                    <div class="home-slide-caption-content">
                                        <h2 class="home-slide-caption-title">New Tablets</h2>
                                        <p></p>
                                        <div class="home-slide-caption-button-container">
                                            <a href="#" class="home-slide-caption-button">Shop Now<i class="home-slide-button-icon"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                        <li>
                            <div class="home-slide-main-container" style="background-image: url({{getThemeAssetsPath 'img/bridge-carousel-home-2.jpg'}})">
                                <img src="{{getThemeAssetsPathWithDefault 'img/bridge-carousel-home-2.jpg'}}" class="home-slide-image" style="display: none;" />
                                <div class="home-slide-caption">
                                    <div class="home-slide-caption-content">
                                        <h2 class="home-slide-caption-title">Learn</h2>
                                        <p>Basics of Audio Setup</p>
                                        <div class="home-slide-caption-button-container">
                                            <a href="#" class="home-slide-caption-button">Find out how<i class="home-slide-button-icon"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                        <li>
                            <div class="home-slide-main-container" style="background-image: url({{getThemeAssetsPath 'img/bridge-carousel-home-3.jpg'}})">
                                <img src="{{getThemeAssetsPathWithDefault 'img/bridge-carousel-home-3.jpg'}}" class="home-slide-image" style="display: none;" />
                                <div class="home-slide-caption">
                                    <div class="home-slide-caption-content">
                                        <h2 class="home-slide-caption-title">Support</h2>
                                        <p>Setup without the upset</p>
                                        <div class="home-slide-caption-button-container">
                                            <a href="#" class="home-slide-caption-button">Setup without the upset<i class="home-slide-button-icon"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    {{/each}}
                </ul>
            </div>
        </div>
    </div>
    {{/if}}
{{/if}}

<div class="home">

    <!-- TOP PROMO -->
    {{#if extraHomeViewContext.topPromo}}
        {{#each extraHomeViewContext.topPromo}}
		<div class="home-top-promo-container">
			<div class="home-top-promo" {{#if color}}style="background: {{#if color}}{{color}}{{else}}gray{{/if}};{{/if}}">
				{{#if text}}
				<div class="home-top-promo-text">{{{text}}}</div>
				{{/if}}
				{{#if image}}
				<div class="home-top-promo-image">
					<a href="{{href}}"><img src="{{getThemeAssetsPathWithDefault image 'img/bridge-top-promo.png'}}" /></a>
				</div>
				{{/if}}
			</div>
		</div>
        {{/each}}
    {{/if}}

    <div class="home-cms-zone" data-cms-area="home_content_top" data-cms-area-filters="path"></div>

	<!-- CMS MERCHANDISING ZONE -->
	<div class="home-merchandizing-zone">
		<div class="home-merchandizing-zone-content">
			<div data-cms-area="home_merchandizing_zone" data-cms-area-filters="path"></div>
		</div>
	</div>

	<!--
    INFOBLOCKS
    The markup is quite different when there are 5 infoblocks, hence the extra conditions
    It is however built this way so the customer can upload any number of infoblocks and it still looks good
    -->
    {{#if extraHomeViewContext.infoblockFive}}
    <div class="home-infoblock-layout5">
        {{#each extraHomeViewContext.infoblock}}
        {{#if @first}}
            <div class="home-infoblock-quadblock-wrapper">
                <div class="home-infoblock-quadblock">
        {{/if}}
                    <div class="home-infoblock home-infoblock{{@index}}" style="background-image: url('{{getThemeAssetsPathWithDefault image}}');{{#if color}}background-color:{{color}}{{else}}lightgray{{/if}};">
                        <div class="home-infoblock-content">
                            {{#if title}}
                            <h2 class="home-infoblock-title"><a{{objectToAtrributes item}} class="home-infoblock-title-link"><span class="home-infoblock-title-string">{{title}}</span></a></h2>
                            {{/if}}
                            {{#if text}}<h3 class="home-infoblock-text"><a{{objectToAtrributes item}} class="home-infoblock-text-link"><span class="home-infoblock-text-string">{{text}}</span></a></h3>{{/if}}
                        </div>
                        <div class="home-infoblock-highlight"></div>
                    </div>
        {{#if @last}}
                </div>
            </div>
            <div class="home-infoblock-last" style="background-image: url('{{getThemeAssetsPathWithDefault image}}');{{#if color}}background-color:{{color}}{{else}}gray{{/if}};">
                <div class="home-infoblock-content">
                    {{#if title}}<h2 class="home-infoblock-title"><a{{objectToAtrributes item}} class="home-infoblock-title-link"><span class="home-infoblock-title-string">{{title}}</span></a></h2>{{/if}}
                    {{#if text}}<h3 class="home-infoblock-text"><a{{objectToAtrributes item}} class="home-infoblock-text-link"><span class="home-infoblock-text-string">{{text}}</span></a></h3>{{/if}}
                </div>
                <div class="home-infoblock-highlight"></div>
                </div>
        {{/if}}
        {{/each}}
    </div>
    {{else}}
    <div class="{{#if extraHomeViewContext.infoblockTile}}home-infoblock-layout3{{else}}home-infoblock-layout{{extraHomeViewContext.infoblockCount}}{{/if}}">
        {{#each extraHomeViewContext.infoblock}}
        <div class="home-infoblock"
        style="background-image: url('{{getThemeAssetsPathWithDefault image}}');{{#if color}}background-color:{{color}}{{else}}darkgray{{/if}};">
            <div class="home-infoblock-content">
                {{#if title}}<h2 class="home-infoblock-title"><a{{objectToAtrributes item}} class="home-infoblock-title-link"><span class="home-infoblock-title-string">{{title}}</span></a></h2>{{/if}}
                {{#if text}}<h3 class="home-infoblock-text"><a{{objectToAtrributes item}} class="home-infoblock-text-link"><span class="home-infoblock-text-string">{{text}}</span></a></h3>{{/if}}
            </div>
            <div class="home-infoblock-highlight"></div>
        </div>
        {{/each}}
    </div>
    {{/if}}


    <div class="home-cms-zone" data-cms-area="home_content_middle" data-cms-area-filters="path"></div>

	<!-- FREE TEXT AND IMAGES -->
    {{#if extraHomeViewContext.freeTextTitle}}
    <div class="home-page-freetext-content-header">
        <div class="home-cms-page-bottom-content-title">
            <h3>{{extraHomeViewContext.freeTextTitle}}</h3>
        </div>
    </div>
    {{/if}}
    <div class="home-page-freetext-content">
        <div class="home-page-freetext-content-text">
            <div data-view="FreeText">
                {{{extraHomeViewContext.freeText}}}
            </div>
        </div>
        {{#if extraHomeViewContext.showFreeTextImages}}
        <div class="home-page-freetext-content-images-wrapper">
            <div class="home-page-freetext-content-images">
                {{#each extraHomeViewContext.freeTextImages}}
                <div class="home-page-freetext-content-image"><a{{objectToAtrributes item}}><img src="{{getThemeAssetsPathWithDefault image}}"></a></div>
                {{/each}}
            </div>
        </div>
        {{/if}}
    </div>

    <div class="home-cms-zone" data-cms-area="home_content_bottom" data-cms-area-filters="path"></div>

</div>
