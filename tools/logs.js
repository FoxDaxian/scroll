import log4js from 'log4js';
import config from 'config';

log4js.configure(config.log4js);

const compilerStatsLogger = log4js.getLogger('compilerStats');

export default {
    compilerStatsLogger
};
