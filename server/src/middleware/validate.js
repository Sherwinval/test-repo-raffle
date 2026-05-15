export function validate(schema, pick = 'body') {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[pick]);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      const err = new Error('Validation failed.');
      err.status = 400;
      err.code = 'VALIDATION_FAILED';
      err.details = details;
      return next(err);
    }
    req[pick] = parsed.data;
    return next();
  };
}

