import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../../auth/roles.decorator';
import { RolesGuard } from '../../../auth/roles.guard';
import { AdminTemplatesService } from '../admin-templates.service';
import { CreateAdminTemplatePageDto } from './dto/create-admin-template-page.dto';
import { UpdateAdminTemplatePageDto } from './dto/update-admin-template-page.dto';

@Controller('admin/templates/:templateId/pages')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminTemplatePagesController {
  constructor(private readonly templates: AdminTemplatesService) {}

  @Post()
  async createPage(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Body() dto: CreateAdminTemplatePageDto,
  ) {
    return {
      page: await this.templates.createPage(templateId, dto),
    };
  }

  @Patch(':pageId')
  async updatePage(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Param('pageId', new ParseUUIDPipe()) pageId: string,
    @Body() dto: UpdateAdminTemplatePageDto,
  ) {
    return {
      page: await this.templates.updatePage(templateId, pageId, dto),
    };
  }

  @Delete(':pageId')
  @HttpCode(200)
  async deletePage(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Param('pageId', new ParseUUIDPipe()) pageId: string,
  ) {
    await this.templates.deletePage(templateId, pageId);
    return { ok: true };
  }
}
