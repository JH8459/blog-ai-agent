import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ImagesRequestDto } from './dto/images-request.dto';
import { ImagesService } from './images.service';

@Controller()
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('images')
  @HttpCode(HttpStatus.OK)
  async applyImages(@Body() body: ImagesRequestDto) {
    return this.imagesService.applyImages(body);
  }
}
