import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { PublicUser } from '../users/users.service';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Controller('children')
@UseGuards(SessionAuthGuard)
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  async listChildren(@CurrentUser() user: PublicUser) {
    return {
      children: await this.children.listChildren(user.id),
    };
  }

  @Post()
  async createChild(
    @CurrentUser() user: PublicUser,
    @Body() dto: CreateChildDto,
  ) {
    return {
      child: await this.children.createChild(user.id, dto),
    };
  }

  @Patch(':childId')
  async updateChild(
    @CurrentUser() user: PublicUser,
    @Param('childId', new ParseUUIDPipe()) childId: string,
    @Body() dto: UpdateChildDto,
  ) {
    return {
      child: await this.children.updateChild(user.id, childId, dto),
    };
  }

  @Delete(':childId')
  @HttpCode(200)
  async deleteChild(
    @CurrentUser() user: PublicUser,
    @Param('childId', new ParseUUIDPipe()) childId: string,
  ) {
    await this.children.deleteChild(user.id, childId);

    return {
      ok: true,
    };
  }
}
