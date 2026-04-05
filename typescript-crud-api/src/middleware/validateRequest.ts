// src/_middleware/validateRequest.ts
import type { Request, NextFunction } from 'express';
import Joi from 'joi';

export function validateRequest(
  req: Request,
  next: NextFunction,
  schema: Joi.ObjectSchema
): void {
  const options = {
    abortEarly: false,   // Return all errors, not just the first
    allowUnknown: true,  // Allow unknown keys
    stripUnknown: true,  // Remove unknown keys from validated data
  };

  const { error, value } = schema.validate(req.body, options);

  if (error) {
    next(`Validation error: ${error.details.map((d) => d.message).join(', ')}`);
  } else {
    req.body = value;
    next();
  }
}