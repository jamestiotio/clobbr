import { useContext, useMemo, useState } from 'react';
import clsx from 'clsx';
import { css } from '@emotion/css';
import { motion, usePresence } from 'framer-motion';
import { useInterval } from 'react-use';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';

import { GlobalStore } from 'App/globalContext';

import { Alert, CircularProgress, Typography } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import CloseIcon from '@mui/icons-material/Close';

import { VERBS } from 'shared/enums/http';
import { ClobbrUIResultListItem } from 'models/ClobbrUIResultListItem';

import { ReactComponent as AllFailed } from 'shared/images/search/AllFailed.svg';
import { ReactComponent as Timeout } from 'shared/images/search/Timeout.svg';
import { ReactComponent as ParallelIcon } from 'shared/icons/Parallel.svg';
import { ReactComponent as SequenceIcon } from 'shared/icons/Sequence.svg';
import { ResultChart } from 'results/ResultChart/ResultChart';
import { CommonlyFailedItem } from 'results/CommonlyFailedItem/CommonlyFailedItem';
import ActivityIndicator from 'ActivityIndicator/ActivityIndicator';

const xIconCss = css`
  && {
    width: 0.75rem;
    height: 0.75rem;
  }
`;

const VERB_COLOR_CLASS_MAP = {
  [VERBS.GET]: 'bg-blue-200',
  [VERBS.POST]: 'bg-green-200',
  [VERBS.PUT]: 'bg-orange-200',
  [VERBS.DELETE]: 'bg-red-200'
};

const DURATION_COLOR_MAP: { [key: number]: string } = {
  0: 'text-green-400',
  1: 'text-yellow-400',
  2: 'text-orange-400',
  3: 'text-red-600'
};

export const getDurationColorClass = (duration: number): string => {
  const roundedDuration = Math.round(duration / 1000);

  return DURATION_COLOR_MAP[roundedDuration]
    ? DURATION_COLOR_MAP[roundedDuration]
    : 'text-red-400';
};

const TIMEOUT_WAIT_IN_MINUTES = 3;

