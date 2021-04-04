import { EVENTS } from './enums/events';
import { Everbs } from './enums/http';
import { ClobbrLogItem } from './models/ClobbrLog';
import { ClobbrEventCallback } from './models/ClobbrEvent';
import { ClobbrRequestSettings } from './models/ClobbrRequestSettings';
import { getTimeAverage } from './util';
import { validate } from './validate';
import { handleApiCall, handleApiCallError } from './common';

export const runParallel = async (
  settings: ClobbrRequestSettings,
  eventCallback: ClobbrEventCallback = () => null
) => {
  const { iterations, url, verb = Everbs.GET } = settings;
  const { valid, errors } = validate(url, verb);

  if (!valid) {
    return Promise.reject(errors);
  }

  const results = [];
  const logs = [] as Array<ClobbrLogItem>;

  const requests = Array.from({ length: iterations }).map(async (_v, index) => {
    try {
      const { duration, logItem } = await handleApiCall(index, settings);
      results.push(duration);
      logs.push(logItem);
      eventCallback(EVENTS.RESPONSE_OK, logItem);
    } catch (error) {
      const { logItem } = handleApiCallError(settings, error, index);
      logs.push(logItem);
      eventCallback(EVENTS.RESPONSE_FAILED, logItem);
    }
  });

  await Promise.all(requests);
  return { results, logs, average: getTimeAverage(results) };
};
