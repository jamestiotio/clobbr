import clsx from 'clsx';
import { isNumber } from 'lodash-es';
import { useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { css } from '@emotion/css';
import {
  Button,
  TextField,
  IconButton,
  Tooltip,
  SelectChangeEvent,
  Typography,
  CircularProgress
} from '@mui/material';
import { Lock, LockOpen } from '@mui/icons-material';
import { GlobalStore } from 'App/globalContext';

import { ReactComponent as ParallelIcon } from 'shared/icons/Parallel.svg';
import { ReactComponent as SequenceIcon } from 'shared/icons/Sequence.svg';
import { ReactComponent as Start } from 'shared/images/search/Start.svg';

import SearchSettings from 'search/SearchSettings/SearchSettings';
import VerbSelect from 'search/Search/VerbSelect';

import { ClobbrLogItem } from '@clobbr/api/src/models/ClobbrLog';
import { EEvents } from '@clobbr/api/src/enums/events';
import { run } from '@clobbr/api';
import { Everbs } from 'shared/enums/http';
import { MAX_ITERATIONS } from 'shared/consts/settings';

const DEFAULTS = {
  headers: {},
  data: {}
};

const leftInputSeparatorCss = css`
  position: relative;

  &:before {
    content: '';
    display: flex;
    position: absolute;
    width: 0.1rem;
    height: 100%;
    background: rgba(180, 180, 180, 0.3);
  }
`;

const urlInputCss = css`
  .MuiInputBase-root {
    border-top-right-radius: 0;
  }
`;

const iterationInputCss = css`
  .MuiInputBase-root {
    border-radius: 0;
  }
`;

const verbInputCss = css`
  .MuiInputBase-root {
    border-radius: 0;
  }
`;

const Search = () => {
  const globalStore = useContext(GlobalStore);

  const [running, setRunning] = useState(false);
  const [requestsInProgress, setRequestsInProgress] = useState(false);

  const [runingItemId, setRuningItemId] = useState('');
  const [urlErrorShown, setUrlErrorShown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [autoFocusUrlInput, setAutoFocusUrlInput] = useState(true);

  const maxIterationCount = isNumber(globalStore.appSettings.maxIterations)
    ? globalStore.appSettings.maxIterations
    : MAX_ITERATIONS;

  const settingsAnimations = {
    animate:
      inputFocused || globalStore.search.url.requestUrl ? 'shown' : 'hidden',
    whileTap: 'tapped',
    variants: {
      shown: { opacity: 1, transition: { delay: 1 } },
      hidden: { opacity: 0, zIndex: -1 },
      tapped: {
        scale: 0.98,
        opacity: 0.5,
        transition: { duration: 0.1 }
      }
    }
  };

  const onUrlFieldBlur = () => {
    setInputFocused(false);
    toggleUrlError(false);
  };

  const toggleUrlError = (nextValue: boolean = true) => {
    setUrlErrorShown(nextValue);
    setAutoFocusUrlInput(nextValue);
  };

  const handleUrlChange =
    (updateUrl: (url: string) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateUrl(event.target.value);
    };

  const handleIterationChange =
    (updateIterations: (iterations: number) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = parseInt(event.target.value, 10);
      if (!event.target.value || isNaN(numericValue) || numericValue < 0) {
        updateIterations(1);
      } else if (
        !event.target.value ||
        isNaN(numericValue) ||
        numericValue > maxIterationCount
      ) {
        updateIterations(maxIterationCount);
      } else {
        updateIterations(numericValue);
      }
    };

  const handleVerbChange =
    (updateVerb: (verb: Everbs) => void) =>
    (event: SelectChangeEvent<Everbs>) => {
      updateVerb(event.target.value as Everbs);
    };

  const startRun = async () => {
    const { id } = globalStore.results.addItem({
      url: globalStore.search.url.requestUrl,
      resultDurations: [],
      logs: [],
      averageDuration: 0,
      parallel: globalStore.search.parallel,
      iterations: globalStore.search.iterations,
      verb: globalStore.search.verb,
      ssl: globalStore.search.ssl
    });

    setRunning(true);
    setRuningItemId(id);
    globalStore.results.updateExpandedResults([id]);
  };

  /**
   * Validation effect.
   */
  useEffect(() => {
    if (globalStore.search.isUrlValid) {
      toggleUrlError(false);
    }
  }, [globalStore.search.isUrlValid]);

  /**
   * Run effect.
   */
  useEffect(() => {
    if (requestsInProgress) {
      return;
    }

    if (running) {
      const fireRequests = async () => {
        const configuredOptions = {
          url: globalStore.search.url.requestUrl,
          iterations: globalStore.search.iterations,
          verb: globalStore.search.verb,
          timeout: globalStore.search.timeout,
          headers: globalStore.search.headerItems.reduce((acc, header) => {
            const { value, key } = header;

            if (!key) {
              return acc;
            }

            acc[key] = value || '';
            return acc;
          }, {})
        };

        const options = { ...DEFAULTS, ...configuredOptions };

        const runEventCallback =
          (itemId: string) =>
          (_event: EEvents, log: ClobbrLogItem, logs: Array<ClobbrLogItem>) => {
            if (!log.metas) {
              console.warn(
                `Skipped log for item [${itemId}] because it has no metas`
              );
            }

            globalStore.results.updateLatestResult({ itemId, logs });
          };

        try {
          const electronAPI = (window as any).electronAPI;

          if (electronAPI) {
            electronAPI.onRunCallback(
              runingItemId,
              (
                _electronEvent: any,
                event: EEvents,
                log: ClobbrLogItem,
                logs: Array<ClobbrLogItem>
              ) => {
                if (logs.length === configuredOptions.iterations) {
                  electronAPI.offRunCallback(runingItemId);
                }

                return runEventCallback(runingItemId)(event, log, logs);
              }
            );

            await electronAPI.run(
              runingItemId,
              globalStore.search.parallel,
              options,
              runEventCallback(runingItemId)
            );
          } else {
            await run(
              globalStore.search.parallel,
              options,
              runEventCallback(runingItemId)
            );
          }

          setRequestsInProgress(false);
        } catch (error) {
          // TODO dan: toast
          console.error(error);
          setRequestsInProgress(false);
        }
      };

      setRequestsInProgress(true);
      fireRequests();

      setRunning(false);
    }
  }, [
    globalStore.results,
    globalStore.search.url.requestUrl,
    globalStore.search.iterations,
    globalStore.search.parallel,
    globalStore.search.verb,
    globalStore.search.timeout,
    globalStore.search.headerItems,
    running,
    runingItemId,
    requestsInProgress
  ]);

  return (
    <GlobalStore.Consumer>
      {({ search, themeMode, results, appSettings }) => (
        <section
          className={clsx(
            'flex flex-grow flex-shrink flex-col items-center justify-center mt-12 mb-6 w-full max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl',
            appSettings.stickySearch ? 'sm:sticky top-4 z-20' : ''
          )}
        >
          <motion.div
            animate={{
              scale: [1, 0.9, 1]
            }}
            transition={{ duration: 0.3, times: [0, 0.7, 1] }}
            className="flex flex-col flex-shrink-0 items-stretch justify-center w-full px-6 sm:px-4 md:p-0 sm:flex-row sm:items-center"
          >
            <div className="flex-shrink-0 mr-2 hidden sm:inline-block">
              <Tooltip
                title={!search.ssl ? 'http (Secure)' : 'https (Insecure)'}
              >
                <IconButton
                  aria-label="Toggle https"
                  className="w-5 h-5"
                  onClick={search.toggleSsl}
                >
                  {search.ssl ? (
                    <Lock fontSize="small" />
                  ) : (
                    <LockOpen fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </div>

            <TextField
              error={urlErrorShown}
              variant="filled"
              inputRef={(input) =>
                input && autoFocusUrlInput ? input.focus() : null
              }
              onFocus={() => setInputFocused(true)}
              onBlur={onUrlFieldBlur}
              onKeyUp={(event) => {
                if (event.key === 'Enter') {
                  startRun();
                }
              }}
              autoFocus={autoFocusUrlInput}
              label="Type an endpoint (URL) to test"
              placeholder="example.com/api/v1"
              id="search"
              value={search.url.displayText}
              onChange={handleUrlChange(search.updateUrl)}
              className={clsx('flex-grow', urlInputCss)}
              InputProps={{
                endAdornment: (
                  <Tooltip title={search.parallel ? 'Parallel' : 'Sequence'}>
                    <IconButton
                      className="relative w-10 h-10 before:bg-gray-500 before:bg-opacity-10 before:flex before:w-full before:h-full before:absolute before:rounded-full"
                      aria-label="Toggle between parallel / sequence"
                      onClick={search.toggleParallel}
                    >
                      <span
                        className={
                          themeMode === 'light' ? 'text-black' : 'text-gray-300'
                        }
                      >
                        {search.parallel ? <ParallelIcon /> : <SequenceIcon />}
                      </span>
                    </IconButton>
                  </Tooltip>
                )
              }}
            />

            <div className="flex sm:contents">
              <VerbSelect
                value={search.verb}
                onVerbChange={handleVerbChange(search.updateVerb)}
                customContainerClasses={clsx(
                  'flex-shrink-0',
                  'flex-grow',
                  'md:flex-grow-0',
                  leftInputSeparatorCss,
                  verbInputCss
                )}
              />

              <TextField
                variant="filled"
                label="Times"
                placeholder="10"
                id="iterations"
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                value={search.iterations}
                onChange={handleIterationChange(search.updateIterations)}
                className={clsx(
                  'flex-grow',
                  'sm:flex-shrink-0',
                  'sm:w-16',
                  'md:flex-grow-0',
                  leftInputSeparatorCss,
                  iterationInputCss
                )}
              />

              <Tooltip title={!search.isUrlValid ? 'Type a URL first :-)' : ''}>
                <Button
                  variant="contained"
                  size="large"
                  className={clsx(
                    'flex-shrink-0 flex-grow md:flex-grow-0 !rounded-none sm:!rounded-tr-md sm:!rounded-br-md sm:w-28',
                    requestsInProgress ? '!bg-gray-600' : ''
                  )}
                  style={{ height: '3.5rem' }}
                  onClick={
                    search.isUrlValid ? startRun : () => toggleUrlError()
                  }
                  disabled={requestsInProgress}
                >
                  {requestsInProgress ? (
                    <CircularProgress size={20} />
                  ) : (
                    'Start'
                  )}
                </Button>
              </Tooltip>
            </div>
          </motion.div>

          <motion.div
            {...settingsAnimations}
            className="self-start mt-2 px-6 sm:ml-12 md:ml-8 sm:p-0"
          >
            <SearchSettings />
          </motion.div>

          {results.list.length === 0 ? (
            <motion.div
              className="flex flex-col items-center gap-2 opacity-0"
              animate={{
                opacity: [0, 0.9, 1]
              }}
              transition={{ duration: 2, delay: 5, times: [0, 0.7, 1] }}
            >
              <Start className="w-full flex-grow-0 flex-shrink-0 max-w-xs py-6 px-12" />

              <Typography variant="body1">
                <strong className="font-semibold">No results yet</strong>
              </Typography>

              <Typography variant="body2" className="text-center opacity-50">
                Results will appear here after <br /> you add an endpoint URL
                and press 'Start'.
              </Typography>
            </motion.div>
          ) : (
            ''
          )}
        </section>
      )}
    </GlobalStore.Consumer>
  );
};

export default Search;
