/*
 * This mocks Collab if Collab is not loaded.
 */
define(function(require, exports, module) {
    "use strict";

    main.consumes = ["Plugin"];
    main.provides = ["collab", "collab.connect"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var plugin = new Plugin("Ajax.org", main.consumes);

        plugin.freezePublicAPI({
            
        });
        
        register(null, {
            collab: plugin,
            "collab.connect": plugin
        });
    }
});