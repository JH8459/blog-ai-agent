import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { GitPushRequestDto } from './dto/git-push-request.dto';
import { GitService } from './git.service';

@Controller('git')
export class GitController {
  constructor(private readonly gitService: GitService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async push(@Body() body: GitPushRequestDto) {
    return this.gitService.pushChanges(body);
  }
}
