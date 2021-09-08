import {

    io,
    ioEither as IoE,
    function as F,
    option as O,
    reader as Rd,
    random as Rnd,
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
    BaseURI,

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





export const load = loadGen (config$, runner$);

export function loadGen (
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

            NA.fromReadonlyArray,

        );

        const subscribe = F.pipe(

            opts.subscribe,

            A.filterMap(readOptionalString),

            A.map(endpoint => ({
                endpoint,
                refresh: opts.refresh * 1000,
                base64: true,
            })),

            A.map(F.flow(
                crawlRowsStartsBy('ss://'),
                Rx.catchError(F.constant(Rx.EMPTY)),
                Rx.map(NA.map(R.objOf('uri'))),
            )),

            NA.fromReadonlyArray,

            O.map(NA.unprepend),

            O.map(([ head, tail ]) => Rx.combineLatest([ head, ...tail ])),

        );

        return run(F.pipe(

            opts.local,

            A.filterMap(readOptionalString),

            A.map(R.cond([
                [ R.startsWith('socks5://'), R.identity                   ],
                [         R.startsWith(':'), R.concat('socks5://0.0.0.0') ],
                [                       R.T, R.concat('socks5://')        ],
            ])),

            A.map(R.objOf('uri')),

            NA.fromReadonlyArray,

            IoE.fromOption(() => new Error('empty local address')),

            IoE.chainIOK(services => () => F.pipe(

                Rd.asks(F.flow(
                    rxOf,
                    Rx.map(convert as Rd.Reader<unknown, Config>),
                )),

                Rd.local((servers: NA.ReadonlyNonEmptyArray<BaseURI>) => ({

                    servers,

                    services,

                    rules: { direct: [], proxy: [], reject: [] },

                })),

            )),

            IoE.chain(make => F.pipe(

                remote,

                O.altW(() => O.of(A.empty)),

                O.chain(fst => F.pipe(

                    subscribe,

                    O.map(Rx.pipe(

                        Rx.throwIfEmpty(),

                        Rx.map(NA.flatten),

                        Rx.map(snd => NA.concat (snd) (fst)),

                        Rx.catchError(err => {
                            logger.error(err, 'crawler fails');
                            return Rx.EMPTY;
                        }),

                        A.isNonEmpty(fst)
                            ? Rx.startWith(fst)
                            : Rx.identity
                        ,

                    )),

                )),

                O.alt(() => O.map (rxOf) (remote)),

                O.map(obs$ => IoE.fromIO(() => {

                    return obs$.pipe(
                        Rx.mergeMap(make),
                    ).subscribe(config);

                })),

                IoE.fromOption(() => new Error('no remote nor subscription')),

                IoE.flatten,

            )),

            IoE.chainIOK(() => () => {

                return runner.subscribe({
                    error (err) {
                        logger.error(err, 'runner rails');
                    },
                });

            }),

            IoE.orLeft(F.flow(
                io.of,
                io.chainFirst(err => () => {
                    logger.error(E.toError(err), 'bootstrapping fails');
                }),
            )),

        ));

    };

}

