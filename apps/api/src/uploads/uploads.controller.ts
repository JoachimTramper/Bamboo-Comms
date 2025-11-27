import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UPLOADS_DIR } from './uploads.constants';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post('message')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + '-' + file.originalname);
        },
      }),
    }),
  )
  uploadMessageFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploads.saveFile(file);
  }
}
