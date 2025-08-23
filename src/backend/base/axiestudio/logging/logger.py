"""Logging configuration for AxieStudio using structlog."""

import json
import logging
import logging.handlers
import os
import sys
from collections import deque
from datetime import datetime
from pathlib import Path
from threading import Lock, Semaphore
from typing import Any, TypedDict

# Optional imports with fallbacks
try:
    import orjson
except ImportError:
    import json as orjson  # Fallback to standard json

try:
    import structlog
    STRUCTLOG_AVAILABLE = True
except ImportError:
    # Fallback to standard logging if structlog not available
    import logging
    STRUCTLOG_AVAILABLE = False

try:
    from platformdirs import user_cache_dir
except ImportError:
    # Fallback for user cache directory
    def user_cache_dir(app_name: str) -> str:
        import os
        if os.name == 'nt':  # Windows
            return os.path.join(os.environ.get('LOCALAPPDATA', ''), app_name)
        else:  # Unix-like
            return os.path.join(os.path.expanduser('~'), '.cache', app_name)

try:
    from typing_extensions import NotRequired
except ImportError:
    # Fallback for Python < 3.11
    try:
        from typing import NotRequired  # Python 3.11+
    except ImportError:
        # For older Python versions, just use the type directly
        def NotRequired(tp):
            return tp

from axiestudio.settings import DEV

VALID_LOG_LEVELS = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

# Map log level names to integers
LOG_LEVEL_MAP = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


class SizedLogBuffer:
    """A buffer for storing log messages for the log retrieval API."""

    def __init__(
        self,
        max_readers: int = 20,  # max number of concurrent readers for the buffer
    ):
        """Initialize the buffer.

        The buffer can be overwritten by an env variable AXIESTUDIO_LOG_RETRIEVER_BUFFER_SIZE
        because the logger is initialized before the settings_service are loaded.
        """
        self.buffer: deque = deque()

        self._max_readers = max_readers
        self._wlock = Lock()
        self._rsemaphore = Semaphore(max_readers)
        self._max = 0

    def get_write_lock(self) -> Lock:
        """Get the write lock."""
        return self._wlock

    def write(self, message: str) -> None:
        """Write a message to the buffer."""
        record = json.loads(message)
        log_entry = record.get("event", record.get("msg", record.get("text", "")))

        # Extract timestamp - support both direct timestamp and nested record.time.timestamp
        timestamp = record.get("timestamp", 0)
        if timestamp == 0 and "record" in record:
            # Support nested structure from tests: record.time.timestamp
            time_info = record["record"].get("time", {})
            timestamp = time_info.get("timestamp", 0)

        if isinstance(timestamp, str):
            # Parse ISO format timestamp
            dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            epoch = int(dt.timestamp() * 1000)
        else:
            epoch = int(timestamp * 1000)

        with self._wlock:
            if len(self.buffer) >= self.max:
                for _ in range(len(self.buffer) - self.max + 1):
                    self.buffer.popleft()
            self.buffer.append((epoch, log_entry))

    def __len__(self) -> int:
        """Get the length of the buffer."""
        return len(self.buffer)

    def get_after_timestamp(self, timestamp: int, lines: int = 5) -> dict[int, str]:
        """Get log entries after a timestamp."""
        rc = {}

        self._rsemaphore.acquire()
        try:
            with self._wlock:
                for ts, msg in self.buffer:
                    if lines == 0:
                        break
                    if ts >= timestamp and lines > 0:
                        rc[ts] = msg
                        lines -= 1
        finally:
            self._rsemaphore.release()

        return rc

    def get_before_timestamp(self, timestamp: int, lines: int = 5) -> dict[int, str]:
        """Get log entries before a timestamp."""
        self._rsemaphore.acquire()
        try:
            with self._wlock:
                as_list = list(self.buffer)
            max_index = -1
            for i, (ts, _) in enumerate(as_list):
                if ts >= timestamp:
                    max_index = i
                    break
            if max_index == -1:
                return self.get_last_n(lines)
            rc = {}
            start_from = max(max_index - lines, 0)
            for i, (ts, msg) in enumerate(as_list):
                if start_from <= i < max_index:
                    rc[ts] = msg
            return rc
        finally:
            self._rsemaphore.release()

    def get_last_n(self, last_idx: int) -> dict[int, str]:
        """Get the last n log entries."""
        self._rsemaphore.acquire()
        try:
            with self._wlock:
                as_list = list(self.buffer)
            return dict(as_list[-last_idx:])
        finally:
            self._rsemaphore.release()

    @property
    def max(self) -> int:
        """Get the maximum buffer size."""
        # Get it dynamically to allow for env variable changes
        if self._max == 0:
            env_buffer_size = os.getenv("AXIESTUDIO_LOG_RETRIEVER_BUFFER_SIZE", "0")
            if env_buffer_size.isdigit():
                self._max = int(env_buffer_size)
        return self._max

    @max.setter
    def max(self, value: int) -> None:
        """Set the maximum buffer size."""
        self._max = value

    def enabled(self) -> bool:
        """Check if the buffer is enabled."""
        return self.max > 0

    def max_size(self) -> int:
        """Get the maximum buffer size."""
        return self.max


