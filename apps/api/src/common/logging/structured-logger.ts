import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

@Injectable()
export class StructuredLogger extends ConsoleLogger {
  private readonly isProduction: boolean;

  constructor(context?: string, isProduction = false) {
    super(context ?? '');
    this.isProduction = isProduction;
  }

  log(message: string, context?: string) {
    if (this.isProduction) {
      this.writeStructured('info', message, context);
    } else {
      super.log(message, context);
    }
  }

  warn(message: string, context?: string) {
    if (this.isProduction) {
      this.writeStructured('warn', message, context);
    } else {
      super.warn(message, context);
    }
  }

  error(message: string, stack?: string, context?: string) {
    if (this.isProduction) {
      this.writeStructured('error', message, context, stack);
    } else {
      super.error(message, stack, context);
    }
  }

  debug(message: string, context?: string) {
    if (this.isProduction) {
      this.writeStructured('debug', message, context);
    } else {
      super.debug(message, context);
    }
  }

  verbose(message: string, context?: string) {
    if (this.isProduction) {
      this.writeStructured('verbose', message, context);
    } else {
      super.verbose(message, context);
    }
  }

  private writeStructured(
    level: string,
    message: string,
    context?: string,
    stack?: string,
  ) {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (stack) {
      entry.stack = stack;
    }

    const output = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }
}

export function getLogLevels(isProduction: boolean): LogLevel[] {
  return isProduction
    ? ['log', 'warn', 'error']
    : ['log', 'warn', 'error', 'debug', 'verbose'];
}
