declare module '@stableness/wabble/dist/extra.cjs' {





import { TcpNetConnectOpts, Socket } from 'net';

import {

    option as O,
    function as F,
    either as E,
    taskEither as TE,
    reader as RD,
    readonlyNonEmptyArray as RNEA,

} from 'fp-ts';

import * as R from 'ramda';

import { Observable } from 'rxjs';

import pino from 'pino';





export function noop (): typeof F.constVoid;





export interface Config {

    readonly services: RNEA.ReadonlyNonEmptyArray<Service>;

    readonly servers: RNEA.ReadonlyNonEmptyArray<Remote>;

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





export function cryptoPairs (server: Remote, head: Uint8Array): undefined | {
    enc: NodeJS.ReadWriteStream,
    dec: NodeJS.ReadWriteStream,
};

export declare const cryptoPairsC: (server: Remote) => (head: Uint8Array) => ReturnType<typeof cryptoPairs>;





export type Basic = Pick<URL, 'username' | 'password'>;





declare const logger: ReturnType<typeof pino>;

declare const logLevel: {

    on: Record<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent', boolean>,

};

export type Logging = typeof logging;

export declare const logging: { logger: typeof logger, logLevel: typeof logLevel };





export function tryCatchToError <A> (f: F.Lazy<Promise<A>>): TE.TaskEither<Error, A>





export function netConnectTo (opts: TcpNetConnectOpts): Socket;





export function socks5Handshake (host: string, port: number): Uint8Array;





export function errToIgnoresBy (code: string): boolean;





export interface Service {

    protocol: 'socks5';
    host: string;
    port: number;

    auth: O.Option<(info: Basic) => boolean>;

};

export declare const socks5Proxy: (service: Service) => RD.Reader<Logging, Observable<{
    host: string,
    port: number,
    hook (...duplex: NodeJS.ReadWriteStream[]): Promise<void>,
}>>;





}

