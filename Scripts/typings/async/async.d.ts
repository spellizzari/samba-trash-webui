// Type definitions for NodeJS module async v0.9.0
// Project: https://github.com/caolan/async
// Definitions by: Sebastien Pellizzari <https://github.com/spellizzari>

/// <reference path="../node/node.d.ts" />

declare module "async"
{
    export function each<T, E>(arr: T[], iterator: (item: T, callback: (err?: E) => void) => void, callback: (err?: E) => void): void;
    export function eachSeries<T, E>(arr: T[], iterator: (item: T, callback: (err?: E) => void) => void, callback: (err?: E) => void): void;
    export function eachLimit<T, E>(arr: T[], limit: number, iterator: (item: T, callback: (err?: E) => void) => void, callback: (err?: E) => void): void;

    export function map<I, O, E>(arr: I[], iterator: (item: I, callback: (err: E, transformed: O) => void) => void, callback: (err: E, results: O[]) => void): void;
    export function mapSeries<I, O, E>(arr: I[], iterator: (item: I, callback: (err: E, transformed: O) => void) => void, callback: (err: E, results: O[]) => void): void;
    export function mapLimit<I, O, E>(arr: I[], limit: number, iterator: (item: I, callback: (err: E, transformed: O) => void) => void, callback: (err: E, results: O[]) => void): void;