# log buffer for capturing log messages
log_buffer = SizedLogBuffer()


def add_serialized(_logger: Any, _method_name: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    """Add serialized version of the log entry."""
    # Only add serialized if we're in JSON mode (for log buffer)
    if log_buffer.enabled():
        subset = {
            "timestamp": event_dict.get("timestamp", 0),
            "message": event_dict.get("event", ""),
            "level": _method_name.upper(),
            "module": event_dict.get("module", ""),
        }
        event_dict["serialized"] = orjson.dumps(subset)
    return event_dict


def remove_exception_in_production(_logger: Any, _method_name: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    """Remove exception details in production."""
    if DEV is False:
        event_dict.pop("exception", None)
        event_dict.pop("exc_info", None)
    return event_dict


def buffer_writer(_logger: Any, _method_name: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    """Write to log buffer if enabled."""
    if log_buffer.enabled():
        # Create a JSON representation for the buffer
        log_buffer.write(json.dumps(event_dict))
    return event_dict


class LogConfig(TypedDict):
    """Configuration for logging."""

    log_level: NotRequired[str]
    log_file: NotRequired[Path]
    disable: NotRequired[bool]
    log_env: NotRequired[str]
    log_format: NotRequired[str]


def _configure_standard_logging(
    log_level: str,
    log_file: Path | None,
    disable: bool | None,
    log_env: str,
    log_format: str | None,
    log_rotation: str | None,
) -> None:
    """Configure standard Python logging as fallback."""
    # Get numeric log level
    numeric_level = LOG_LEVEL_MAP.get(log_level.upper(), logging.ERROR)

    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
        handlers=[]
    )

    if disable:
        logging.disable(logging.CRITICAL)
        return

    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)

    if log_env.lower() in ["container", "container_json"]:
        # JSON format for containers
        formatter = logging.Formatter('{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}')
    else:
        # Standard format
        formatter = logging.Formatter(log_format or '%(asctime)s - %(levelname)s - %(name)s - %(message)s')

    console_handler.setFormatter(formatter)
    logging.root.addHandler(console_handler)

    # Add file handler if specified
    if log_file:
        try:
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(numeric_level)
            file_handler.setFormatter(formatter)
            logging.root.addHandler(file_handler)
        except Exception:
            pass  # Ignore file logging errors in fallback mode


def configure(
    *,
    log_level: str | None = None,
    log_file: Path | None = None,
    disable: bool | None = False,
    log_env: str | None = None,
    log_format: str | None = None,
    log_rotation: str | None = None,
) -> None:
    """Configure the logger."""
    if os.getenv("AXIESTUDIO_LOG_LEVEL", "").upper() in VALID_LOG_LEVELS and log_level is None:
        log_level = os.getenv("AXIESTUDIO_LOG_LEVEL")
    if log_level is None:
        log_level = "ERROR"

    if log_file is None:
        env_log_file = os.getenv("AXIESTUDIO_LOG_FILE", "")
        log_file = Path(env_log_file) if env_log_file else None

    if log_env is None:
        log_env = os.getenv("AXIESTUDIO_LOG_ENV", "")

    # Get log format from env if not provided
    if log_format is None:
        log_format = os.getenv("AXIESTUDIO_LOG_FORMAT")

    if not STRUCTLOG_AVAILABLE:
        # Fallback to standard logging if structlog not available
        _configure_standard_logging(log_level, log_file, disable, log_env, log_format, log_rotation)
        return

    # Configure processors based on environment
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        add_serialized,
        remove_exception_in_production,
        buffer_writer,
    ]

    # Configure output based on environment
    if log_env.lower() == "container" or log_env.lower() == "container_json":
        processors.append(structlog.processors.JSONRenderer())
    elif log_env.lower() == "container_csv":
        processors.append(
            structlog.processors.KeyValueRenderer(
                key_order=["timestamp", "level", "module", "event"], drop_missing=True
            )
        )
    else:
        # Use rich console for pretty printing based on environment variable
        log_stdout_pretty = os.getenv("AXIESTUDIO_PRETTY_LOGS", "true").lower() == "true"
        if log_stdout_pretty:
            # If custom format is provided, use KeyValueRenderer with custom format
            if log_format:
                processors.append(structlog.processors.KeyValueRenderer())
            else:
                processors.append(structlog.dev.ConsoleRenderer(colors=True))
        else:
            processors.append(structlog.processors.JSONRenderer())

    # Get numeric log level
    numeric_level = LOG_LEVEL_MAP.get(log_level.upper(), logging.ERROR)

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(numeric_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout)
        if not log_file
        else structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Set up file logging if needed
    if log_file:
        if not log_file.parent.exists():
            cache_dir = Path(user_cache_dir("axiestudio"))
            log_file = cache_dir / "axiestudio.log"

        # Parse rotation settings
        if log_rotation:
            # Handle rotation like "1 day", "100 MB", etc.
            max_bytes = 10 * 1024 * 1024  # Default 10MB
            if "MB" in log_rotation.upper():
                try:
                    # Look for pattern like "100 MB" (with space)
                    parts = log_rotation.split()
                    expected_parts = 2
                    if len(parts) >= expected_parts and parts[1].upper() == "MB":
                        mb = int(parts[0])
                        if mb > 0:  # Only use valid positive values
                            max_bytes = mb * 1024 * 1024
                except (ValueError, IndexError):
                    pass
        else:
            max_bytes = 10 * 1024 * 1024  # Default 10MB

        # Since structlog doesn't have built-in rotation, we'll use stdlib logging for file output
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=5,
        )
        file_handler.setFormatter(logging.Formatter("%(message)s"))

        # Add file handler to root logger
        logging.root.addHandler(file_handler)
        logging.root.setLevel(numeric_level)

    # Set up interceptors for uvicorn and gunicorn
    setup_uvicorn_logger()
    setup_gunicorn_logger()

    # Create the global logger instance
    global logger  # noqa: PLW0603
    logger = structlog.get_logger()

    if disable:
        # In structlog, we can set a very high filter level to effectively disable logging
        structlog.configure(
            wrapper_class=structlog.make_filtering_bound_logger(logging.CRITICAL),
        )

    logger.debug("Logger set up with log level: %s", log_level)


