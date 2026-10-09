import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthRequest } from './jwt-payload.js';
import { nullable, optionalString } from '../common/utils/validation.js';

const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function optionalEmail(value: unknown) {
  const email = optionalString(value, 'Email', 100);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Please enter a valid email.');
  return email?.toLowerCase();
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/login
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!username || !password) {
      throw new BadRequestException('Username and password are required.');
    }
    return this.authService.login(username, password);
  }

  // GET /api/auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthRequest) {
    return this.authService.me(req.user.sub);
  }

  // PATCH /api/auth/me — sariling personal details lang, walang role o login
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Body() body: UpdateProfileDto, @Req() req: AuthRequest) {
    return this.authService.updateProfile(req.user.sub, {
      firstName: optionalString(body?.firstName, 'First name', 50),
      middleName: nullable(body?.middleName, (v) => optionalString(v, 'Middle name', 50)),
      lastName: optionalString(body?.lastName, 'Last name', 50),
      contactNo: nullable(body?.contactNo, (v) => optionalString(v, 'Contact number', 20)),
      email: nullable(body?.email, optionalEmail),
    });
  }

  // POST /api/auth/me/photo — sariling profile picture
  @Post('me/photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: 'uploads/profile-photos',
        filename: (req, file, callback) => {
          const userId = (req as AuthRequest).user.sub;
          callback(null, `${userId}-${Date.now()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: PHOTO_MAX_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!PHOTO_EXTS.has(extname(file.originalname).toLowerCase())) {
          callback(new BadRequestException('Photo must be JPG, PNG or WEBP.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadPhoto(@UploadedFile() file: Express.Multer.File, @Req() req: AuthRequest) {
    if (!file) throw new BadRequestException('Please choose a photo.');
    return this.authService.updatePhoto(req.user.sub, `/uploads/profile-photos/${file.filename}`);
  }
}
