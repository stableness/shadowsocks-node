'use strict';

const Command = require('command-line-args') as typeof import('command-line-args');

const { load } = require('./index.cjs') as typeof import('./index');





export type Options = typeof options;

const options = Command([

    { name: 'local',  alias: 'l', type: String },
    { name: 'remote', alias: 'r', type: String },
    { name: 'method', alias: 'm', type: String },
    { name: 'key',    alias: 'k', type: String },
    { name: 'quiet',  alias: 'q', type: Boolean },

], { partial: true }) as Partial<{
    local: string,
    remote: string,
    key: string,
    method: string,
    quiet: boolean,
}>;





load(options);

