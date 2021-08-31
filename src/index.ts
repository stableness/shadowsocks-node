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
    chainSS,
    catchKToError,
    logging,
    convert,
    errToIgnoresBy,

} from '@stableness/wabble/dist/extra.js';

import type { Config } from '@stableness/wabble/dist/extra.js';

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

    rxTap(F.flow(
        picking.protocol_host_port,
        console.info,
    )),

    Rx.map(socks5Proxy),

    Rx.switchMap(F.apply(logging)),

    Rx.connect(Rx.pipe(

        Rx.map(({ host, port, abort, hook }) => ({

            host,
            port,
            abort,
            hook: catchKToError(hook),
            logger: logger.child({ host, port }),

        })),

        Rx.withLatestFrom(remote$, (opts, remote) => F.pipe(

            chainSS (remote) (opts),
            TE.apFirst(TE.fromIO(() => opts.logger.info('Proxy'))),
            TE.mapLeft(err => ({ err, log: opts.logger })),

        )),

        Rx.mergeMap(task => task()),

        rxTap(E.mapLeft(({ err, log }) => {

            if (err instanceof Error) {

                const code = R.propOr('unknown', 'code', err) as string;

                if (errToIgnoresBy(code)) {
                    logLevel.on.trace && log.trace(err);
                    return;
                }

            }

            log.error(err as any);

        })),

        Rx.ignoreElements(),

        Rx.retry({ count: 5, resetOnSuccess: true }),

    )),

);





export function load ({ local = '', remote = '', method: alg, key, quiet = false }: Options) {

    if (R.not(R.all(Boolean, [ local, remote ]))) {
        return console.error(`local [${ local }] or remote [${ remote }] not valid`);
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
            alg,

            uri: R.cond([
                [ R.startsWith('ss://'), R.identity        ],
                [                   R.T, R.concat('ss://') ],
            ])(remote),

        }),

        rules: { direct: [], proxy: [], reject: [] },

    }));

}

