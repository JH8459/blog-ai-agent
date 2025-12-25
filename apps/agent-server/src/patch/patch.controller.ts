import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PatchRequestDto } from './dto/patch-request.dto';
import { PatchService } from './patch.service';

@Controller()
export class PatchController {
  constructor(private readonly patchService: PatchService) {}

  @Post('patch')
  @HttpCode(HttpStatus.OK)
  async patch(@Body() body: PatchRequestDto) {
    return this.patchService.patchPost(body);
  }
}
