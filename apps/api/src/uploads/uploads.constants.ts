// apps/api/src/uploads/uploads.constants.ts
import { join } from 'path';

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'apps', 'api', 'uploads');
