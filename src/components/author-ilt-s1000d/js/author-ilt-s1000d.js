define([
    'core/js/adapt',
    'core/js/views/componentView',
    'core/js/models/componentModel',
    'jquery'
], function(Adapt, ComponentView, ComponentModel, $) {
    'use strict';

    var compView = ComponentView.extend({
        preRender: function(){
            this.listenTo(Adapt, {
                'device:changed device:preResize device:resize device:postResize': this.model.onDeviceResize
            });
        },
        postRender: function (){
            this.setReadyStatus(); // tells Author that the component is ready to interact with
            this.model.completeFunction();
        }
    },{
        template: 'ilt-s1000d' // this is the hbs file in the templates directory that will be passed this.model.attributes
    });

    var compModel = ComponentModel.extend({
        completeFunction:function(){
            this.setCompletionStatus();  // tells Author that the component is complete
        },
        onDeviceResize:function(){
        }
    });

    

    return Adapt.register('ilt-s1000d', {
        model: compModel,
        view: compView
    })
});
