import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
  async signup(dto: AuthDto) {
    // generate password hash
    const hash = await argon.hash(dto.password);
    // save the new user in the db
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hashedPassword: hash,
        },
      });
      delete user.hashedPassword;
      // return saved user
      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }

  async signin(dto: AuthDto) {
    // find user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    // if user doesnt exist throw exception
    if (!user) {
      throw new ForbiddenException(
        'Crendentials incorrect',
      );
    }
    // compare password
    const pwMatches = await argon.verify(
      user.hashedPassword,
      dto.password,
    );

    // if password incorrect throw exception
    if (!pwMatches) {
      throw new ForbiddenException(
        'Crendentials incorrect',
      );
    }

    //send back the user
    delete user.hashedPassword;
    return user;
  }
}
