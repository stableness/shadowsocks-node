import {

    either as E,
    io as IO,
    taskEither as TE,
    pipeable as P,
    function as F,
    readonlyNonEmptyArray as RNEA,

} from 'fp-ts';

import * as R from 'ramda';

import * as Rx from 'rxjs';
import * as o from 'rxjs/operators';

import { bind } from 'proxy-bind';

import {

    socks5Proxy,
    socks5Handshake,
    cryptoPairsC,
    netConnectTo,
    logging,
    convert,
    noop,
    tryCatchToError,
    errToIgnoresBy,

} from '@stableness/wabble/dist/extra.cjs';

import type { Remote, Config } from '@stableness/wabble/dist/extra.cjs';

import type { Options } from './bin';





const { logLevel, logger } = logging;





const picking = {

    host_port: R.pick([ 'host', 'port' ]),

    protocol_host_port: R.pick([ 'protocol', 'host', 'port' ]),

    type_algorithm: R.pick([ 'type', 'algorithm' ]),

};





const config$ = new Rx.ReplaySubject<Config>(1);



const local$ = config$.pipe(
    o.pluck('services'),
    o.map(RNEA.head),
);



const remote$ = config$.pipe(
    o.pluck('servers'),
    o.map(RNEA.head),
    o.shareReplay({ bufferSize: 1, refCount: false }),
);



const runner$ = local$.pipe(

    o.tap(R.o(console.info, picking.protocol_host_port)),

    o.switchMap(service => socks5Proxy (service) (logging)),

    o.publish(Rx.pipe(

        o.map(({ host, port, hook }) => {

            const log = logger.child({ host, port });

            return { host, port, hook, log };

        }),

        o.withLatestFrom(remote$, (opts, remote) => {

            const task = F.pipe(
                chain(opts, remote),
                TE.apFirst(TE.fromIO(() => opts.log.info('Proxy'))),
            );

            return { task, log: opts.log };

        }),

        o.flatMap(async ({ task, log }) => P.pipe(
            await task(),
            E.mapLeft(err => ({ err, log })),
        )),

        o.tap(E.fold(({ err, log }) => {

            if (err instanceof Error) {

                const code = R.propOr('unknown', 'code', err) as string;

                if (errToIgnoresBy(code)) {
                    logLevel.on.trace && log.trace(err);
                    return;
                }

            }

            log.error(err as any);

        }, F.constVoid)),

        o.ignoreElements(),

        o.retryWhen(Rx.pipe(o.delay(5000))),

    )),

);





type Opts = Rx.ObservedValueOf<ReturnType<ReturnType<typeof socks5Proxy>>> & {
    log: typeof logger,
};

function chain ({ host, port, hook, log }: Opts, remote: Remote) {

    return P.pipe(

        IO.of(socks5Handshake(host, port).subarray(3)),
        IO.map(cryptoPairsC(remote)),
        IO.map(E.fromNullable(Error('Has no crypto to perform'))),

        TE.fromIOEither,

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

        TE.chain(({ enc, dec }) => tryCatchToError(() => {
            return hook(enc, netConnectTo(picking.host_port(remote)), dec);
        })),

        TE.mapLeft(R.tap(() => hook())),

    );

}





export function load ({ local = '', remote = '', method = '', key = '', quiet = false }: Options) {

    if (R.not(R.all(Boolean, [ local, remote, key ]))) {
        return console.error(`local [${ local }] or remote [${ remote }] or key [${ key }] not valid`);
    }

    if (quiet === true) {
        logger.level = 'silent';
    }

    runner$.subscribe(noop, bind(logger).error);

    config$.next(convert({

        services: RNEA.of({

            uri: R.cond([
                [ R.startsWith('socks5://'), R.identity                   ],
                [         R.startsWith(':'), R.concat('socks5://0.0.0.0') ],
                [                       R.T, R.concat('socks5://')        ],
            ])(local),

        }),

        servers: RNEA.of({

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

