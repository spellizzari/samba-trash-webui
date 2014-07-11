var fs = require('fs');

var path = require('path');
var walk = require('walk');

var express = require('express');

// Logs an ErrnoException to the console
function logError(err) {
    console.error("ErrnoException: %s", JSON.stringify(err));
}


// Configuration data imported from the JSON configuration file which path is specified as first argument
var Configuration = (function () {
    function Configuration() {
        this.serverPort = 1337;
        this.recycleBins = [];
    }
    // Parses the specified JSON file as an instance of the Configuration file
    Configuration.Load = function (path) {
        // Load file data as UTF8 text.
        var fileData = fs.readFileSync(path).toString();

        // Parse JSON.
        var srcData = JSON.parse(fileData);

        // Create a new Configuration object and copy attributes.
        var config = new Configuration();

        for (var prop in srcData) {
            // If this property does not exist, skip it.
            if (!config.hasOwnProperty(prop))
                continue;

            // Otherwise copy the property value.
            config[prop] = srcData[prop];
        }

        // Okay.
        return config;
    };
    return Configuration;
})();

// ---- Worker Classes --------------------------------------------------------------------------------------------------------
// Represents a recycled file
var RecycleBinEntry = (function () {
    function RecycleBinEntry() {
    }
    return RecycleBinEntry;
})();

// Represents a collection of entries
var RecycleBinEntryCollection = (function () {
    function RecycleBinEntryCollection() {
    }
    return RecycleBinEntryCollection;
})();

// Represents the state of a recycle bin (physical or virtual)
var RecycleBinState;
(function (RecycleBinState) {
    RecycleBinState[RecycleBinState["Normal"] = 0] = "Normal";
    RecycleBinState[RecycleBinState["Scanning"] = 1] = "Scanning";
    RecycleBinState[RecycleBinState["Cleaning"] = 2] = "Cleaning";
})(RecycleBinState || (RecycleBinState = {}));

// Represents a physical recycle bin
var PhysicalRecycleBin = (function () {
    // Constructor
    function PhysicalRecycleBin(owner, recycleDirPath) {
        this.owner = owner;
        this.entries = new RecycleBinEntryCollection();
        this.recycleDirPath = recycleDirPath;
        this.recycleDirBasePath = path.basename(recycleDirPath);
    }
    // Starts scanning the recycle bin
    PhysicalRecycleBin.prototype.startScan = function (callback) {
        var _this = this;
        if (this.state != 0 /* Normal */) {
            if (callback)
                callback("Cannot start scanning a virtual recycle bin that is not in Normal state");
            return;
        }

        // Start scanning.
        this.state = 1 /* Scanning */;

        // Enumerate files and folders.
        var walker = walk.walk(this.recycleDirPath, {
            followLinks: false
        });
        walker.on('directories', function (root, fileStatsArray, next) {
        });
        walker.on('end', function () {
            _this.state = 0 /* Normal */;
            if (callback)
                callback();
        });
    };
    return PhysicalRecycleBin;
})();

// Represents a virtual recycle bin
var VirtualRecycleBin = (function () {
    // Constructor
    function VirtualRecycleBin(name) {
        this.name = name;
        this.physicalRecycleBins = [];
    }
    // Adds a new physical recycle bin
    VirtualRecycleBin.prototype.addPhysicalRecycleBin = function (path) {
        var physicalRecycleBin = new PhysicalRecycleBin(this, path);
        this.physicalRecycleBins.push(physicalRecycleBin);
        return physicalRecycleBin;
    };

    // Starts scanning the physical recycle bins asynchronously to populate them
    VirtualRecycleBin.prototype.scan = function (callback) {
        if (this.state != 0 /* Normal */) {
            if (callback)
                callback("Cannot start scanning a virtual recycle bin that is not in Normal state");
            return;
        }

        // If we have physical recycle bins...
        if (this.physicalRecycleBins.length > 0) {
            // Start scanning.
            this.state = 1 /* Scanning */;

            var This = this;
            var binIndex = 0;

            function endOfScan(err) {
                // In case of error, stop here and propagate.
                if (err) {
                    This.state = 0 /* Normal */;
                    callback(err);
                    return;
                }

                // Process the next bin.
                binIndex++;
                if (binIndex < This.physicalRecycleBins.length)
                    This.physicalRecycleBins[binIndex].startScan(endOfScan);
                else {
                    This.state = 0 /* Normal */;
                    if (callback)
                        callback();
                }
            }

            this.physicalRecycleBins[0].startScan(endOfScan);
        } else {
            if (callback)
                callback();
        }
    };
    return VirtualRecycleBin;
})();

// Manages the recycle bin system
var RecycleBinManager = (function () {
    // Constructor
    function RecycleBinManager(config) {
        this.virtualRecycleBins = [];

        for (var i = 0; i < config.recycleBins.length; i++) {
            var binConfig = config.recycleBins[i];

            // Create the bin.
            var virtualRecycleBin = new VirtualRecycleBin(binConfig.name);
            for (var j = 0; j < binConfig.recycleFolderPaths.length; j++)
                virtualRecycleBin.addPhysicalRecycleBin(binConfig.recycleFolderPaths[j]);

            // Add it to the set of virtual recycle bins.
            this.virtualRecycleBins.push(virtualRecycleBin);
        }
    }
    // Starts the manager
    RecycleBinManager.prototype.start = function (callback) {
        for (var i = 0; i < this.virtualRecycleBins.length; i++)
            this.virtualRecycleBins[i].startScan();
    };
    return RecycleBinManager;
})();

// ---- Entry Point -----------------------------------------------------------------------------------------------------------
// Parse arguments.
var configFilePath = "config.json";
if (process.argv.length > 0)
    configFilePath = process.argv[2];

// Open the configuration file.
var config = Configuration.Load(configFilePath);

// Create the recycle bin manager.
var manager = new RecycleBinManager(config);

// Create the Express app.
var app = express();

// Configure the server.
app.get('/api/vbins', function (req, res) {
    var response = [];
    for (var i = 0; i < manager.virtualRecycleBins.length; i++) {
        var vbin = manager.virtualRecycleBins[i];
        var vbinResponse = {};
        vbinResponse.name = vbin.name;
        vbinResponse.state = vbin.state;
        response.push(vbinResponse);
    }
    res.json(response);
});

// Start it.
app.listen(config.serverPort);
//# sourceMappingURL=server.js.map
