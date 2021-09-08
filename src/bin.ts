#!/usr/bin/env node

import Command from 'command-line-args';

import { load } from './index.js';





export type Options = typeof options;

const options = Command([

    { name: 'local',     alias: 'l', type: String, multiple: true, defaultValue: [] },
    { name: 'remote',    alias: 'r', type: String, multiple: true, defaultValue: [] },
    { name: 'subscribe', alias: 's', type: String, multiple: true, defaultValue: [] },
    { name: 'refresh',   alias: 'f', type: Number, defaultValue: 60 * 60 },
    { name: 'method',    alias: 'm', type: String },
    { name: 'key',       alias: 'k', type: String },
    { name: 'quiet',     alias: 'q', type: Boolean },

], { partial: true }) as Readonly<{
    local: string[];
    remote: string[];
    subscribe: string[];
    refresh: number;
    method?: string;
    key?: string;
    quiet?: boolean;
}>;





load(options);

