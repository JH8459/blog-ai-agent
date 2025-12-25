import { Module } from '@nestjs/common';
import { GenerateController } from './generate/generate.controller';
import { GenerateService } from './generate/generate.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { ImagesController } from './images/images.controller';
import { ImagesService } from './images/images.service';
import { PatchController } from './patch/patch.controller';
import { PatchService } from './patch/patch.service';

@Module({
  controllers: [HealthController, GenerateController, PatchController, ImagesController],
  providers: [HealthService, GenerateService, PatchService, ImagesService]
})
export class AppModule {}
