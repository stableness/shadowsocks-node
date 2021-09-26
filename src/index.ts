import {

    io,
    ioEither as IoE,
    option as O,
    reader as Rd,
    random as Rnd,
    function as F,
    either as E,
    taskEither as TE,
    readonlyArray as A,
    readonlyNonEmptyArray as NA,

} from 'fp-ts';

import * as R from 'ramda';

import * as Rx from 'rxjs';

import {

    run,
    rxOf,
    rxTap,
    socks5Proxy,
    chainSS,
    catchKToError,
    logging,
    convert,
    errToIgnoresBy,
    readOptionalString,
    crawlRowsStartsBy,
    unsafeUnwrapE,
    ErrorWithCode,

} from '@stableness/wabble/dist/extra.js';

import type { Config, BaseURI } from '@stableness/wabble/dist/extra.js';

import type { Options } from './bin';





const { logLevel, logger } = logging;





const picking = {

    host_port: R.pick([ 'host', 'port' ]),

    protocol_host_port: R.pick([ 'protocol', 'host', 'port' ]),

    type_algorithm: R.pick([ 'type', 'algorithm' ]),

};





const config$ = new Rx.ReplaySubject<Config>(1);



const local$ = config$.pipe(
    Rx.first(),
    Rx.pluck('services'),
);



const remote$ = config$.pipe(
    Rx.pluck('servers'),
    Rx.map(Rnd.randomElem),
);



const runner$ = local$.pipe(

    rxTap(NA.map(F.flow(
        picking.protocol_host_port,
        console.info,
    ))),

    Rx.map(F.flow(
        Rd.traverseArray(socks5Proxy),
        Rd.map(services => Rx.merge(...services)),
    )),

    Rx.switchMap(F.apply(logging)),

    Rx.connect(Rx.pipe(

        Rx.map(({ host, port, abort, hook }) => ({

            host,
            port,
            abort,
            hook: catchKToError(hook),
            logger: logger.child({ host, port }),

        })),

        Rx.withLatestFrom(remote$, (opts, random) => F.pipe(

            chainSS (random()) (opts),

            TE.apFirst(TE.fromIO(() => opts.logger.info('Proxy'))),

            TE.mapLeft(err => ({ err, log: opts.logger })),

        )),

        Rx.mergeMap(run),

        rxTap(E.mapLeft(({ err, log }) => {

            if (err instanceof Error) {

                const code: string = R.propOr('unknown', 'code', err);

                if (errToIgnoresBy(code)) {
                    logLevel.on.trace && log.trace(err);
                    return;
                }

            }

            log.error(err);

        })),

        Rx.ignoreElements(),

        Rx.retry({ count: 5, resetOnSuccess: true }),

    )),

);





export const load = loadBy(config$, runner$);

export function loadBy (
        config: Rx.Subject<Config>,
        runner: Rx.Observable<never>,
) {

    return function (opts: Options) {

        if (opts.quiet === true) {
            logger.level = 'silent';
        }

        const remote = F.pipe(

            opts.remote,

            A.filterMap(readOptionalString),

            A.map(uri => ({
                uri,
                key: opts.key,
                alg: opts.method,
            } as BaseURI)),

        );

        const subscribe = F.pipe(

            opts.subscribe,

            A.filterMap(readOptionalString),

            A.map(endpoint => ({
                endpoint,
                retry: 0,
                refresh: 0,
                base64: true,
                timeout: 5_000,
            })),

            A.map(F.flow(
                crawlRowsStartsBy('ss://'),
                Rx.map(A.map(R.objOf('uri'))),
                Rx.catchError(() => Rx.of(A.empty)),
            )),

            NA.fromReadonlyArray,

            O.match(

                F.constant(Rx.EMPTY),

                arr => Rx.of(arr).pipe(

                    Rx.repeatWhen(Rx.delay(opts.refresh * 1_000)),

                    Rx.switchMap(o => Rx.from(o).pipe(

                        Rx.mergeAll(),

                        Rx.scan((acc, x) => A.concat (x) (acc), remote),

                    )),

                ),

            ),

            Rx.startWith(remote),

            Rx.filter(A.isNonEmpty),

            Rx.throwIfEmpty(() => new ErrorWithCode('EMPTY')),

            Rx.timeout({
                first: 6_000,
                with () {
                    return Rx.throwError(() => new ErrorWithCode('TIMEOUT'));
                },
            }),

            Rx.tap({
                error (err) {

                    if (err?.code === 'EMPTY') {
                        logger.error(err, 'no remote nor subscription');
                    }

                    if (err?.code === 'TIMEOUT') {
                        logger.error(err, 'init timeout');
                    }

                },
            }),

        );

        return F.pipe(

            opts.local,

            A.filterMap(readOptionalString),

            A.map(R.cond([
                [ R.startsWith('socks5://'), R.identity                   ],
                [         R.startsWith(':'), R.concat('socks5://0.0.0.0') ],
                [                       R.T, R.concat('socks5://')        ],
            ])),

            A.map(R.objOf('uri')),

            NA.fromReadonlyArray,

            O.map(services => F.pipe(

                Rd.asks(F.flow(
                    rxOf,
                    Rx.map(convert),
                )),

                Rd.local((servers: NA.ReadonlyNonEmptyArray<BaseURI>) => ({

                    servers,

                    services,

                    rules: { direct: [], proxy: [], reject: [] },

                })),

            )),

            E.fromOption(() => new Error('empty local address')),

            E.map(make => subscribe.pipe(

                Rx.mergeMap(make),

                Rx.map(R.unless(

                    F.constant(opts.enable_deprecated_cipher === true),

                    R.over(R.lensProp('servers'), F.flow(

                        NA.filter(({ cipher }) => cipher.type === 'AEAD'),
                        E.fromOption(() => new Error('empty AEAD ciphers')),
                        unsafeUnwrapE,

                    )),

                )),

            )),

            IoE.fromEither,

            IoE.chain(conf => F.pipe(

                IoE.fromIO(() => runner.subscribe({
                    error (err) {
                        logger.error(err, 'runner fails');
                    },
                })),

                IoE.chainFirstIOK(sub => () => {
                    sub.add(conf.subscribe(config));
                }),

            )),

            IoE.orLeft(F.flow(
                io.of,
                io.chainFirst(err => () => {
                    logger.error(E.toError(err), 'bootstrapping fails');
                }),
            )),

        );

    };

}

