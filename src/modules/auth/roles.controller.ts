import {
  Controller,
  Post,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { CheckPermissions } from '@/common/decorators/check-permissions.decorator';

import * as initialPermissionsJson from './data/initial-permissions.json';

@Controller('roles-setup')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
  ) {}

  /* @Post('seed')
  @CheckPermissions('roles:manage')
  async seed() {
    const initialPermissions = [
      { name: 'Ver Usuarios', slug: 'users:view', module: 'Administración' },
      {
        name: 'Crear Usuarios',
        slug: 'users:create',
        module: 'Administración',
      },
      { name: 'Editar Usuarios', slug: 'users:edit', module: 'Administración' },
      { name: 'Ver Citas', slug: 'appointments:view', module: 'Consultas' },
      { name: 'Crear Citas', slug: 'appointments:create', module: 'Consultas' },
      { name: 'Gestionar Roles', slug: 'roles:manage', module: 'Seguridad' },
    ];

    const savedPermissions: PermissionDocument[] = [];
    for (const p of initialPermissions) {
      const exists = await this.permissionModel.findOne({ slug: p.slug });
      if (!exists) {
        const newP = await this.permissionModel.create(p);
        savedPermissions.push(newP);
      } else {
        savedPermissions.push(exists);
      }
    }

    const rootRole = await this.roleModel.findOneAndUpdate(
      { slug: 'root' },
      {
        name: 'Super Administrador',
        slug: 'root',
        isRoot: true,
        permissions: savedPermissions.map((p) => p._id) as any,
      },
      { upsert: true, new: true },
    );

    return {
      message: 'Semilla ejecutada con éxito',
      permissionsCount: savedPermissions.length,
      rootRole: rootRole.name,
    };
  } */

  /* @Get('permissions')
  @UseGuards(JwtAuthGuard) // Solo usuarios logueados pueden ver la lista
  async getPermissions() {
    return this.permissionModel.find().sort({ module: 1 });
  } */

  // 1. OBTENER PERMISOS: Devuelve todos los permisos agrupados implícitamente por módulo
  @Get('permissions')
  @CheckPermissions('roles:manage') // Solo quien tenga este permiso puede verlos
  async getPermissions() {
    return this.permissionModel.find().sort({ module: 1, name: 1 });
  }

  // 2. CREAR O ACTUALIZAR ROL: Recibe el nombre y el array de IDs de permisos
  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions('roles:manage')
  async createRole(
    @Body() createRoleDto: { name: string; permissions: string[] },
  ) {
    const { name, permissions } = createRoleDto;

    // Generamos un slug limpio a partir del nombre (Ej: "Médico Especialista" -> "medico-especialista")
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Guardamos o actualizamos el rol en MongoDB
    const updatedRole = await this.roleModel.findOneAndUpdate(
      { slug },
      {
        name,
        slug,
        permissions: permissions as any, // Mongoose se encarga de convertirlos a ObjectIds
        isRoot: false, // Por seguridad, ningún rol creado desde la UI puede ser Root
      },
      { upsert: true, new: true },
    );

    return {
      message: 'Rol guardado correctamente',
      role: updatedRole,
    };
  }

  @Post('seed')
  @CheckPermissions('roles:manage')
  async seed() {
    const savedPermissions: PermissionDocument[] = [];

    // 2. MAPEADO: Convertimos el formato agrupado del JSON a la lista plana que usa el código
    // Object.entries nos da el par [nombreDelModulo, arrayDePermisos]
    for (const [moduleName, permissionsArray] of Object.entries(
      initialPermissionsJson,
    )) {
      // Como el import del JSON a veces trae propiedades por defecto, nos aseguramos de que sea un array
      if (Array.isArray(permissionsArray)) {
        for (const p of permissionsArray) {
          // Buscamos si ya existe por el slug
          let permissionDoc = await this.permissionModel.findOne({
            slug: p.slug,
          });

          if (!permissionDoc) {
            // Si no existe, lo creamos inyectándole el nombre del módulo del objeto padre
            permissionDoc = await this.permissionModel.create({
              name: p.name,
              slug: p.slug,
              module: moduleName, // <-- Aquí cae el nombre del módulo dinámicamente
            });
          }

          savedPermissions.push(permissionDoc);
        }
      }
    }

    // 3. Actualizamos el Rol Root con todos los permisos del sistema
    const rootRole = await this.roleModel.findOneAndUpdate(
      { slug: 'root' },
      {
        name: 'Super Administrador',
        slug: 'root',
        isRoot: true,
        permissions: savedPermissions.map((p) => p._id) as any,
      },
      { upsert: true, new: true },
    );

    return {
      message: 'Semilla ejecutada con éxito utilizando el archivo JSON',
      permissionsCount: savedPermissions.length,
      rootRole: rootRole.name,
    };
  }
}
