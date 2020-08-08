// @ts-check

import * as R from 'ramda';





const { OUT = './dist', BUILD = 'dev' } = process.env;

export const logs = R.tap(console.log);
export const path = R.compose(R.replace(/\/\/+/g, '/'), R.join('/'));
export const dist = R.compose(path, R.prepend(OUT), R.of, R.trim);
export const list = R.compose(R.filter(Boolean), R.split(/[,|;]|\s+/g), R.trim);

export const suffix = R.useWith(R.replace('.js'), [ R.concat('.'), R.identity ]);

export const extendsBuiltin = R.compose(list, R.concat(`
    | http | https  | tls | crypto | net | stream | buffer |
    | util | events | url | assert | fs  | vm     | os     |
`));

const devOrProd = R.partialRight(R.ifElse, [ R.identity, R.empty ]);
/** @type { <T> (v: T) => T } */
// @ts-ignore
const dev = devOrProd(R.always(BUILD !== 'prod'));
/** @type { <T> (v: T) => T } */
// @ts-ignore
const prod = devOrProd(R.always(BUILD === 'prod'));

const common = {
    format: 'cjs',
    exports: 'named',
    preferConst: true,
    interop: false,
};

const external = extendsBuiltin(`

    | proxy-bind | buffer-pond    | async-readable    |       |       |
    | js-yaml    | futoin-hkdf    | command-line-args | pino  | ip    |
    | rxjs       | rxjs/operators | fp-ts             | ramda | tslib |

    | @stableness/wabble/dist/extra.cjs

`);



/**
 * @type { import('rollup').RollupOptions[] }
 */
const config = [
    {

        input: dist('index.js'),

        external,

        output: [
            // @ts-ignore
            {
                ...common,
                file: dist('index.cjs'),
            },
        ],

    },

    // @ts-ignore
    prod({

        input: dist('bin.js'),

        external,

        output: {
            ...common,
            file: dist('bin.cjs'),
            banner: '#!/usr/bin/env node',
        },

    }),

];



export default R.reject(R.isEmpty, config);

