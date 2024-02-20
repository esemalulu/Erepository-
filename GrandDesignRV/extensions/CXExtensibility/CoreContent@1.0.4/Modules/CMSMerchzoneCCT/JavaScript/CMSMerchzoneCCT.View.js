// Types references for VSCode Intellisense
/// <reference path="../../../../../node_modules/@types/jquery/index.d.ts"/>
/// <reference path="../../../../../node_modules/@types/underscore/index.d.ts"/>
/**
 * @typedef {import("./types").Item} Item Data for single item to display in the merchandising zone
 * @typedef {import("./types").ItemImage} ItemImage Container for image url and alt text
 * @typedef {import("./types").Settings} Settings Sidepanel settings
 */

define('CXExtensibility.CoreContent.CMSMerchzoneCCT.View', [
    'CustomContentType.Base.View',

    'cxextensibility_corecontent_cmsmerchzonecct.tpl',

    'Utils',

    'jQuery',
    'underscore',
], /**
 * @param {JQueryStatic} $
 * @param {_.UnderscoreStatic} _
 */ function (CustomContentTypeBaseView, template, Utils, $, _) {
    'use strict';

    var displayModes = {
        HORIZONTAL: '1',
        VERTICAL: '2',
        GRID: '3',
    };
    var isMobile = false;

    return CustomContentTypeBaseView.extend({
        template: template,

        /**@type {Settings}*/
        settings: null,

        initialize: function () {
            this._initialize();

            this.on('afterViewRender', function () {
                var merchRule = this.settings.custrecord_merchzone_merchrule;
                isMobile = window.matchMedia("(max-width: 767px)").matches

                if (merchRule && merchRule !== '') {
                    this.fetchMerchZoneEndpoint(merchRule);
                }
            });
        },

        /**
         * Fetch merchzone information from SMT CMS endpoint
         * @param {string | number} merchzoneId Merchzone ID to fetch
         */
        fetchMerchZoneEndpoint: function fetchMerchZoneEndpoint(merchzoneId) {
            $.ajax({
                url: '/api/cms/v2/merchzones/' + merchzoneId,
            }).done(
                function (res) {
                    this.fetchItems(res.data[0].queryString);
                }.bind(this)
            );
        },

        /**
         * Fetch items from items enddpoint returned from merchzone endpoint
         * @param {string} itemsEndpoint
         */
        fetchItems: function fetchItems(itemsEndpoint) {
            $.ajax({
                url: itemsEndpoint,
            }).done(
                function (res) {
                    var itemDetails = _.map(
                        res.items,
                        function (item) {
                            /** @type {Item} */
                            var formattedItem = {
                                name: item.storedisplayname2 || item.displayname,
                                price: item.onlinecustomerprice_formatted,
                                link: '/' + item.urlcomponent,
                                image: this.getDefaultImage(item.itemimages_detail),
                            };
                            return formattedItem;
                        }.bind(this)
                    );

                    this.renderMerchzone(itemDetails);
                }.bind(this)
            );
        },

        /**
         * Render item info to template
         * @param {Item[]} items
         */
        renderMerchzone: function renderMerchzone(items) {
            if (items.length === 0) {
                return;
            }

            var heading = this.settings.custrecord_merchzone_heading || '';

            if (heading.length === 0) {
                this.$('.cms-merchzone-heading').remove();
            } else {
                this.$('.cms-merchzone-heading').text(heading);
            }

            _.each(
                items,
                function (item) {
                    var template = this.$('#item-template').contents().clone();

                    template.find('.item-name').text(item.name);
                    template.find('.item-price').text(item.price);
                    template.find('.item-link').attr('href', item.link);
                    template.find('.item-name').attr('href', item.link);
                    template.find('.cms-merchzone-see-more').attr('href', item.link);
                    template.find('.item-image').attr('src', item.image.url);
                    template.find('.item-image').attr('alt', item.image.altimagetext);

                    this.$('.cms-merchzone-slider').append(template);
                },
                this
            );

            var sliderRendered = this.$('.cms-merchzone-slider').parent().hasClass('bx-viewport');
            var displayMode = this.settings.custrecord_merchzone_display_mode.toString();

            if (displayMode !== displayModes.GRID) {
                if (sliderRendered) {
                    return;
                }

                this.renderSlider();
            } else {
                this.renderGrid();
            }
        },

        renderSlider: function renderSlider() {
            var displayMode = this.settings.custrecord_merchzone_display_mode || displayModes.HORIZONTAL;
            var mode = displayMode.toString() === displayModes.VERTICAL ? 'vertical' : 'horizontal';
            var numItems = isMobile ? 1 : parseInt(this.settings.custrecord_merchzone_numitems) || 4;
            var merchzoneWidth = this.$('.cms-merchzone-slider').width();
            var slideWidth = Math.floor(merchzoneWidth / numItems);

            var sliderOptions = {
                mode: mode,
                minSlides: numItems,
                maxSlides: numItems,
                slideWidth: slideWidth,
                moveSlides: 1,
                pager: false,
                nextText:
                    '<a class="cms-merchzone-slider-next cms-merchzone-' +
                    mode +
                    '-control"><span class="control-text">' +
                    _('next').translate() +
                    '</span> <i class="carousel-next-arrow"></i></a>',
                prevText:
                    '<a class="cms-merchzone-slider-prev cms-merchzone-' +
                    mode +
                    '-control"><i class="carousel-prev-arrow"></i> <span class="control-text">' +
                    _('prev').translate() +
                    '</span></a>',
            };

            Utils.initBxSlider(this.$('.cms-merchzone-slider'), sliderOptions);
            this.$('.item-image-wrapper').css({ 'min-height': slideWidth + 'px' });
            if (displayMode === displayModes.VERTICAL) {
                this.$('.bx-wrapper').css({ margin: '0 auto' });
            }

            // Fix incorrect height when SCA rerenders the slider
            setTimeout(
                function () {
                    var itemHeight = this.$('.cms-merchzone-item').height();
                    this.$('.bx-viewport').css({ 'min-height': itemHeight });
                }.bind(this)
            );
        },

        renderGrid: function renderGrid() {
            var merchzoneWidth = this.$('.cms-merchzone-slider').width();
            var numItems = isMobile ? 1 : parseInt(this.settings.custrecord_merchzone_numitems) || 3;

            this.$('.cms-merchzone-slider').removeClass('cms-merchzone-slider').addClass('cms-merchzone-grid');
            this.$('.cms-merchzone-grid > li').css({
                width: Math.floor(merchzoneWidth / numItems),
            });
        },

        /**
         * Get the default image or first image found if not available
         * @param {Object} itemimages The object contained in the item's itemimages_detail key
         * @returns {ItemImage}
         */
        getDefaultImage: function getDefaultImage(itemimages) {
            /**
             * Flatten method taken from SCA Utils
             * @param {Object} images
             * @returns {ItemImage[]}
             */
            function flattenImages(images) {
                if ('url' in images && 'altimagetext' in images) {
                    return [images];
                }

                return _.flatten(
                    _.map(images, function (item) {
                        if (_.isArray(item)) {
                            return item;
                        }
                        return flattenImages(item);
                    })
                );
            }

            var imageData = flattenImages(itemimages);

            var defaultImage = _.find(imageData, function (image) {
                var match = image.url.match(/.*\.default\.[A-Za-z]*/i);
                return !!match && match[0] === image.url;
            });

            return defaultImage || imageData[0];
        },

        contextDataRequest: [],

        validateContextDataRequest: function () {
            return true;
        },

        getContext: function () {
            return {
                merchRule: this.settings.custrecord_merchzone_merchrule,
                displayMode: this.settings.custrecord_merchzone_display_mode,
                numItems: this.settings.custrecord_merchzone_numitems,
            };
        },
    });
});
