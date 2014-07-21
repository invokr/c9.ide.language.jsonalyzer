define(function(require, exports, module) {
    
    module.exports = {
        handlersWorker: [
            "plugins/c9.ide.language.jsonalyzer/worker/handlers/jsonalyzer_js",
            "plugins/c9.ide.language.jsonalyzer/worker/handlers/jsonalyzer_md",
            "plugins/c9.ide.language.jsonalyzer/worker/handlers/jsonalyzer_php",
            "plugins/c9.ide.language.jsonalyzer/worker/handlers/jsonalyzer_sh",
            "plugins/c9.ide.language.jsonalyzer/worker/handlers/jsonalyzer_py",
            "plugins/c9.ide.language.jsonalyzer/worker/handlers/jsonalyzer_rb",
            "plugins/c9.ide.language.jsonalyzer/worker/handlers/jsonalyzer_ctags",
            "plugins/c9.ide.language.jsonalyzer/worker/handlers/jsonalyzer_go",
        ],
        
        helpersWorker: [],
        
        handlersServer: [
            {
                path: "plugins/c9.ide.language.jsonalyzer/server/handlers/jsonalyzer_sh_server",
                contents: require("text!./server/handlers/jsonalyzer_sh_server.js")
            },
            {
                path: "plugins/c9.ide.language.jsonalyzer/server/handlers/jsonalyzer_php_server",
                contents: require("text!./server/handlers/jsonalyzer_php_server.js")
            },
            {
                path: "plugins/c9.ide.language.jsonalyzer/server/handlers/jsonalyzer_py_server",
                contents: require("text!./server/handlers/jsonalyzer_py_server.js")
            },
            {
                path: "plugins/c9.ide.language.jsonalyzer/server/handlers/jsonalyzer_rb_server",
                contents: require("text!./server/handlers/jsonalyzer_rb_server.js")
            },
            {
                path: "plugins/c9.ide.language.jsonalyzer/server/handlers/jsonalyzer_go_server",
                contents: require("text!./server/handlers/jsonalyzer_go_server.js")
            },
        ],
        
        helpersServer: [
            // Mock helpers
            {
                path: "plugins/c9.ide.language/worker",
                contents: require("text!./server/mock_language_worker.js")
            },
            {
                path: "plugins/c9.ide.language.jsonalyzer/worker/jsonalyzer_worker",
                contents: require("text!./server/mock_jsonalyzer_worker.js")
            },
            {
                path: "plugins/c9.ide.language.jsonalyzer/worker/architect_resolver_worker",
                contents: require("text!./server/mock_architect_resolver_worker.js")
            },
            // Real helpers
            {
                path: "plugins/c9.ide.language/complete_util",
                contents: require("text!../c9.ide.language/complete_util.js")
            },
            {
                path: "plugins/c9.ide.language/worker_util",
                contents: require("text!../c9.ide.language/worker_util.js")
            },
            {
                path: "plugins/c9.ide.language.jsonalyzer/worker/jsonalyzer_base_handler",
                contents: require("text!./worker/jsonalyzer_base_handler.js")
            },
            {
                path: "plugins/c9.ide.language.jsonalyzer/worker/ctags/ctags_util",
                contents: require("text!./worker/ctags/ctags_util.js")
            },
            {
                path: "plugins/c9.ide.language.javascript.infer/path",
                contents: require("text!../c9.ide.language.javascript.infer/path.js")
            },
        ],
    };
    
});