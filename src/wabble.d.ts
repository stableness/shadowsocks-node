declare module '@stableness/wabble/dist/extra.js' {





import { TcpNetConnectOpts, Socket } from 'net';

import {

    option as O,
    function as F,
    either as E,
    taskEither as TE,
    reader as Rd,
    readonlyNonEmptyArray as NA,

} from 'fp-ts';

import * as R from 'ramda';

import { Observable, MonoTypeOperatorFunction } from 'rxjs';

import pino from 'pino';





export function noop (): typeof F.constVoid;





export function rxTap <T> (fn: (arg: T) => void): MonoTypeOperatorFunction<T>;





export interface Config {

    readonly services: NA.ReadonlyNonEmptyArray<Service>;

    readonly servers: NA.ReadonlyNonEmptyArray<Remote>;

}





export function convert (obj: Object): Config;




interface Base {

    protocol: 'ss';

    host: string;
    port: number;

    key: Buffer;

}

interface Stream extends Base {
    cipher: {
        type: 'Stream';
        algorithm: string;
        keySize: number;
        ivLength: number,
    };
}

interface AEAD extends Base {
    cipher: {
        type: 'AEAD';
        algorithm: string;
        keySize: number;
        saltSize: number,
        nonceSize: number,
        tagSize: number,
    };
}

export type Remote = Stream | AEAD;





export function cryptoPairs (server: Remote, head: Uint8Array): {
    enc: NodeJS.ReadWriteStream,
    dec: NodeJS.ReadWriteStream,
};

export declare const cryptoPairsCE: (server: Remote) => (head: Uint8Array) => E.Either<Error, NonNullable<ReturnType<typeof cryptoPairs>>>;





export type Basic = Pick<URL, 'username' | 'password'>;





declare const logger: ReturnType<typeof pino>;

declare const logLevel: {

    on: Record<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent', boolean>,

};

export type Logging = typeof logging;

export declare const logging: { logger: typeof logger, logLevel: typeof logLevel };





export function tryCatchToError <A> (f: F.Lazy<Promise<A>>): TE.TaskEither<Error, A>





export declare const catchKToError: <A extends ReadonlyArray<unknown>, B> (fn: (...args: A) => Promise<B>) => (...args: A) => TE.TaskEither<Error, B>;





export function netConnectTo (opts: TcpNetConnectOpts): Socket;





export function socks5Handshake (host: string, port: number): Uint8Array;





export function errToIgnoresBy (code: string): boolean;





export interface Service {

    protocol: 'socks5';
    host: string;
    port: number;

    auth: O.Option<(info: Basic) => boolean>;

};

export declare const socks5Proxy: (service: Service) => Rd.Reader<Logging, Observable<{
    host: string,
    port: number,
    hook (...duplex: NodeJS.ReadWriteStream[]): Promise<void>,
    abort (): void,
}>>;





}

