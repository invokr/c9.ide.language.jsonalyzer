/*global describe it before after beforeEach afterEach define*/
"use client";
"use server";
"use strict";

if (typeof define === "undefined") {
    require("amd-loader");
    require("../../../test/setup_paths");
    require("c9/inline-mocha")(module);
}

define(function(require, exports, module) {

var assert = require("ace/test/assertions");
var workerUtil = require("plugins/c9.ide.language/worker_util");
var worker = require("plugins/c9.ide.language/worker");
var handler = require("./jsonalyzer_handler");
var index = require("./semantic_index");
var fileIndexer = require("./file_indexer");
var directoryIndexer = require("./directory_indexer");
var Document  = require("ace/document").Document;

describe("jsonalyzer handler", function(){
    
    beforeEach(function(done) {
        index.clear();
        
        // Mock
        handler.sender = {
            on: function() {}
        };
        worker.$lastWorker = {
            $openDocuments: [],
            getIdentifierRegex: function() { return (/[A-Za-z0-9]/); },
            getOutline: function(callback) {
                return handler.outline(handler.$testDoc, null, callback);
            }
        };
        workerUtil.execFile = function() { console.trace("execFile"); };

        handler.init(done);
    });
    
    it("inits", function(done) {
        handler.init(done);
    });
    it("analyzes a single .cs file", function(done) {
        handler.path = "/testfile.cs";
        handler.analyze(
            "class C { void foo() {} void bar() {} }",
            null,
            function(err) {
                assert(!err, err);
                var result = index.get("/testfile.cs");
                assert(result, "Should have a result");
                assert(result.properties);
                assert(result.properties._C);
                assert(result.properties._foo);
                done();
            }
        );
    });
    it("analyzes a javascript file", function(done) {
        handler.path = "/testfile.js";
        handler.analyze(
            "function javascript() {}",
            null,
            function(markers) {
                assert(!markers, "No markers expected");
                var result = index.get("/testfile.js");
                assert(result);
                assert(result.properties);
                assert(result.properties._javascript);
                done();
            }
        );
    });
    it("produces an outline", function(done) {
        handler.path = "/testfile.cs";
        handler.outline(
            "class C { void foo() {} void bar() {} }",
            null,
            function(result) {
                assert(result);
                assert(result.items);
                assert.equal(result.items[0].name, "C");
                done();
            }
        );
    });
    it("completes your code", function(done) {
        handler.path = "/testfile.cs";
        handler.complete(
            new Document("f function foo() {}"),
            null,
            { row: 0, col: 1 },
            null,
            function(results) {
                assert(results && results.length > 0);
                assert.equal(results[0].name, "foo");
                done();
            }
        );
    });
    it("completes code accross multiple files", function(done) {
        var file1 = {
            path: "/testfile.js",
            contents: "f function bar() {}",
            cursor: { row: 0, column: 1 }
        };
        var file2 = {
            path: "/testfile2.js",
            contents: "function foo() {}"
        };
        
        handler.path = file1.path;
        worker.$lastWorker.$openDocuments = [file1.path, file2.path];
        workerUtil.readFile = function(file, callback) {
            callback(null, file2.contents);
        };
        
        // Update function for second file results
        worker.$lastWorker.completeUpdate = function() {
            handler.complete(
                new Document(file1.contents), null, file1.cursor, null,
                onFullComplete
            );
        };
        
        // Trigger on first file
        handler.complete(
            new Document(file1.contents), null, file1.cursor, null,
            function(results) {
                // it won't be here yet
                assert.equal(results.length, 0);
            }
        );
        
        function onFullComplete(results) {
            assert(results && results.length > 0);
            assert.equal(results[0].name, "foo");
            assert.equal(results[0].meta, "testfile2.js");
            done();
        }
    });
    it("only calls completeUpdate() once for multi-file completion", function(done) {
        var file1 = {
            path: "/testfile.js",
            contents: "f function bar() {}",
            cursor: { row: 0, column: 1 }
        };
        var file2 = {
            path: "/testfile2.js",
            contents: "function foo() {}"
        };
        
        handler.path = file1.path;
        worker.$lastWorker.$openDocuments = [file1.path, file2.path];
        workerUtil.readFile = function(file, callback) {
            callback(null, file2.contents);
        };
        
        // Update function for second file results
        worker.$lastWorker.completeUpdate = function() {
            handler.complete(
                new Document(file1.contents), null, file1.cursor, null,
                onFullComplete
            );
        };
        
        // Trigger on first file
        handler.complete(
            new Document(file1.contents), null, file1.cursor, null,
            function(results) {
                // it won't be here yet
                assert.equal(results.length, 0);
            }
        );
        
        function onFullComplete(results) {
            assert(results && results.length > 0);
            index.removeByPath(file1.path);
            worker.$lastWorker.completeUpdate = function() {
                assert(false, "completeUpdate may only be called once");
            };
            handler.complete(
                new Document(file1.contents), null, file1.cursor, null,
                function(results) {
                    assert(results && results.length > 0);
                    done();
                }
            );
        }
    });
    it("jumps to definitions accross multiple files", function(done) {
        var file1 = {
            path: "/testfile.cs",
            contents: "class Child : Parent {}",
            cursor: { row: 0, column: 15 }
        };
        var file2 = {
            path: "/testfile2.cs",
            contents: "class Parent {}"
        };
        
        handler.path = file1.path;
        handler.$testDoc = file1.contents;
        worker.$lastWorker.$openDocuments = [file1.path, file2.path];
        workerUtil.readFile = function(file, callback) {
            callback(null, file2.contents);
        };
        
        // Trigger on first file
        handler.jumpToDefinition(
            new Document(file1.contents), null, file1.cursor, null,
            function(results) {
                assert(results, "Results expected");
                assert.equal(results[0].path, file2.path);
                done();
            }
        );
    });
    it("only requests imported files once", function(done) {
        var file1 = {
            path: "/testfile.cs",
            contents: "class Child : Parent {}",
            cursor: { row: 0, column: 15 }
        };
        var file2 = {
            path: "/testfile2.cs",
            contents: "class Parent {}"
        };
        
        handler.path = file1.path;
        handler.$testDoc = file1.contents;
        worker.$lastWorker.$openDocuments = [file1.path, file2.path];
        workerUtil.readFile = function(file, callback) {
            callback(null, file2.contents);
        };
        
        // Trigger on first file
        handler.jumpToDefinition(
            new Document(file1.contents), null, file1.cursor, null,
            function(results) {
                assert(results, "Results expected");
                assert.equal(results[0].path, file2.path);
                
                workerUtil.readFile = function(file, callback) {
                    assert(false, "readFile called a second time");
                };

                // Jump again
                handler.jumpToDefinition(
                    new Document(file1.contents), null, file1.cursor, null,
                    function(results) {
                        assert(results, "Results expected");
                        assert.equal(results[0].path, file2.path);
                        
                        // Analyze others; still no trigger
                        fileIndexer.analyzeOthers([file1.path, file2.path], true, function() {
                            done();
                        });
                    }
                );
            }
        );
    });
    it("reanalyzes on watcher events", function(done) {
        var file = {
            path: "/testfile.cs",
            contents: "class Child : Parent {}",
            cursor: { row: 0, column: 15 }
        };
        var timesAnalyzed = 0;
        workerUtil.readFile = function(name, callback) {
            timesAnalyzed++;
            callback(null, file.contents);
        };
        workerUtil.execFile = function(command, args, callback) {
            callback(null, "dir listing");
        };
        // Analyze others; still no trigger
        fileIndexer.analyzeOthers([file.path], true, function() {
            assert.equal(timesAnalyzed, 1);
            directoryIndexer.enqueue(file.path);
            directoryIndexer.$consumeQueue();
            fileIndexer.analyzeOthers([file.path], true, function() {
                assert.equal(timesAnalyzed, 2);
                directoryIndexer.enqueue(file.path);
                directoryIndexer.$consumeQueue();
                fileIndexer.analyzeOthers([file.path], true, function() {
                    assert.equal(timesAnalyzed, 3);
                    directoryIndexer.$consumeQueue();
                    fileIndexer.analyzeOthers([file.path], true, function() {
                        assert.equal(timesAnalyzed, 3);
                        done();
                    });
                });
            });
        });
    });
    it("jumps to definitions within the same file", function(done) {
        var file1 = {
            path: "/testfile.cs",
            contents: "class Child : Parent {}\n\
                       class Parent {}",
            cursor: { row: 0, column: 15 }
        };
        var file2 = {
            path: "/testfile2.cs",
            contents: "class Parent {}"
        };
        
        handler.path = file1.path;
        handler.$testDoc = file1.contents;
        worker.$lastWorker.$openDocuments = [file1.path, file2.path];
        workerUtil.readFile = function(file, callback) {
            callback(null, file2.contents);
        };
        
        // Trigger on first file
        handler.jumpToDefinition(
            new Document(file1.contents), null, file1.cursor, null,
            function(results) {
                assert(results, "Results expected");
                assert.equal(results[0].icon, "package");
                assert(results[0].path !== file2.path);
                done();
            }
        );
    });
    it("analyzes multiple files", function(done) {
        var file1 = {
            path: "/testfile.cs",
            contents: "class File1 {}",
            cursor: { row: 0, column: 15 }
        };
        var file2 = {
            path: "/testfile2.cs",
            contents: "class File2 {}"
        };
        
        handler.path = file1.path;
        handler.$testDoc = file1.contents;
        worker.$lastWorker.$openDocuments = [file1.path, file2.path];
        workerUtil.readFile = function(file, callback) {
            callback(null, file === file1.path ? file1.contents : file2.contents);
        };
        
        // Trigger on first file
        fileIndexer.analyzeOthers([file1.path, file2.path], true, function() {
            var result1 = index.get(file1.path);
            assert(result1.properties._File1, "File1 expected in file1");
            var result2 = index.get(file2.path);
            assert(result2.properties._File2, "File2 expected in file2");
            done();
        });
    });
    it("has documentation in code completion", function(done) {
        handler.path = "/testfile.cs";
        handler.complete(
            new Document("/** herro */ \n\
                          function foo() {}"),
            null,
            { row: 0, col: 1 },
            null,
            function(results) {
                assert(results && results.length > 0);
                assert.equal(results[0].name, "foo");
                assert(results[0].doc.match(/herro/));
                done();
            }
        );
    });
    it("has documentation in code completion ... for bash!", function(done) {
        handler.path = "/testfile.sh";
        handler.complete(
            new Document("# foo something \n\
                          foo() {}"),
            null,
            { row: 0, col: 1 },
            null,
            function(results) {
                assert(results && results.length > 0);
                assert.equal(results[0].name, "foo");
                assert(results[0].doc.match(/foo something/));
                done();
            }
        );
    });
    it("has proper garbage collection", function(done) {
        var file1 = {
            path: "/testfile.cs",
            contents: "class File1 {}",
            cursor: { row: 0, column: 15 }
        };
        var file2 = {
            path: "/testfile2.cs",
            contents: "class File2 {}"
        };
        
        handler.path = file1.path;
        handler.$testDoc = file1.contents;
        worker.$lastWorker.$openDocuments = [file1.path, file2.path];
        workerUtil.readFile = function(file, callback) {
            callback(null, file === file1.path ? file1.contents : file2.contents);
        };
        
        // Trigger on first file
        fileIndexer.analyzeOthers([file1.path, file2.path], true, function() {
            var result1 = index.get(file1.path);
            assert(result1.properties._File1, "File1 expected in file1");
            var result2 = index.get(file2.path);
            assert(result2.properties._File2, "File2 expected in file2");
            
            index.$clearAccessedSinceGC();
            index.gc();
            assert(index.get(file1.path), "File1 is open and cannot be garbage collected");
            assert(index.get(file2.path), "File2 is open and cannot be garbage collected");
            
            worker.$lastWorker.$openDocuments = [];
            index.gc();
            assert(index.get(file1.path), "File1 is recently accessed and cannot be garbage collected");
            index.get(file2.path, "File2 is recently accessed and cannot be garbage collected");
            
            index.$clearAccessedSinceGC();
            index.gc();
            assert(!index.get(file1.path), "File1 must be garbage collected");
            assert(!index.get(file2.path), "File2 must be garbage collected");

            done();
        });
    });
    it("analyzes a php file", function(done) {
        handler.path = "/testfile.php";
        handler.analyze(
            "function phpfun() {}",
            null,
            function(markers) {
                assert(!markers, "No markers expected");
                var result = index.get("/testfile.php");
                assert(result);
                assert(result.properties);
                assert(result.properties._phpfun, "PHP function expected");
                done();
            }
        );
    });
});

if (typeof onload !== "undefined")
    onload();

});