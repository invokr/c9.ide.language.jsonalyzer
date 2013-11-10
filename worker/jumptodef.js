/**
 * jsonalyzer jumptodef handler
 *
 * @copyright 2013, Ajax.org B.V.
 * @author Lennart Kats <lennart add c9.io>
 */
define(function(require, exports, module) {

var inferJumpToDef = require("plugins/c9.ide.language.javascript.infer/infer_jumptodef");
var index = require("./semantic_index");
var handler /*: require("plugins/c9.ide.language.jsonalyzer/jsonalyzer")*/;
var worker = require("plugins/c9.ide.language/worker");
var fileIndexer = require("./file_indexer");
var workerUtil = require("plugins/c9.ide.language/worker_util");

module.exports.init = function(_handler) {
    handler = _handler;
};

module.exports.jumpToDefinition = function(doc, fullAst, pos, currentNode, callback) {
    var line = doc.getLine(pos.row);
    var identifier = workerUtil.getIdentifier(line, pos.column);

    // We're first getting the very latest outline, which might come
    // from us or from another outliner, and we'll use as a local
    // list of definitions to jump to.
    analyzeIfNeeded(handler.path, doc, fullAst, function() {
        worker.$lastWorker.getOutline(function(outline) {
            var results = outline && outline.items
                ? findInOutline(outline.items, identifier)
                : [];
            
            // Next, get results based on the indices of our imports
            fileIndexer.findImports(handler.path, doc, fullAst, false, function(err, imports) {
                if (err) {
                    console.error(err);
                    return callback(results);
                }

                // We only actually download & analyze new files if really needed
                var needAllImports = !results.length;
                if (needAllImports)
                    fileIndexer.analyzeOthers(imports, needAllImports, done);
                else
                    done();
                
                function done() {
                    var summaries = index.getAny(imports);
                    results = findInSummaries(summaries, identifier, results);
                    callback(results);
                }
            });
        });
    });
};

/**
 * Immediately analyze a file if it is marked as "dirty",
 * or just return the last analyzed result.
 */
function analyzeIfNeeded(path, doc, fullAst, callback) {
    var entry = index.get(path);
    if (entry || !worker.$lastWorker.scheduledUpdate)
        return callback();
    fileIndexer.analyzeCurrent(handler.path, doc, fullAst, { isJumpToDefinition: true}, function(err, result) {
        callback();
    });
}

function findInSummaries(summaries, identifier, results) {
    summaries.forEach(function(summary) {
        var flatSummary = index.flattenIndexEntry(summary);
        (flatSummary["_" + identifier] || []).forEach(function(entry) {
            results.push({
                row: entry.row,
                column: entry.column,
                path: summary.path,
                icon: entry.icon
                    || entry.kind === "package" && "package"
                    || entry.kind === "event" && "event"
                    || "unknown2",
                isGeneric: true
            });
        });
    });
    return results;
}

function isNameMatch(identifier, indexName) {
    // TODO: consider index names like foo.bar or foo()
    return identifier === indexName;
}

function findInOutline(outline, identifier, results) {
    if (!results)
        results = [];
    for (var i = 0; i < outline.length; i++) {
        if (isNameMatch(identifier, outline[i].name)) {
            results.push({
                row: outline[i].pos.sl,
                column: outline[i].pos.sc,
                icon: outline[i].icon,
                isGeneric: true
            });
        }
        if (outline[i].items)
            findInOutline(outline[i].items, results);
    }
    return results;
}

function getPropertyName(node) {
    var result;
    node.rewrite(
        'PropAccess(o, p)', function(b) {
            result = b.p.value; 
        }
    );
    return result;
}

});
