var fs = require('fs');

var path = require('path');
var walk = require('walk');
var async = require('async');

var express = require('express');

// Logs an ErrnoException to the console
function logError(err) {
    console.error("ErrnoException: %s", JSON.stringify(err));
}



// Returns the index at which the specified item must be inserted in the specified sorted array
function insertIndexSorted(arr, item, compFunc) {
    var len = arr.length;

    // If the array is empty, return position 0
    if (len == 0)
        return 0;

    // Initialize binary search
    var a = 0;
    var b = len - 1;
    var aItem = arr[a];
    var bItem = arr[b];

    // Special case, check whether the new item is placed before or after the items in the array
    if (compFunc(item, aItem) <= 0)
        return 0;
    if (compFunc(item, bItem) >= 0)
        return b + 1;

    for (; ;) {
        // If there's no item between positions a and b then we insert the item here
        if (b == a + 1)
            return a + 1;

        // Split the range in half
        var c = Math.floor((a + b) / 2);

        // Fetch the item and compare
        var cItem = arr[c];
        var comp = compFunc(item, cItem);

        // If equal, insert the item right after
        if (comp == 0)
            return c + 1;

        // If the item must be placed after c, change the range
        if (comp > 0) {
            a = c;
            aItem = cItem;
        } else {
            b = c;
            bItem = cItem;
        }
    }
}

// Returns the index of the item with the specified key
function indexOfSorted(arr, key, compFunc) {
    var len = arr.length;

    // If the array is empty, return -1
    if (len == 0)
        return -1;

    // Initialize binary search
    var a = 0;
    var b = len - 1;
    var aItem = arr[a];
    var bItem = arr[b];
    var comp = 0;

    // Start binary search
    var comp = 0;
    for (; ;) {
        // If there's no item between positions a and b
        if (b == a + 1) {
            comp = compFunc(key, aItem);
            if (comp < 0)
                return -1;
            if (comp == 0)
                return a;
            comp = compFunc(key, bItem);
            if (comp == 0)
                return b;
            return -1;
        }

        // Split the range in half
        var c = Math.floor((a + b) / 2);

        // Fetch the item and compare
        var cItem = arr[c];
        comp = compFunc(key, cItem);

        // If equal, we found it
        if (comp == 0)
            return c;

        // If the item must be placed after c, change the range
        if (comp > 0) {
            a = c;
            aItem = cItem;
        } else {
            b = c;
            bItem = cItem;
        }
    }
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
    // Constructor
    function RecycleBinEntry(pbin, root, relroot, stats) {
        this.pbin = pbin;
        this.name = stats.name;
        this.path = path.join(root, this.name);
        this.relpath = path.join(relroot, this.name);
        this.isFolder = stats.type == 'directory';
        this.fileSize = stats.size;
        this.extension = path.extname(this.name);
        this.deletedDate = stats.atime;
    }
    // A comparison function to sort items by deleted date from newest to oldest
    RecycleBinEntry.compByDateFunc = function (a, b) {
        var aval = a.deletedDate.valueOf();
        var bval = b.deletedDate.valueOf();
        return bval - aval;
    };

    // A comparison function to sort items by deleted date
    RecycleBinEntry.compByDateKeyFunc = function (key, item) {
        var aval = key.valueOf();
        var bval = item.deletedDate.valueOf();
        return bval - aval;
    };

    // A comparison function to sort items by absolute path
    RecycleBinEntry.compByPathFunc = function (a, b) {
        return a.path.localeCompare(b.path);
    };

    // A comparison function to sort items by absolute path
    RecycleBinEntry.compByPathKeyFunc = function (key, item) {
        return key.localeCompare(item.path);
    };
    return RecycleBinEntry;
})();

