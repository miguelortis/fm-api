import {
  Controller,
  Post,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { CheckPermissions } from '@/common/decorators/check-permissions.decorator';

import * as initialPermissionsJson from './data/initial-permissions.json';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  // 1. OBTENER PERMISOS AGRUPADOS: Mapea la data plana de la DB al formato exacto de tu Front
  @Get('permissions')
  //@CheckPermissions('roles:manage')
  async getPermissions(): Promise<Record<string, any[]>> {
    console.log(
      'Obteniendo permisos agrupados por módulo para el catálogo del Front',
    );
    const rawPermissions = await this.permissionModel
      .find()
      .sort({ module: 1, type: 1 })
      .exec();

    const groupedCatalog: Record<string, any[]> = {};

    rawPermissions.forEach((p) => {
      if (!groupedCatalog[p.module]) {
        groupedCatalog[p.module] = [];
      }
      groupedCatalog[p.module].push({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        description: p.description || '',
      });
    });

    return groupedCatalog;
  }

  // 2. CREAR O ACTUALIZAR ROL
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions('roles:manage')
  async createRole(
    @Body() createRoleDto: { name: string; permissions: string[] },
  ) {
    const { name, permissions } = createRoleDto;

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const updatedRole = await this.roleModel.findOneAndUpdate(
      { slug },
      {
        name,
        slug,
        permissions: permissions as any,
        isRoot: false,
      },
      { upsert: true, returnDocument: 'after' },
    );

    return {
      message: 'Rol guardado correctamente',
      role: updatedRole,
    };
  }

  // 3. LISTAR TODOS LOS ROLES (Excluyendo eliminados)
  @Get()
  //@CheckPermissions('roles:manage')
  async getRoles() {
    return this.roleModel
      .find({ deleted: { $ne: true } })
      .populate('permissions')
      .exec();
  }

  // 4. ACTUALIZAR ROL POR ID
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions('roles:manage')
  async updateRole(
    @Body() updateRoleDto: { name: string; permissions: string[] },
    @Param('id') id: string,
  ) {
    const { name, permissions } = updateRoleDto;

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const updatedRole = await this.roleModel.findByIdAndUpdate(
      id,
      {
        name,
        slug,
        permissions: permissions as any,
      },
      { returnDocument: 'after' },
    );

    return {
      message: 'Rol actualizado correctamente',
      role: updatedRole,
    };
  }

  // 5. ELIMINACIÓN LÓGICA DE ROL
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions('roles:manage')
  async deleteRole(@Param('id') id: string): Promise<void> {
    await this.roleModel.findByIdAndUpdate(id, { deleted: true });
    return;
  }

  // 6. SEED AUTOMATIZADO CON LOS NUEVOS CAMPOS (type y description)
  @Post('seed')
  //@CheckPermissions('roles:manage')
  async seed() {
    const savedPermissions: PermissionDocument[] = [];

    for (const [moduleName, permissionsArray] of Object.entries(
      initialPermissionsJson,
    )) {
      if (Array.isArray(permissionsArray)) {
        for (const p of permissionsArray) {
          // Buscamos si ya existe por el slug único
          let permissionDoc = await this.permissionModel.findOne({
            slug: p.slug,
          });

          if (!permissionDoc) {
            // 🌟 Inyectamos el módulo (Key), el tipo ('screen' | 'action') y la descripción real
            permissionDoc = await this.permissionModel.create({
              name: p.name,
              slug: p.slug,
              module: moduleName,
              type: p.type,
              description: p.description || '',
            });
          } else {
            // Si ya existe, aprovechamos el seed para sincronizar cambios en el type o descripción sin tumbar Atlas
            permissionDoc = await this.permissionModel.findByIdAndUpdate(
              permissionDoc._id,
              {
                name: p.name,
                module: moduleName,
                type: p.type,
                description: p.description || '',
              },
              { returnDocument: 'after' },
            );
          }

          if (permissionDoc) {
            savedPermissions.push(permissionDoc);
          }
        }
      }
    }

    // Aseguramos que el rol Root reciba la herencia total de los nuevos ObjectIds
    const rootRole = await this.roleModel.findOneAndUpdate(
      { slug: 'root' },
      {
        name: 'Super Administrador',
        slug: 'root',
        isRoot: true,
        permissions: savedPermissions.map((p) => p._id) as any,
      },
      { upsert: true, returnDocument: 'after' },
    );

    return {
      message: 'Semilla ejecutada con éxito mapeando tipos y descripciones',
      permissionsCount: savedPermissions.length,
      rootRole: rootRole.name,
    };
  }
}
