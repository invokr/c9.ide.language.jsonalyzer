/**
 * jsonalyzer markdown analysis
 *
 * @copyright 2013, Ajax.org B.V.
 * @author Lennart Kats <lennart add c9.io>
 */
define(function(require, exports, module) {

var jsonalyzer;
var PluginBase = require("plugins/c9.ide.language.jsonalyzer/worker/jsonalyzer_base_handler");
var ctagsUtil = require("plugins/c9.ide.language.jsonalyzer/worker/ctags/ctags_util");

var TAGS = [
    { regex: /(?:^|\n)# (.*?)[#\s]*(?:\n|$)/g, kind: "property" },
    { regex: /(?:^|\n)[A-Za-z0-9](.*?)\s*\n={2,}(?:\n|$)/g, kind: "property" },
    { regex: /(?:^|\n)#{2,} (.*?)[#\s]*(?:\n|$)/g, kind: "property2" },
    { regex: /(?:^|\n)[A-Za-z0-9](.*?)\s*\n-{2,}(?:\n|$)/g, kind: "property2" },
];
var GUESS_FARGS = false;
var EXTRACT_DOCS = false;
var LANGUAGES = ["markdown"];
var EXTENSIONS = ["md", "markdown"];

var handler = module.exports = Object.create(PluginBase);

handler.init = function(jsonalyzer_worker) {
    jsonalyzer = jsonalyzer_worker;
    jsonalyzer.registerHandler(this, LANGUAGES[0], LANGUAGES, EXTENSIONS);
};

handler.analyzeCurrent = function(path, doc, ast, options, callback) {
    if (doc === "")
        return callback(null, {});
        
    if (doc.length > jsonalyzer.getMaxFileSizeSupported())
        return callback();
    
    var results = {};
    TAGS.forEach(function(tag) {
        if (tag.kind === "import")
            return;
        ctagsUtil.findMatchingTags(
            path, doc, tag, GUESS_FARGS, EXTRACT_DOCS, results);
    });
    callback(null, { properties: results });
};

handler.analyzeOthers = handler.analyzeCurrentAll;

handler.findImports = function(path, doc, ast, callback) {
    callback(null, ctagsUtil.findMatchingOpenFiles(path));
};


});