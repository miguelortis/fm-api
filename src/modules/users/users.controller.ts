import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('profile')
  async updateProfile(
    @Req() req: Request & { user?: { _id: string } },
    @Body() updateData: UpdateProfileDto,
  ) {
    const userId = req.user?._id;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return await this.usersService.updateProfile(userId, updateData);
  }

  @Get('me')
  async getProfile(@Req() req: Request & { user?: { _id: string } }) {
    const userId = req.user?._id;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return await this.usersService.getProfile(userId);
  }

  @Delete(':userId')
  async delete(@Param('userId') userId: string) {
    return await this.usersService.deleteUser(userId);
  }

  @Put('processing-status/:userId')
  async updateStatusToProcessing(@Param('userId') userId: string) {
    return await this.usersService.updateStatusUser(userId, 'processing');
  }
}
