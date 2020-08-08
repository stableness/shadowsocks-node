'use strict';

const Command = require('command-line-args');

const { load } = require('./index.cjs');





export type Options = typeof options;

const options = Command([

    { name: 'local',  alias: 'l', type: String },
    { name: 'remote', alias: 'r', type: String },
    { name: 'method', alias: 'm', type: String },
    { name: 'key',    alias: 'k', type: String },

], { partial: true }) as Partial<{
    local: string,
    remote: string,
    key: string,
    method: string,
}>;





load(options);

