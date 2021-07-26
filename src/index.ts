import {

    either as E,
    taskEither as TE,
    function as F,
    readonlyNonEmptyArray as NA,

} from 'fp-ts';

import * as R from 'ramda';

import * as Rx from 'rxjs';

import {

    rxTap,
    socks5Proxy,
    socks5Handshake,
    cryptoPairsCE,
    catchKToError,
    netConnectTo,
    logging,
    convert,
    errToIgnoresBy,

} from '@stableness/wabble/dist/extra.js';

import type { Remote, Config } from '@stableness/wabble/dist/extra.js';

import type { Options } from './bin';





const { logLevel, logger } = logging;





const picking = {

    host_port: R.pick([ 'host', 'port' ]),

    protocol_host_port: R.pick([ 'protocol', 'host', 'port' ]),

    type_algorithm: R.pick([ 'type', 'algorithm' ]),

};





const config$ = new Rx.ReplaySubject<Config>(1);



const local$ = config$.pipe(
    Rx.pluck('services'),
    Rx.map(NA.head),
);



const remote$ = config$.pipe(
    Rx.pluck('servers'),
    Rx.map(NA.head),
    Rx.shareReplay({ bufferSize: 1, refCount: false }),
);



const runner$ = local$.pipe(

    rxTap(R.o(console.info, picking.protocol_host_port)),

    Rx.switchMap(service => socks5Proxy (service) (logging)),

    Rx.connect(Rx.pipe(

        Rx.map(({ host, port, abort, hook }) => ({

            host,
            port,
            abort,
            hook: catchKToError(hook),
            log: logger.child({ host, port }),

        })),

        Rx.withLatestFrom(remote$, (opts, remote) => {

            const task = F.pipe(
                chain(opts, remote),
                TE.apFirst(TE.fromIO(() => opts.log.info('Proxy'))),
            );

            return { task, log: opts.log };

        }),

        Rx.mergeMap(async ({ task, log }) => F.pipe(
            await task(),
            E.mapLeft(err => ({ err, log })),
        )),

        rxTap(E.fold(({ err, log }) => {

            if (err instanceof Error) {

                const code = R.propOr('unknown', 'code', err) as string;

                if (errToIgnoresBy(code)) {
                    logLevel.on.trace && log.trace(err);
                    return;
                }

            }

            log.error(err as any);

        }, F.constVoid)),

        Rx.ignoreElements(),

        Rx.retry({ count: 5, resetOnSuccess: true }),

    )),

);




type Proxies = Rx.ObservedValueOf<ReturnType<ReturnType<typeof socks5Proxy>>>;

type Opts = Omit<Proxies, 'hook'> & {
    log: typeof logger,
    hook: (...args: Parameters<Proxies['hook']>) => TE.TaskEither<Error, void>,
};

function chain ({ host, port, hook, abort, log }: Opts, remote: Remote) {

    return F.pipe(

        TE.rightIO(() => socks5Handshake(host, port).subarray(3)),

        TE.chainEitherK(cryptoPairsCE(remote)),

        TE.mapLeft(R.tap(abort)),

        TE.apFirst(TE.fromIO(() => {

            if (R.not(logLevel.on.trace)) {
                return;
            }

            const merge = R.converge(R.mergeLeft, [
                picking.protocol_host_port,
                R.o(picking.type_algorithm, R.prop('cipher')),
            ]);

            log.child({ proxy: merge(remote) }).trace('Proxy');

        })),

        TE.chain(({ enc, dec }) => {
            return hook(enc, netConnectTo(picking.host_port(remote)), dec);
        }),

    );

}





export function load ({ local = '', remote = '', method = '', key = '', quiet = false }: Options) {

    if (R.not(R.all(Boolean, [ local, remote, key ]))) {
        return console.error(`local [${ local }] or remote [${ remote }] or key [${ key }] not valid`);
    }

    if (quiet === true) {
        logger.level = 'silent';
    }

    runner$.subscribe({
        error (e) {
            logger.error(e);
        },
    });

    config$.next(convert({

        services: NA.of({

            uri: R.cond([
                [ R.startsWith('socks5://'), R.identity                   ],
                [         R.startsWith(':'), R.concat('socks5://0.0.0.0') ],
                [                       R.T, R.concat('socks5://')        ],
            ])(local),

        }),

        servers: NA.of({

            key,
            alg: method || 'chacha20-ietf-poly1305',

            uri: R.cond([
                [ R.startsWith('ss://'), R.identity        ],
                [                   R.T, R.concat('ss://') ],
            ])(remote),

        }),

        rules: { direct: [], proxy: [], reject: [] },

    }));

}

