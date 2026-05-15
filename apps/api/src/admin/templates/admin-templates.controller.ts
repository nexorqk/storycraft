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

import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminTemplatesService } from './admin-templates.service';
import { CreateAdminTemplateDto } from './dto/create-admin-template.dto';
import { UpdateAdminTemplateDto } from './dto/update-admin-template.dto';

@Controller('admin/templates')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminTemplatesController {
  constructor(private readonly templates: AdminTemplatesService) {}

  @Get()
  async listTemplates() {
    return { templates: await this.templates.listTemplates() };
  }

  @Get(':templateId')
  async getTemplate(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
  ) {
    return { template: await this.templates.getTemplate(templateId) };
  }

  @Post()
  async createTemplate(@Body() dto: CreateAdminTemplateDto) {
    return { template: await this.templates.createTemplate(dto) };
  }

  @Patch(':templateId')
  async updateTemplate(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
    @Body() dto: UpdateAdminTemplateDto,
  ) {
    return {
      template: await this.templates.updateTemplate(templateId, dto),
    };
  }

  @Delete(':templateId')
  @HttpCode(200)
  async deleteTemplate(
    @Param('templateId', new ParseUUIDPipe()) templateId: string,
  ) {
    await this.templates.deleteTemplate(templateId);
    return { ok: true };
  }
}
