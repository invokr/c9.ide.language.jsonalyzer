/**
 * jsonalyzer CTAGS-based analysis
 *
 * @copyright 2012, Ajax.org B.V.
 * @author Lennart Kats <lennart add c9.io>
 */
define(function(require, exports, module) {

var handler;
var index = require("plugins/c9.ide.language.jsonalyzer/worker/semantic_index");
var PluginBase = require("plugins/c9.ide.language.jsonalyzer/worker/jsonalyzer_base_handler");
var ctags = require("plugins/c9.ide.language.jsonalyzer/worker/ctags/ctags_ex");
var asyncForEach = require("plugins/c9.ide.language/worker").asyncForEach;
var workerUtil = require("plugins/c9.ide.language/worker_util");

var plugin = module.exports = Object.create(PluginBase);

var EXTENSIONS = ctags.EXTENSIONS;
var IDLE_TIME = 50;

plugin.init = function(jsonalyzer_worker) {
    handler = jsonalyzer_worker;
    var extensions = Array.prototype.concat.apply([], EXTENSIONS);
    handler.registerPlugin(this, "ctags", [".*"], extensions);
};

plugin.findImports = function(path, doc, ast, callback) {
    var openFiles = workerUtil.getOpenFiles();
    var extension = getExtension(path);
    var supported = getCompatibleExtensions(extension);
    var imports = openFiles.filter(function(path) {
        return supported.indexOf(getExtension(path)) > -1;
    });
    callback(null, imports);
};

function getExtension(path) {
    return path.match(/[^\.]*$/)[0];
}

/**
 * Get an array of compatible extensions, e.g. ["js", "html"] for "js".
 */
function getCompatibleExtensions(extension) {
    for (var i = 0; i < EXTENSIONS.length; i++) {
        if (EXTENSIONS[i].indexOf(extension) > -1)
            return EXTENSIONS[i];
    }
    return [extension];
}

plugin.analyzeCurrent = function(path, doc, ast, options, callback) {
    if (doc === "")
        return callback(null, {});
        
    if (doc.length > handler.getMaxFileSizeSupported())
        return callback();

    // Let's not slow down completion, since other handlers
    // likely give better results anyway. We'll just use the last analysis.
    // And also, we don't care about saves, just about changes
    if ((options.isComplete || options.isSave) && index.get(path))
        return callback(null, index.get(path));
    
    ctags.analyze(path, doc, callback);
};

plugin.analyzeOthers = function(paths, callback) {
    var errs = [];
    var results = [];
    asyncForEach(
        paths,
        function(path, next) {
            workerUtil.readFile(path, function(err, doc) {
                if (err) {
                    errs.push(err);
                    results.push(null);
                    return next();
                }
                
                plugin.analyzeCurrent(path, doc, null, {}, function(err, result) {
                    errs.push(err);
                    results.push(result);
                    next();
                });
            });
        },
        function() {
            callback(errs, results);
        }
    );
};

});