def setup_uvicorn_logger() -> None:
    """Redirect uvicorn logs through structlog."""
    loggers = (logging.getLogger(name) for name in logging.root.manager.loggerDict if name.startswith("uvicorn."))
    for uvicorn_logger in loggers:
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True


def setup_gunicorn_logger() -> None:
    """Redirect gunicorn logs through structlog."""
    logging.getLogger("gunicorn.error").handlers = []
    logging.getLogger("gunicorn.error").propagate = True
    logging.getLogger("gunicorn.access").handlers = []
    logging.getLogger("gunicorn.access").propagate = True


class InterceptHandler(logging.Handler):
    """Intercept standard logging messages and route them to structlog."""

    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record by passing it to structlog."""
        if STRUCTLOG_AVAILABLE:
            # Get corresponding structlog logger
            logger_name = record.name
            structlog_logger = structlog.get_logger(logger_name)

            # Map log levels
            level = record.levelno
            if level >= logging.CRITICAL:
                structlog_logger.critical(record.getMessage())
            elif level >= logging.ERROR:
                structlog_logger.error(record.getMessage())
            elif level >= logging.WARNING:
                structlog_logger.warning(record.getMessage())
            elif level >= logging.INFO:
                structlog_logger.info(record.getMessage())
            else:
                structlog_logger.debug(record.getMessage())


# Create a simple logger wrapper that works with both structlog and standard logging
class LoggerWrapper:
    """Logger wrapper that works with both structlog and standard logging."""

    def __init__(self):
        if STRUCTLOG_AVAILABLE:
            self._logger = structlog.get_logger()
        else:
            self._logger = logging.getLogger("axiestudio")

    def debug(self, msg, *args, **kwargs):
        if STRUCTLOG_AVAILABLE:
            self._logger.debug(msg, *args, **kwargs)
        else:
            self._logger.debug(msg, *args, **kwargs)

    def info(self, msg, *args, **kwargs):
        if STRUCTLOG_AVAILABLE:
            self._logger.info(msg, *args, **kwargs)
        else:
            self._logger.info(msg, *args, **kwargs)

    def warning(self, msg, *args, **kwargs):
        if STRUCTLOG_AVAILABLE:
            self._logger.warning(msg, *args, **kwargs)
        else:
            self._logger.warning(msg, *args, **kwargs)

    def error(self, msg, *args, **kwargs):
        if STRUCTLOG_AVAILABLE:
            self._logger.error(msg, *args, **kwargs)
        else:
            self._logger.error(msg, *args, **kwargs)

    def critical(self, msg, *args, **kwargs):
        if STRUCTLOG_AVAILABLE:
            self._logger.critical(msg, *args, **kwargs)
        else:
            self._logger.critical(msg, *args, **kwargs)

    def exception(self, msg, *args, **kwargs):
        if STRUCTLOG_AVAILABLE:
            self._logger.error(msg, *args, **kwargs, exc_info=True)
        else:
            self._logger.exception(msg, *args, **kwargs)


# Initialize logger - will be reconfigured when configure() is called
logger = LoggerWrapper()
configure(log_level="CRITICAL", disable=True)
