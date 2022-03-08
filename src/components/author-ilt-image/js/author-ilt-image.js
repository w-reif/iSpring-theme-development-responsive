define([
    'core/js/adapt',
    'core/js/views/componentView',
    'core/js/models/componentModel',
    'jquery'
], function (Adapt, ComponentView, ComponentModel, $) {
    'use strict';

    // https://github.com/adaptlearning/adapt-contrib-graphic

    var compView = ComponentView.extend({
        preRender: function () {
        },
        postRender: function () {
            var bbmvc = this;
            bbmvc.setReadyStatus(); // tells Author that the component is ready to interact with

            var imgEl = $('.' + this.model.attributes._id + ' div img');
            // await the image to load
            imgEl.one("load", function () {
                bbmvc.model.onDeviceResize();
                bbmvc.model.completeFunction();
            }).each(function () {
                if (this.complete) {
                    $(this).trigger('load');
                }
            });
        }
    }, {
        template: 'ilt-image' // this is the hbs file in the templates directory that will be passed this.model.attributes
    });

    var compModel = ComponentModel.extend({
        completeFunction: function () {
            console.log('complete');
            this.setCompletionStatus();  // tells Author that the component is complete
        },
        onDeviceResize: function () {
            console.log('device resized');
        }
    });



    return Adapt.register('ilt-image', {
        model: compModel,
        view: compView
    })
});
