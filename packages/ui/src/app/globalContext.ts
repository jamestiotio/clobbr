import { VERBS, Everbs } from 'shared/enums/http';
import { ClobbrLogItem } from '@clobbr/api/src/models/ClobbrLog';
import React from 'react';
import { ClobbrUIResultListItem } from 'models/ClobbrUIResultListItem';

export const DEFAULT_GLOBAL_STORE = {
  search: {
    iterations: 10,
    verb: VERBS.GET as Everbs,
    ssl: true,
    parallel: true,
    timeout: 10000,
    url: {
      displayText: 'https://60698fbde1c2a10017544a73.mockapi.io/test',
      requestUrl: 'https://60698fbde1c2a10017544a73.mockapi.io/test'
    },
    isUrlValid: false,

    updateUrl(url: string) {},
    toggleSsl() {},
    toggleParallel() {},
    updateIterations(iterations: number) {},
    updateVerb(verb: Everbs) {},
    updateTimeout(timeout: number) {}
  },

  results: {
    expandedResults: [] as Array<string>,
    list: [],
    setList: (list: Array<ClobbrUIResultListItem>) => {},

    updateExpandedResults(expandedResults: Array<string>) {},

    addItem(result: {
      url: string;
      resultDurations: Array<number>;
      logs: Array<ClobbrLogItem>;
      averageDuration: number;
      parallel: boolean;
      iterations: number;
      verb: Everbs;
    }): { id: string } {
      return { id: '' };
    },

    addLatestResultLog({
      itemId,
      log
    }: {
      itemId: string;
      log: ClobbrLogItem;
    }) {},

    updateLatestResult({
      itemId,
      logs
    }: {
      itemId: string;
      logs: Array<ClobbrLogItem>;
    }) {}
  },

  themeMode: 'dark',
  toggleTheme() {},
  setTheme(mode: string) {}
};

export const GlobalStore = React.createContext(DEFAULT_GLOBAL_STORE);
