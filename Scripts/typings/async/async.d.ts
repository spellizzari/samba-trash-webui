// Type definitions for NodeJS module async v0.9.0
// Project: https://github.com/caolan/async
// Definitions by: Sebastien Pellizzari <https://github.com/spellizzari>

/// <reference path="../node/node.d.ts" />

declare module "async"
{
    import events = require('events');

    // Callbacks

    export interface Callback<E> { (err?: E): void; }
    export interface FilterCallback { (truthValue: boolean): void; }
    export interface SortCallback<E> { (err: E, sortValue: any): void; }
    export interface ResultCallback<T, E> { (err: E, result: T): void; }
    export interface ReduceCallback<T, E> { (err: E, reduction: T): void; }
    export interface WaterfallCallback<E> { (err: E, ...args: any[]): void; }
    export interface ResultsCallback<T, E> { (err: E, results: T[]): void; }
    export interface ResultOnlyCallback<T> { (result: T): void; }
    export interface ResultsOnlyCallback<T> { (results: T[]): void; }
    export interface TransformCallback<T, E> { (err: E, transformed: T): void; }
    
    // Iterators

    export interface Iterator<T, E> { (item: T, callback: Callback<E>): void; }
    export interface FilterIterator<T> { (item: T, callback: FilterCallback): void; }
    export interface SortIterator<T, E> { (item: T, callback: SortCallback<E>): void; }
    export interface ConcatIterator<T, E> { (item: T, callback: ResultsCallback<T, E>): void; }
    export interface ReduceInterator<T, M, E> { (memo: M, item: T, callback: ReduceCallback<M, E>): void; }
    export interface TransformIterator<I, O, E> { (item: I, callback: TransformCallback<O, E>): void; }

    // Other Functions

    export interface Action { (): void; }
    export interface Task<T, E> { (callback: ResultCallback<T, E>): void; }
    export interface TestFunction { (): boolean; }
    export interface IteratorFunction { (): Action; }
    export interface ActionFunction<E> { (callback: Callback<E>): void; }
    export interface RetryFunction<T, E> { (callback: ResultsCallback<T, E>, results: T[]): void; }
    export interface TimesFunction<T, E> { (n: number, callback: ResultCallback<T, E>): void; }
    export interface WorkerFunction<T, E> { (task: T, callback: Callback<E>): void; }
    export interface MemoizeFunction<I, O, E> { (name: I, callback: ResultCallback<O, E>): void; }
    export interface MemoizeHashFunction<I> { (name: I): any; }

    // Collections

    export function each<T, E>(arr: T[], iterator: Iterator<T, E>, callback: Callback<E>): void;
    export function eachSeries<T, E>(arr: T[], iterator: Iterator<T, E>, callback: Callback<E>): void;
    export function eachLimit<T, E>(arr: T[], limit: number, iterator: Iterator<T, E>, callback: Callback<E>): void;

    export function map<I, O, E>(arr: I[], iterator: TransformIterator<I, O, E>, callback: ResultsCallback<O, E>): void;
    export function mapSeries<I, O, E>(arr: I[], iterator: TransformIterator<I, O, E>, callback: ResultsCallback<O, E>): void;
    export function mapLimit<I, O, E>(arr: I[], limit: number, iterator: TransformIterator<I, O, E>, callback: ResultsCallback<O, E>): void;