const Result = ({
  item,
  expanded
}: {
  item: ClobbrUIResultListItem;
  expanded: boolean;
}) => {
  const globalStore = useContext(GlobalStore);
  const [isPresent, safeToRemove] = usePresence();

  const timedOut = useMemo(() => {
    const startDate = item.latestResult.startDate as string;
    const endDate = item.latestResult.endDate;

    return (
      startDate &&
      !endDate &&
      differenceInMinutes(new Date(), new Date(startDate)) >
        TIMEOUT_WAIT_IN_MINUTES
    );
  }, [item.latestResult.startDate, item.latestResult.endDate]);

  const isInProgress =
    !timedOut && item.latestResult.resultDurations.length !== item.iterations;

  const percentageOfCompleteness = Math.round(
    (item.latestResult.resultDurations.length * 100) / item.iterations
  );

  const failedItems = item.latestResult.logs.filter((log) => log.failed);
  const allFailed = failedItems.length === item.iterations;

  const transition = { type: 'spring', stiffness: 500, damping: 50, mass: 1 };

  const animations = {
    layout: true,
    initial: 'out',
    style: {
      position: (isPresent ? 'static' : 'absolute') as unknown as any
    },
    animate: isPresent ? 'in' : 'out',
    whileTap: 'tapped',
    variants: {
      in: { scaleY: 1, opacity: 1 },
      out: { scaleY: 0, opacity: 0, zIndex: -1 },
      tapped: { scale: 0.98, opacity: 0.5, transition: { duration: 0.1 } }
    },
    onAnimationComplete: () => !isPresent && safeToRemove(),
    transition
  };

  const onResultPressed = () => {
    globalStore.results.updateExpandedResults([item.id]);
  };

  // Date formatting
  const [formattedDate, setFormattedDate] = useState('');
  const durationColor = useMemo(
    () => getDurationColorClass(item.latestResult.averageDuration),
    [item.latestResult.averageDuration]
  );

  useInterval(() => {
    const date = formatDistanceToNow(
      new Date(item.latestResult.startDate as string),
      {
        includeSeconds: true
      }
    );

    setFormattedDate(date);
  }, 3000);

  return (
    <motion.button
      className="odd:bg-gray-200 dark:odd:bg-gray-800 w-full"
      {...animations}
      onClick={onResultPressed}
    >
      <ListItem className="flex-wrap">
        <ListItemAvatar>
          <Tooltip title={item.parallel ? 'Parallel' : 'Sequence'}>
            {!isInProgress ? (
              <Avatar className="dark:!bg-black dark:!text-gray-300">
                {item.parallel ? <ParallelIcon /> : <SequenceIcon />}
              </Avatar>
            ) : (
              <div className="flex items-center">
                <CircularProgress size={30} />
              </div>
            )}
          </Tooltip>
        </ListItemAvatar>
        <ListItemText
          primary={
            <span className="flex gap-2 truncate">
              <small
                className={clsx(
                  'px-2 py-0.5',
                  'rounded-sm text-black',
                  VERB_COLOR_CLASS_MAP[item.verb] || 'bg-gray-300'
                )}
              >
                {item.verb}
              </small>
              {item.url.replace(/^https?:\/\//, '')}
            </span>
          }
          secondary={formattedDate ? `${formattedDate} ago` : '...'}
        />

        <div className="flex flex-col items-end">
          <Tooltip title="Average response time">
            <Typography
              variant="body2"
              className={clsx(durationColor, '!font-semibold')}
            >
              {item.latestResult.averageDuration} ms
            </Typography>
          </Tooltip>

          <Tooltip title="Iteration number">
            <Typography
              variant="caption"
              className="flex items-center justify-center opacity-50"
            >
              {item.iterations}
              <CloseIcon className={xIconCss} />
            </Typography>
          </Tooltip>
        </div>
      </ListItem>

      {allFailed && expanded ? (
        <div className="flex flex-col  gap-4 mb-12 items-center">
          <AllFailed className="w-full max-w-xs p-6" />
          <Typography variant="body1">
            <strong className="font-semibold">All requests failed</strong>
          </Typography>
          <hr />
          <ul>
            <li>
              <Typography variant="body2">
                Did you by chance use the incorrect verb?
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Does your server require authentication?
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Do you need to include custom headers?
              </Typography>
            </li>
          </ul>

          <CommonlyFailedItem item={item} />
        </div>
      ) : (
        ''
      )}

      {timedOut && expanded ? (
        <div className="flex flex-col  gap-4 mb-12 items-center">
          <Timeout className="w-full max-w-xs p-6" />
          <Typography variant="body1">
            <strong className="font-semibold">Requests timed out</strong>
          </Typography>

          <Typography variant="body2">
            Would you care to give it another try?
          </Typography>
        </div>
      ) : (
        ''
      )}

      {!allFailed && !timedOut && expanded && item.iterations > 1 ? (
        <div className="relative">
          {isInProgress ? (
            <div className="h-80 flex flex-col items-center justify-center gap-8">
              <div
                className="absolute transition-all bottom-0 left-0 h-1 bg-gradient-to-r from-primary-300 to-primary-700"
                style={{ width: percentageOfCompleteness + '%' }}
                aria-hidden="true"
              ></div>

              <ActivityIndicator
                animationIterations="infinite"
                startDelay={0}
              />
              <Typography variant="caption">
                {item.latestResult.resultDurations.length < item.iterations / 2
                  ? 'Getting results'
                  : 'Almost there'}
              </Typography>
            </div>
          ) : (
            <>
              <ResultChart item={item} />

              {failedItems.length ? (
                <div className="flex flex-col items-center mb-2">
                  <Alert severity="error">
                    {failedItems.length} failed. Showing results only for
                    successful requests.
                  </Alert>
                </div>
              ) : (
                ''
              )}
            </>
          )}
        </div>
      ) : (
        ''
      )}
    </motion.button>
  );
};

export default Result;
