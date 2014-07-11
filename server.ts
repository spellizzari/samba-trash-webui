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
    public name: string;        // The entry name
    public isFolder: boolean;   // Is it a folder?
    public fileSize: number;    // The file size (if it's a file)
    public extension: string;   // The file extension (if it's a file)
    public deletedDate: Date;   // The deletion date in server time
}

// Represents a collection of entries
class RecycleBinEntryCollection
{
    [path: string]: RecycleBinEntry;
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
    public state: RecycleBinState;              // The current recycle bin state
    public owner: VirtualRecycleBin;            // The owner recycle bin
    public entries: RecycleBinEntryCollection;  // The collection of entries in the recycle bin
    public recycleDirPath: string;              // The path to the directory that contains recycled files
    public recycleDirBasePath: string;          // The path to the parent directory of recycleDirPath

    // Constructor
    constructor(owner: VirtualRecycleBin, recycleDirPath: string)
    {
        this.owner = owner;
        this.entries = new RecycleBinEntryCollection();
        this.recycleDirPath = recycleDirPath;
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
        walker.on('directories', (root, fileStatsArray, next) =>
        {
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
    public scanning: boolean;                           // Is this recycle bin doing its first scan?
    public physicalRecycleBins: PhysicalRecycleBin[];   // The list of physical recycle bins grouped in this virtual recycle bin

    // Constructor
    constructor(name: string)
    {
        this.name = name;
        this.physicalRecycleBins = [];
    }

    // Adds a new physical recycle bin
    addPhysicalRecycleBin(path: string): PhysicalRecycleBin
    {
        var physicalRecycleBin = new PhysicalRecycleBin(this, path);
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

        // If we have physical recycle bins...
        if (this.physicalRecycleBins.length > 0)
        {
            // Start scanning.
            this.state = RecycleBinState.Scanning;

            async.series(this.physicalRecycleBins,
                (physicalRecycleBin, callback) =>
                {
                    physicalRecycleBin.scan(callback);
                },
                (error) =>
                {
                });

            function endOfScan(err?: Error)
            {
                // In case of error, stop here and propagate.
                if (err)
                {
                    This.state = RecycleBinState.Normal;
                    callback(err);
                    return;
                }

                // Process the next bin.
                binIndex++;
                if (binIndex < This.physicalRecycleBins.length)
                    This.physicalRecycleBins[binIndex].scan(endOfScan);
                else
                {
                    This.state = RecycleBinState.Normal;
                    if (callback)
                        callback();
                }
            }

            this.physicalRecycleBins[0].startScan(endOfScan);
        }
        else
        {
            if (callback)
                callback();
        }
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
    public start(callback?: (err?: string) => void): void
    {
        async.forEachSeries(this.virtualRecycleBins,
            (virtualRecycleBin, callback) =>
            {
                virtualRecycleBin.scan((err) =>
                {
                    callback(err ? new Error(err) : null, null);
                });
            }, (error) =>
            {
                if (callback)
                    callback(error ? error.message : null);
            });
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

// Create the Express app.
var app = express();

// Configure the server.
app.get('/api/vbins', function (req, res)
{
    var response = [];
    for (var i = 0; i < manager.virtualRecycleBins.length; i++)
    {
        var vbin = manager.virtualRecycleBins[i];
        var vbinResponse = <any>{};
        vbinResponse.name = vbin.name;
        vbinResponse.state = vbin.state;
        response.push(vbinResponse);
    }
    res.json(response);
});

// Start it.
app.listen(config.serverPort);