    export function filter<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultsOnlyCallback<T>): void;
    export function filterSeries<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultsOnlyCallback<T>): void;
    
    export function select<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultsOnlyCallback<T>): void;
    export function selectSeries<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultsOnlyCallback<T>): void;

    export function reject<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultsOnlyCallback<T>): void;
    export function rejectSeries<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultsOnlyCallback<T>): void;

    export function reduce<T, M, E>(arr: T[], memo: M, iterator: ReduceInterator<T, M, E>, callback: ResultCallback<M, E>): void;
    export function reduceRight<T, M, E>(arr: T[], memo: M, iterator: ReduceInterator<T, M, E>, callback: ResultCallback<M, E>): void;

    export function detect<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultOnlyCallback<T>): void;
    export function detectSeries<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultOnlyCallback<T>): void;

    export function sortBy<T, E>(arr: T[], iterator: SortIterator<T, E>, callback: ResultsCallback<T, E>): void;

    export function some<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultOnlyCallback<boolean>): void;
    export function any<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultOnlyCallback<boolean>): void;

    export function every<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultOnlyCallback<boolean>): void;
    export function all<T>(arr: T[], iterator: FilterIterator<T>, callback: ResultOnlyCallback<boolean>): void;

    export function concat<T, E>(arr: T[], iterator: ConcatIterator<T, E>, callback: ResultsCallback<T, E>): void;
    export function concatSeries<T, E>(arr: T[], iterator: ConcatIterator<T, E>, callback: ResultsCallback<T, E>): void;

    export function series<T, E>(tasks: Task<T, E>[], callback?: ResultsCallback<T, E>): void;
    export function series<T, E>(tasks: any, callback?: ResultsCallback<T, E>): void;

    export function parallel<T, E>(tasks: Task<T, E>[], callback?: ResultsCallback<T, E>): void;
    export function parallel<T, E>(tasks: any, callback?: ResultsCallback<T, E>): void;
    
    export function parallelLimit<T, E>(tasks: Task<T, E>[], limit: number, callback?: ResultsCallback<T, E>): void;
    export function parallelLimit<T, E>(tasks: any, limit: number, callback?: ResultsCallback<T, E>): void;

    export function whilst<E>(test: TestFunction, fn: ActionFunction<E>, callback: Callback<E>): void;
    export function doWhilst<E>(test: TestFunction, fn: ActionFunction<E>, callback: Callback<E>): void;

    export function until<E>(test: TestFunction, fn: ActionFunction<E>, callback: Callback<E>): void;
    export function doUntil<E>(test: TestFunction, fn: ActionFunction<E>, callback: Callback<E>): void;

    export function forever<E>(fn: ActionFunction<E>, errback: Callback<E>): void;

    export function waterfall<T, E>(tasks: Function[], callback?: ResultCallback<T, E>): void;

    export function compose(...fns: Function[]): Function;
    export function seq(...fns: Function[]): Function;

    export function applyEach(fns: Function[], ...argsAndCallback: any[]): void;
    export function applyEachSeries(fns: Function[], ...argsAndCallback: any[]): void;

    export interface BaseQueue<T, E>
    {
        drain: Action;
        empty: Action;
        paused: boolean;
        started: boolean;
        saturated: Action;
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
        push(task: T, callback?: Callback<E>): void;
        push(tasks: T[], callbacks?: Callback<E>[]): void;
        unshift(task: T, callback?: Callback<E>): void;
    }

    export interface PriorityQueue<T, E> extends BaseQueue<T, E>
    {
        push(task: T, priority: number, callback?: Callback<E>): void;
        push(tasks: T[], priority: number, callbacks?: Callback<E>[]): void;
    }

    export function queue<T, E>(worker: WorkerFunction<T, E>, concurrency: number): Queue<T, E>;
    export function priorityQueue<T, E>(worker: WorkerFunction<T, E>, concurrency: number): PriorityQueue<T, E>;

    export interface Cargo<T, E>
    {
        empty: Action;
        drain: Action;
        payload: number;
        saturated: Action;
        length(): number;
        push(task: T, callback?: Callback<E>): void;
        push(task: T[], callback?: Callback<E>[]): void;
    }

    export function cargo<T, E>(worker: WorkerFunction<T, E>, payload?: number): Cargo<T, E>;

    export function auto<T, E>(tasks: Object, callback?: ResultsCallback<T, E>): void;

    export function retry<T, E>(task: RetryFunction<T, E>, callback?: ResultsCallback<T, E>): void;
    export function retry<T, E>(times: number, task: RetryFunction<T, E>, callback?: ResultsCallback<T, E>): void;

    export function iterator(tasks: Action[]): IteratorFunction;

    export function apply<T, E>(func: Function, ...args: any[]): Task<T, E>;

    export function nextTick(callback: Action): void;

    export function times<T, E>(n: number, fn: TimesFunction<T, E>, callback: ResultsCallback<T, E>): void;
    export function timesSeries<T, E>(n: number, fn: TimesFunction<T, E>, callback: ResultsCallback<T, E>): void;

    export function memoize<F>(fn: F): F;
    export function memoize<I, O, E>(fn: MemoizeFunction<I, O, E>, haser?: MemoizeHashFunction<I>): MemoizeFunction<I, O, E>;

    export function unmemoize(fn: Function): void;

    export function dir<F>(func: F, ...arguments: any[]): F;
    export function dir(func: Function, ...arguments: any[]): Function;

    export function noConflict(): void;
}