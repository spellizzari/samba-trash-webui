import fs = require('fs');
import http = require('http');
import path = require('path');
import walk = require('walk');
import async = require('async');
import assert = require('assert');
import express = require('express');

// Logs an ErrnoException to the console
function logError(err: ErrnoException): void
{
    console.error("ErrnoException: %s", JSON.stringify(err));
}

// ---- Tools -----------------------------------------------------------------------------------------------------------------

// Represents the prototype of a function that compares two objects of type T
interface ComparisonFunc<T> { (a: T, b: T): number; }

// Represents the prototype of a function that compares an object of type T with a key of type K
interface KeyComparisonFunc<T, K> { (key: K, item: T): number; }

// Returns the index at which the specified item must be inserted in the specified sorted array
function insertIndexSorted<T>(arr: T[], item: T, compFunc: ComparisonFunc<T>): number
{
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

    // Start binary search
    for (; ;)
    {
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
        if (comp > 0)
        {
            a = c;
            aItem = cItem;
        }
        // If the item must be placed before c, change the range
        else
        {
            b = c;
            bItem = cItem;
        }
    }
}

// Returns the index of the item with the specified key
function indexOfSorted<T, K>(arr: T[], key: K, compFunc: KeyComparisonFunc<T, K>): number
{
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
    for (; ;)
    {
        // If there's no item between positions a and b
        if (b == a + 1)
        {
            comp = compFunc(key, aItem);
            if (comp < 0) return -1;
            if (comp == 0) return a;
            comp = compFunc(key, bItem);
            if (comp == 0) return b;
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
        if (comp > 0)
        {
            a = c;
            aItem = cItem;
        }
        // If the item must be placed before c, change the range
        else
        {
            b = c;
            bItem = cItem;
        }
    }
}

// ---- Configuration ---------------------------------------------------------------------------------------------------------

// The interface for the configuration data of a recycle bin
interface RecycleBinConfiguration
{
    name: string;                   // The display name for the recycle bin
    recycleFolderPaths: string[];   // The paths of the recycle folders to include in this recycle bin
}

// Configuration data imported from the JSON configuration file which path is specified as first argument
class Configuration
{
    public serverPort: number = 1337;                   // The port for the http server
    public recycleBins: RecycleBinConfiguration[] = []; // The recycle bins

    // Parses the specified JSON file as an instance of the Configuration file
    static Load(path: string): Configuration
    {
        // Load file data as UTF8 text.
        var fileData = fs.readFileSync(path).toString();

        // Parse JSON.
        var srcData = JSON.parse(fileData);

        // Create a new Configuration object and copy attributes.
        var config = new Configuration();

        // Copy properties.
        for (var prop in srcData)
        {
            // If this property does not exist, skip it.
            if (!(<Object>config).hasOwnProperty(prop))
                continue;

            // Otherwise copy the property value.
            (<Object>config)[prop] = srcData[prop];
        }

        // Okay.
        return config;
    }
}

// ---- Worker Classes --------------------------------------------------------------------------------------------------------

// Represents a recycled file
class RecycleBinEntry
{
    public pbin: number;        // The index of the physical bin
    public path: string;        // The absolute entry path
    public name: string;        // The entry name
    public relpath: string;     // The entry path, relative to the physical bin folder
    public isFolder: boolean;   // Is it a folder?
    public fileSize: number;    // The file size (if it's a file)
    public extension: string;   // The file extension (if it's a file)
    public deletedDate: Date;   // The deletion date in server time

    // Constructor
    constructor(pbin: number, root: string, relroot: string, stats: walk.Stats)
    {
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
    public static compByDateFunc(a: RecycleBinEntry, b: RecycleBinEntry): number
    {
        var aval = a.deletedDate.valueOf();
        var bval = b.deletedDate.valueOf();
        return bval - aval;
    }

    // A comparison function to sort items by deleted date
    public static compByDateKeyFunc(key: Date, item: RecycleBinEntry): number
    {
        var aval = key.valueOf();
        var bval = item.deletedDate.valueOf();
        return bval - aval;
    }

    // A comparison function to sort items by absolute path
    public static compByPathFunc(a: RecycleBinEntry, b: RecycleBinEntry): number
    {
        return a.path.localeCompare(b.path);
    }

    // A comparison function to sort items by absolute path
    public static compByPathKeyFunc(key: string, item: RecycleBinEntry): number
    {
        return key.localeCompare(item.path);
    }
}

// Represents a collection of entries
class RecycleBinEntryCollection
{
    public byDate: RecycleBinEntry[];  // All entries in reversed deleted date order
    public byPath: RecycleBinEntry[];  // All entries in absolute path order

    // Constructor.
    constructor()
    {
        this.byDate = [];
        this.byPath = [];
    }

    // Adds an entry to the collection
    public add(entry: RecycleBinEntry): void
    {
        var dateIndex = insertIndexSorted(this.byDate, entry, RecycleBinEntry.compByDateFunc);
        this.byDate.splice(dateIndex, 0, entry);
        var pathIndex = insertIndexSorted(this.byPath, entry, RecycleBinEntry.compByPathFunc);
        this.byPath.splice(pathIndex, 0, entry);
    }

    // Removes the specified entry from the collection
    public remove(entry: RecycleBinEntry): void
    {
        var dateIndex = this.byDate.indexOf(entry);
        if (dateIndex != -1) this.byDate.splice(dateIndex, 1);
        var pathIndex = indexOfSorted(this.byPath, entry.path, RecycleBinEntry.compByPathKeyFunc);
        if (pathIndex != -1) this.byPath.splice(pathIndex, 1);
    }

    // Finds the specified entry from its absolute path
    public find(path: string): RecycleBinEntry
    {
        var pathIndex = indexOfSorted(this.byPath, path, RecycleBinEntry.compByPathKeyFunc);
        if (pathIndex != -1)
            return this.byPath[pathIndex];
        else
            return null;
    }
}

// Represents the state of a recycle bin (physical or virtual)
enum RecycleBinState
{
    Normal,
    Scanning,
    Cleaning,
}

// Represents a physical recycle bin
class PhysicalRecycleBin
{
    public id: number;                          // The ID of the physical recycle bin
    public state: RecycleBinState;              // The current recycle bin state
    public owner: VirtualRecycleBin;            // The owner recycle bin
    public recycleDirPath: string;              // The path to the directory that contains recycled files
    public recycleDirBasePath: string;          // The path to the parent directory of recycleDirPath

    // Constructor
    constructor(id: number, owner: VirtualRecycleBin, recycleDirPath: string)
    {
        this.id = id;
        this.owner = owner;
        this.state = RecycleBinState.Normal;
        this.recycleDirPath = path.normalize(recycleDirPath);
        this.recycleDirBasePath = path.basename(recycleDirPath);
    }

    // Starts scanning the recycle bin
    public scan(callback?: (err?: Error) => void): void
    {
        if (this.state != RecycleBinState.Normal)
        {
            if (callback) callback(Error("Cannot start scanning a virtual recycle bin that is not in Normal state"));
            return;
        }

        // Start scanning.
        this.state = RecycleBinState.Scanning;

        // Enumerate files and folders.
        var walker = walk.walk(this.recycleDirPath,
            {
                followLinks: false,
            });
        walker.on('directories', (root, directoryStatsArray, next) =>
        {
            // Alter the root.
            var relroot = path.relative(this.recycleDirPath, root);

            // Add the directories as entries
            for (var i = 0; i < directoryStatsArray.length; i++)
            {
                var stats = directoryStatsArray[i];
                var entry = new RecycleBinEntry(this.id, root, relroot, stats);
                this.owner.entries.add(entry);
            }
            next();
        });
        walker.on('files', (root, fileStatsArray, next) =>
        {
            // Alter the root.
            var relroot = path.relative(this.recycleDirPath, root);

            // Add the files as entries
            for (var i = 0; i < fileStatsArray.length; i++)
            {
                var stats = fileStatsArray[i];
                var entry = new RecycleBinEntry(this.id, root, relroot, stats);
                this.owner.entries.add(entry);
            }
            next();
        });
        walker.on('end', () =>
        {
            this.state = RecycleBinState.Normal;
            if (callback) callback();
        });
    }
}

// Represents a virtual recycle bin
class VirtualRecycleBin
{
    public name: string;                                // The pretty name for this recycle bin
    public state: RecycleBinState;                      // The current recycle bin state
    public entries: RecycleBinEntryCollection;          // The collection of recycle bin entries
    public scanning: boolean;                           // Is this recycle bin doing its first scan?
    public physicalRecycleBins: PhysicalRecycleBin[];   // The list of physical recycle bins grouped in this virtual recycle bin

    // Constructor
    constructor(name: string)
    {
        this.name = name;
        this.state = RecycleBinState.Normal;
        this.entries = new RecycleBinEntryCollection();
        this.physicalRecycleBins = [];
    }

    // Adds a new physical recycle bin
    addPhysicalRecycleBin(path: string): PhysicalRecycleBin
    {
        var physicalRecycleBin = new PhysicalRecycleBin(this.physicalRecycleBins.length, this, path);
        this.physicalRecycleBins.push(physicalRecycleBin);
        return physicalRecycleBin;
    }

    // Starts scanning the physical recycle bins asynchronously to populate them
    scan(callback?: (err?: Error) => void): void
    {
        if (this.state != RecycleBinState.Normal)
        {
            if (callback) callback(Error("Cannot start scanning a virtual recycle bin that is not in Normal state"));
            return;
        }

        // Change state.
        this.state = RecycleBinState.Scanning;

        // Start scanning.
        async.eachSeries(
            this.physicalRecycleBins,
            (physicalRecycleBin, callback) => physicalRecycleBin.scan(callback),
            (err: Error) =>
            {
                this.state = RecycleBinState.Normal;
                if (callback)
                    callback(err);
            });
    }
}

// Manages the recycle bin system
class RecycleBinManager
{
    public virtualRecycleBins: VirtualRecycleBin[]; // The list of virtual recycle bins

    // Constructor
    constructor(config: Configuration)
    {
        this.virtualRecycleBins = [];

        // Create the virtual recycle bins.
        for (var i = 0; i < config.recycleBins.length; i++)
        {
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
    public start(callback?: (err?: Error) => void): void
    {
        async.eachSeries(
            this.virtualRecycleBins,
            (virtualRecycleBin, callback) => virtualRecycleBin.scan(callback),
            callback);
    }
}

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
app.get('/api/vbins', function (req, res)
{
    var response = [];
    for (var i = 0; i < manager.virtualRecycleBins.length; i++)
    {
        var vbin = manager.virtualRecycleBins[i];
        var vbinResponse = <any>{};
        vbinResponse.id = i;
        vbinResponse.name = vbin.name;
        vbinResponse.state = RecycleBinState[vbin.state];
        response.push(vbinResponse);
    }
    res.json(response);
});
app.get('/api/vbins/:id/entries', function (req, res)
{
    var id = parseInt(req.params.id);
    if (id == NaN || id < 0 || id >= manager.virtualRecycleBins.length)
    {
        res.send(500, 'invalid vbin id');
        return;
    }
    var vbin = manager.virtualRecycleBins[req.params.id];
    res.json(vbin.entries.byDate);
});

// Start it.
app.listen(config.serverPort);
