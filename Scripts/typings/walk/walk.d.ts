// Type definitions for NodeJS module walk v2.3.3
// Project: https://github.com/coolaj86/node-walk
// Definitions by: Sebastien Pellizzari <https://github.com/spellizzari>

/// <reference path="../node/node.d.ts" />

declare module "walk"
{
    import events = require('events');

    export interface Stats
    {
        type: string;
        name: string;
        error: any;
    }

    export interface Listeners
    {
        end?: () => void;
        names?: (root: string, nodeNamesArray: string[]) => void;

        node?: (root: string, nodeStats: Stats, next: () => void) => void;
        nodes?: (root: string, nodeStatsArray: Stats[], next: () => void) => void;

        FIFO?: (root: string, stats: Stats, next: () => void) => void;
        FIFOs?: (root: string, statsArray: Stats[], next: () => void) => void;

        file?: (root: string, fileStats: Stats, next: () => void) => void;
        files?: (root: string, fileStatsArray: Stats[], next: () => void) => void;

        socket?: (root: string, stats: Stats, next: () => void) => void;
        sockets?: (root: string, statsArray: Stats[], next: () => void) => void;

        errors?: (root: string, nodeStatsArray: Stats[], next: () => void) => void;
        nodeError?: (root: string, nodeStats: Stats, next: () => void) => void;
        directoryError?: (root: string, directoryStats: Stats, next: () => void) => void;

        directory?: (root: string, directoryStats: Stats, next: () => void) => void;
        directories?: (root: string, dirStatsArray: Stats[], next: () => void) => void;

        blockDevice?: (root: string, stats: Stats, next: () => void) => void;
        blockDevices?: (root: string, statsArray: Stats[], next: () => void) => void;

        symbolicLink?: (root: string, fileStats: Stats, next: () => void) => void;
        symbolicLinks?: (root: string, fileStatsArray: Stats[], next: () => void) => void;

        characterDevice?: (root: string, stats: Stats, next: () => void) => void;
        characterDevices?: (root: string, statsArray: Stats[], next: () => void) => void;
    }

    export interface Options
    {
        filters?: string[];
        listeners?: Listeners;
        followLinks?: boolean;
    }

    export class Walker extends events.EventEmitter
    {
        on(event: string, listener: Function): events.EventEmitter;

        on(event: 'end', listener: () => void): events.EventEmitter;
        on(event: 'names', listener: (root: string, nodeNamesArray: string[]) => void): events.EventEmitter;

        on(event: 'node', listener: (root: string, nodeStats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'nodes', listener: (root: string, nodeStatsArray: Stats[], next: () => void) => void): events.EventEmitter;
        
        on(event: 'FIFO', listener: (root: string, stats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'FIFOs', listener: (root: string, statsArray: Stats[], next: () => void) => void): events.EventEmitter;

        on(event: 'file', listener: (root: string, fileStats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'files', listener: (root: string, fileStatsArray: Stats[], next: () => void) => void): events.EventEmitter;

        on(event: 'socket', listener: (root: string, stats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'sockets', listener: (root: string, statsArray: Stats[], next: () => void) => void): events.EventEmitter;

        on(event: 'errors', listener: (root: string, nodeStatsArray: Stats[], next: () => void) => void): events.EventEmitter;
        on(event: 'nodeError', listener: (root: string, nodeStats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'directoryError', listener: (root: string, directoryStats: Stats, next: () => void) => void): events.EventEmitter;

        on(event: 'directory', listener: (root: string, directoryStats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'directories', listener: (root: string, dirStatsArray: Stats[], next: () => void) => void): events.EventEmitter;

        on(event: 'blockDevice', listener: (root: string, stats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'blockDevices', listener: (root: string, statsArray: Stats[], next: () => void) => void): events.EventEmitter;

        on(event: 'symbolicLink', listener: (root: string, fileStats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'symbolicLinks', listener: (root: string, fileStatsArray: Stats[], next: () => void) => void): events.EventEmitter;

        on(event: 'characterDevice', listener: (root: string, stats: Stats, next: () => void) => void): events.EventEmitter;
        on(event: 'characterDevices', listener: (root: string, statsArray: Stats[], next: () => void) => void): events.EventEmitter;

        pause(): void;
        resume(): void;
    }

    export function walk(path: string, opts: Options): Walker;
    export function walkSync(path: string, opts: Options): Walker;
}