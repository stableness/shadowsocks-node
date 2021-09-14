#!/usr/bin/env node

import Command from 'command-line-args';

import * as R from 'ramda';

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
    { name: 'enable_deprecated_cipher', type: Boolean },
    { name: 'third_party_providers_use_at_your_own_risk', type: Boolean },

], { partial: true }) as Readonly<{

    local: string[];
    remote: string[];
    subscribe: string[];
    refresh: number;
    method?: string;
    key?: string;
    quiet?: boolean;
    enable_deprecated_cipher?: boolean;
    third_party_providers_use_at_your_own_risk?: boolean;

}>;





load({

    ...options,

    ...(options.third_party_providers_use_at_your_own_risk && { subscribe: [

        '2v/eerf/qfeerf/hg/ten.rviledsj.ndc//:sptth',
        'busss/ss/ss_yxorp_eerf/nc-drahnrael/hg/ten.rviledsj.ndc//:sptth',

    ].map(R.reverse) }),

});

