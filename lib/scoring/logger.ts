import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type LogLevel = 'INFO' | 'WARN' | 'ERROR'
type LogStage = 'INIT' | 'PDF' | 'VERIFY' | 'VALIDATE' | 'ANALYSE' | 'SCORE' | 'SAVE' | 'COMPLETE' | 'ERROR'

interface LogEntry {
  stage: LogStage
  level: LogLevel
  message: string
  data?: Record<string, unknown>
}

export class ScreeningLogger {
  private reportId: string
  private buffer: LogEntry[] = []

  constructor(reportId: string) {
    this.reportId = reportId
  }

  info(stage: LogStage, message: string, data?: Record<string, unknown>) {
    this.add('INFO', stage, message, data)
  }

  warn(stage: LogStage, message: string, data?: Record<string, unknown>) {
    this.add('WARN', stage, message, data)
  }

  error(stage: LogStage, message: string, data?: Record<string, unknown>) {
    this.add('ERROR', stage, message, data)
  }

  private add(level: LogLevel, stage: LogStage, message: string, data?: Record<string, unknown>) {
    this.buffer.push({ stage, level, message, data })
    // Also write to console for Vercel logs
    const prefix = `[screening:${stage.toLowerCase()}]`
    if (level === 'ERROR') console.error(prefix, message, data ?? '')
    else if (level === 'WARN') console.warn(prefix, message, data ?? '')
    else console.log(prefix, message, data ?? '')
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    try {
      await prisma.screeningLog.createMany({
        data: this.buffer.map((entry) => ({
          screeningReportId: this.reportId,
          stage: entry.stage,
          level: entry.level,
          message: entry.message,
          data: entry.data ? (entry.data as Prisma.InputJsonValue) : undefined,
        })),
      })
      this.buffer = []
    } catch (err) {
      console.error('[screening:logger] Failed to flush logs to DB:', err)
    }
  }
}
