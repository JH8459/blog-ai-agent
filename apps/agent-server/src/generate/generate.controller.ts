import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { GenerateRequestDto } from './dto/generate-request.dto';
import { GenerateService } from './generate.service';

@Controller()
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(@Body() body: GenerateRequestDto) {
    return this.generateService.generateDraft(body);
  }
}
