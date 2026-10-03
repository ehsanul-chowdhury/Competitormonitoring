import { BadRequestException, type PipeTransform } from "@nestjs/common"
import type { ZodType } from "zod"

/**
 * Reuses the app's existing Zod schemas (lib/validations/* in the Next.js
 * app, ported alongside each module here) instead of rewriting them as
 * class-validator DTOs. Same validation rules, one less thing to drift.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException(result.error.issues[0]?.message ?? "Invalid request")
    }
    return result.data
  }
}