    export function filter<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (results: T[]) => void): void;
    export function filterSeries<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (results: T[]) => void): void;
    
    export function select<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (results: T[]) => void): void;
    export function selectSeries<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (results: T[]) => void): void;

    export function reject<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (results: T[]) => void): void;
    export function rejectSeries<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (results: T[]) => void): void;

    export function reduce<T, M, E>(arr: T[], memo: M, iterator: (memo: M, item: T, callback: (err: E, reduction: M) => void) => void, callback: (err: E, result: M) => void): void;
    export function reduceRight<T, M, E>(arr: T[], memo: M, iterator: (memo: M, item: T, callback: (err: E, reduction: M) => void) => void, callback: (err: E, result: M) => void): void;

    export function detect<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (result: T) => void): void;
    export function detectSeries<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (result: T) => void): void;

    export function sortBy<T, E>(arr: T[], iterator: (item: T, callback: (err: E, sortValue: any) => void) => void, callback: (err: E, results: T[]) => void): void;

    export function some<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (result: boolean) => void): void;
    export function any<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (result: boolean) => void): void;

    export function every<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (result: boolean) => void): void;
    export function all<T>(arr: T[], iterator: (item: T, callback: (truthValue: boolean) => void) => void, callback: (result: boolean) => void): void;

    export function concat<I, O, E>(arr: I[], iterator: (item: I, callback: (err: E, results: O[]) => void) => void, callback: (err: E, results: O[]) => void): void;
    export function concat<I, E>(arr: I[], iterator: (item: I, callback: (err: E, results: any) => void) => void, callback: (err: E, results: any) => void): void;
    export function concatSeries<I, O, E>(arr: I[], iterator: (item: I, callback: (err: E, results: O[]) => void) => void, callback: (err: E, results: O[]) => void): void;
    export function concatSeries<I, E>(arr: I[], iterator: (item: I, callback: (err: E, results: any) => void) => void, callback: (err: E, results: any) => void): void;

    export function series<T, E>(tasks: { (callback: (err: E, result: T) => void): void; }[], callback?: (err: E, results: T[]) => void): void;
    export function series<T, E>(tasks: any, callback?: (err: E, results: T[]) => void): void;
    export function series<E>(tasks: any, callback?: (err: E, results: any[]) => void): void;

    export function parallel<T, E>(tasks: { (callback: (err: E, result: T) => void): void; }[], callback?: (err: E, results: T[]) => void): void;
    export function parallel<T, E>(tasks: any, callback?: (err: E, results: T[]) => void): void;
    export function parallel<E>(tasks: any, callback?: (err: E, results: any[]) => void): void;
    
    export function parallelLimit<T, E>(tasks: { (callback: (err: E, result: T) => void): void; }[], limit: number, callback?: (err: E, results: T[]) => void): void;
    export function parallelLimit<T, E>(tasks: any, limit: number, callback?: (err: E, results: T[]) => void): void;
    export function parallelLimit<E>(tasks: any, limit: number, callback?: (err: E, results: any[]) => void): void;

    export function whilst<E>(test: () => boolean, fn: (callback: (err?: E) => void) => void, callback: (err?: E) => void): void;
    export function doWhilst<E>(test: () => boolean, fn: (callback: (err?: E) => void) => void, callback: (err?: E) => void): void;

    export function until<E>(test: () => boolean, fn: (callback: (err?: E) => void) => void, callback: (err?: E) => void): void;
    export function doUntil<E>(test: () => boolean, fn: (callback: (err?: E) => void) => void, callback: (err?: E) => void): void;

    export function forever<E>(fn: (callback: (err?: E) => void) => void, errback: (err?: E) => void): void;

    export function waterfall<T, E>(tasks: Function[], callback?: (err: E, result: T) => void): void;

    export function compose(...fns: Function[]): Function;
    export function seq(...fns: Function[]): Function;

    export function applyEach(fns: Function[], ...argsAndCallback: any[]): void;
    export function applyEachSeries(fns: Function[], ...argsAndCallback: any[]): void;

    export interface BaseQueue<T, E>
    {
        drain: () => void;
        empty: () => void;
        paused: boolean;
        started: boolean;
        saturated: () => void;
        concurrency: number;
        kill(): void;
        idle(): boolean;
        pause(): void;
        resume(): void;
        length(): number;
        running(): number;
    }

    export interface Queue<T, E> extends BaseQueue<T, E>
    {
        push(task: T, callback?: (err?: E) => void): void;
        push(tasks: T[], callbacks?: { (err?: E): void; }[]): void;
        unshift(task: T, callback?: (err?: E) => void): void;
    }

    export interface PriorityQueue<T, E> extends BaseQueue<T, E>
    {
        push(task: T, priority: number, callback?: (err?: E) => void): void;
        push(tasks: T[], priority: number, callbacks?: { (err?: E): void; }[]): void;
    }

    export function queue<T, E>(worker: (task: T, callback: (err?: E) => void) => void, concurrency: number): Queue<T, E>;
    export function priorityQueue<T, E>(worker: (task: T, callback: (err?: E) => void) => void, concurrency: number): PriorityQueue<T, E>;

    export interface Cargo<T, E>
    {
        empty: () => void;
        drain: () => void;
        payload: number;
        saturated: () => void;
        length(): number;
        push(task: T, callback?: (err?: E) => void): void;
        push(task: T[], callback?: (err?: E) => void[]): void;
    }

    export function cargo<T, E>(worker: (task: T, callback: (err?: E) => void) => void, payload?: number): Cargo<T, E>;

    export function auto<T, E>(tasks: Object, callback?: (err: E, results: T[]) => void): void;

    export function retry<T, E>(task: (callback: (err: E, results: T[]) => void, results: T[]) => void, callback?: (err: E, results: T[]) => void): void;
    export function retry<T, E>(times: number, task: (callback: (err: E, results: T[]) => void, results: T[]) => void, callback?: (err: E, results: T[]) => void): void;

    export function iterator(tasks: { (): void; }[]): () => () => void;

    export function apply<T, E>(func: Function, ...args: any[]): (callback: (err: E, result: T) => void) => void;

    export function nextTick(callback: () => void): void;

    export function times<T, E>(n: number, fn: (n: number, callback: (err: E, result: T) => void) => void, callback: (err: E, results: T[]) => void): void;
    export function timesSeries<T, E>(n: number, fn: (n: number, callback: (err: E, result: T) => void) => void, callback: (err: E, results: T[]) => void): void;

    export function memoize<F>(fn: F): F;
    export function memoize<I, O, E>(fn: (name: I, callback: (err: E, result: O) => void) => void, hasher?: (name: I) => any): (name: I, callback: (err: E, result: O) => void) => void;

    export function unmemoize(fn: Function): void;

    export function dir<F>(func: F, ...arguments: any[]): F;
    export function dir(func: Function, ...arguments: any[]): Function;

    export function noConflict(): void;
}