// Represents a collection of entries
var RecycleBinEntryCollection = (function () {
    // Constructor.
    function RecycleBinEntryCollection() {
        this.byDate = [];
        this.byPath = [];
    }
    // Adds an entry to the collection
    RecycleBinEntryCollection.prototype.add = function (entry) {
        var dateIndex = insertIndexSorted(this.byDate, entry, RecycleBinEntry.compByDateFunc);
        this.byDate.splice(dateIndex, 0, entry);
        var pathIndex = insertIndexSorted(this.byPath, entry, RecycleBinEntry.compByPathFunc);
        this.byPath.splice(pathIndex, 0, entry);
    };

    // Removes the specified entry from the collection
    RecycleBinEntryCollection.prototype.remove = function (entry) {
        var dateIndex = this.byDate.indexOf(entry);
        if (dateIndex != -1)
            this.byDate.splice(dateIndex, 1);
        var pathIndex = indexOfSorted(this.byPath, entry.path, RecycleBinEntry.compByPathKeyFunc);
        if (pathIndex != -1)
            this.byPath.splice(pathIndex, 1);
    };

    // Finds the specified entry from its absolute path
    RecycleBinEntryCollection.prototype.find = function (path) {
        var pathIndex = indexOfSorted(this.byPath, path, RecycleBinEntry.compByPathKeyFunc);
        if (pathIndex != -1)
            return this.byPath[pathIndex];
        else
            return null;
    };
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
    function PhysicalRecycleBin(id, owner, recycleDirPath) {
        this.id = id;
        this.owner = owner;
        this.state = 0 /* Normal */;
        this.recycleDirPath = path.normalize(recycleDirPath);
        this.recycleDirBasePath = path.basename(recycleDirPath);
    }
    // Starts scanning the recycle bin
    PhysicalRecycleBin.prototype.scan = function (callback) {
        var _this = this;
        if (this.state != 0 /* Normal */) {
            if (callback)
                callback(Error("Cannot start scanning a virtual recycle bin that is not in Normal state"));
            return;
        }

        // Start scanning.
        this.state = 1 /* Scanning */;

        // Enumerate files and folders.
        var walker = walk.walk(this.recycleDirPath, {
            followLinks: false
        });
        walker.on('directories', function (root, directoryStatsArray, next) {
            // Alter the root.
            var relroot = path.relative(_this.recycleDirPath, root);

            for (var i = 0; i < directoryStatsArray.length; i++) {
                var stats = directoryStatsArray[i];
                var entry = new RecycleBinEntry(_this.id, root, relroot, stats);
                _this.owner.entries.add(entry);
            }
            next();
        });
        walker.on('files', function (root, fileStatsArray, next) {
            // Alter the root.
            var relroot = path.relative(_this.recycleDirPath, root);

            for (var i = 0; i < fileStatsArray.length; i++) {
                var stats = fileStatsArray[i];
                var entry = new RecycleBinEntry(_this.id, root, relroot, stats);
                _this.owner.entries.add(entry);
            }
            next();
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
        this.state = 0 /* Normal */;
        this.entries = new RecycleBinEntryCollection();
        this.physicalRecycleBins = [];
    }
    // Adds a new physical recycle bin
    VirtualRecycleBin.prototype.addPhysicalRecycleBin = function (path) {
        var physicalRecycleBin = new PhysicalRecycleBin(this.physicalRecycleBins.length, this, path);
        this.physicalRecycleBins.push(physicalRecycleBin);
        return physicalRecycleBin;
    };

    // Starts scanning the physical recycle bins asynchronously to populate them
    VirtualRecycleBin.prototype.scan = function (callback) {
        var _this = this;
        if (this.state != 0 /* Normal */) {
            if (callback)
                callback(Error("Cannot start scanning a virtual recycle bin that is not in Normal state"));
            return;
        }

        // Change state.
        this.state = 1 /* Scanning */;

        // Start scanning.
        async.eachSeries(this.physicalRecycleBins, function (physicalRecycleBin, callback) {
            return physicalRecycleBin.scan(callback);
        }, function (err) {
            _this.state = 0 /* Normal */;
            if (callback)
                callback(err);
        });
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
        async.eachSeries(this.virtualRecycleBins, function (virtualRecycleBin, callback) {
            return virtualRecycleBin.scan(callback);
        }, callback);
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

// Start it.
manager.start();

// Create the Express app.
var app = express();

// Configure the server.
app.use(express.static(path.join(__dirname, 'static')));
app.get('/api/vbins', function (req, res) {
    var response = [];
    for (var i = 0; i < manager.virtualRecycleBins.length; i++) {
        var vbin = manager.virtualRecycleBins[i];
        var vbinResponse = {};
        vbinResponse.id = i;
        vbinResponse.name = vbin.name;
        vbinResponse.state = RecycleBinState[vbin.state];
        response.push(vbinResponse);
    }
    res.json(response);
});
app.get('/api/vbins/:id/entries', function (req, res) {
    var id = parseInt(req.params.id);
    if (id == NaN || id < 0 || id >= manager.virtualRecycleBins.length) {
        res.send(500, 'invalid vbin id');
        return;
    }
    var vbin = manager.virtualRecycleBins[req.params.id];
    res.json(vbin.entries.byDate);
});

// Start it.
app.listen(config.serverPort);
//# sourceMappingURL=server.js.map
